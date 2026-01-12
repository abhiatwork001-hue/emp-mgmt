"use server";

import { triggerNotification } from "@/lib/actions/notification.actions";
import { pusherServer } from "@/lib/pusher";
import {
    VacationRequest,
    VacationRecord,
    Employee,
    Store,
    StoreDepartment,
    IVacationRequest,
    IVacationRecord,
    RequestStatus
} from "@/lib/models";
import connectToDB from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logAction } from "./log.actions";
import { calculateWorkingDays } from "@/lib/holidays";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

const dbConnect = connectToDB;

export async function updateVacationTracker(
    employeeId: string,
    data: { defaultDays?: number; rolloverDays?: number; usedDays?: number }
) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!user) redirect("/login");

    // Role Check
    const isPrivileged = user.roles?.some((r: string) =>
        ['owner', 'hr', 'tech', 'admin', 'super_user'].includes(r.toLowerCase())
    );

    if (!isPrivileged) {
        const locale = await getLocale();
        redirect(`/${locale}/access-denied`);
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) throw new Error("Employee not found");

    if (!employee.vacationTracker) {
        employee.vacationTracker = { defaultDays: 22, rolloverDays: 0, usedDays: 0, year: new Date().getFullYear() };
    }

    if (data.defaultDays !== undefined) employee.vacationTracker.defaultDays = data.defaultDays;
    if (data.rolloverDays !== undefined) employee.vacationTracker.rolloverDays = data.rolloverDays;
    if (data.usedDays !== undefined) employee.vacationTracker.usedDays = data.usedDays;

    await employee.save();

    await logAction({
        action: 'CORRECT_VACATION_BALANCE',
        performedBy: user.id,
        targetId: employeeId,
        targetModel: 'Employee',
        details: {
            previous: employee.vacationTracker,
            updated: data,
            role: user.roles?.[0] || 'unknown'
        }
    });

    revalidatePath("/dashboard/profile");
    revalidatePath(`/dashboard/employees/${employee.slug}`);
    return JSON.parse(JSON.stringify(employee.vacationTracker));
}

type VacationRequestData = {
    employeeId: string;
    requestedFrom: Date;
    requestedTo: Date;
    comments?: string;
    totalDays?: number;
    bypassValidation?: boolean;
}

export async function getVacationBlockedDates(employeeId: string, currentRequestId?: string) {
    await dbConnect();

    const employee = await Employee.findById(employeeId).select("storeId storeDepartmentId roles");
    if (!employee) return [];

    const isManager = employee.roles?.some((r: string) => ["store_manager", "manager"].includes(r.toLowerCase()));
    const isHead = employee.roles?.some((r: string) => ["store_department_head", "department_head"].includes(r.toLowerCase()));

    // Rule 1: Anyone in the same department
    let blockerEmployeeIds: any[] = [];

    if (employee.storeDepartmentId) {
        const deptEmployees = await Employee.find({
            storeDepartmentId: employee.storeDepartmentId,
            _id: { $ne: employee._id }
        }).select("_id");
        blockerEmployeeIds = deptEmployees.map(e => e._id);
    }

    // Rule 2: Managers (if applicable)
    if (isManager && employee.storeId) {
        const store = await Store.findById(employee.storeId).select("managers subManagers");
        if (store) {
            const otherManagers = [...(store.managers || []), ...(store.subManagers || [])].filter(id => id.toString() !== employeeId);
            blockerEmployeeIds = [...new Set([...blockerEmployeeIds, ...otherManagers])];
        }
    }

    // Rule 3: Heads (if applicable)
    if (isHead && employee.storeDepartmentId) {
        const dept = await StoreDepartment.findById(employee.storeDepartmentId).select("headOfDepartment subHead");
        if (dept) {
            const otherHeads = [...(dept.headOfDepartment || []), ...(dept.subHead || [])].filter(id => id.toString() !== employeeId);
            blockerEmployeeIds = [...new Set([...blockerEmployeeIds, ...otherHeads])];
        }
    }

    if (blockerEmployeeIds.length === 0) return [];

    // Fetch all approved/pending vacations for blockers
    const query: any = {
        employeeId: { $in: blockerEmployeeIds },
        status: { $in: ["approved", "pending"] }
    };

    if (currentRequestId) {
        query._id = { $ne: currentRequestId };
    }

    const requests = await VacationRequest.find(query).select("requestedFrom requestedTo").lean();

    // Map to simple date range objects
    const blockedRanges = requests.map(r => ({
        from: r.requestedFrom,
        to: r.requestedTo
    }));

    return JSON.parse(JSON.stringify(blockedRanges));
}

export async function createVacationRequest(data: VacationRequestData) {
    await dbConnect();

    // ... validation and creation logic ...
    const { bypassValidation, ...requestData } = data;

    // Server-side Validation
    if (!data.requestedFrom || !data.requestedTo || !data.employeeId) {
        throw new Error("Missing required fields");
    }

    // Check permissions if bypassing validation (recording for others)
    if (bypassValidation) {
        const session = await getServerSession(authOptions);
        if (!session?.user) redirect("/login");
        const user = await Employee.findById((session.user as any).id).select("roles");
        const roles = (user?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));

        // STRICT: Store Manager CANNOT bypass validation (record for others)
        // Only HR, Admin, Owner, Tech
        const allowed = roles.some((r: string) => ["admin", "hr", "owner", "tech", "super_user"].includes(r));
        if (!allowed) {
            const locale = await getLocale();
            redirect(`/${locale}/access-denied`);
        }
    }

    const start = new Date(data.requestedFrom);
    const end = new Date(data.requestedTo);

    // Normalize dates to start of day to avoid time-of-day math errors
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const calculatedDays = calculateWorkingDays(start, end);
    let finalTotalDays = calculatedDays;

    if (!bypassValidation) {
        // ... validation logic ...
        // 1. 15 days notice
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const minStartDate = new Date(today);
        minStartDate.setDate(today.getDate() + 15);
        if (start < minStartDate) throw new Error("Vacation requests must be submitted at least 15 days in advance.");

        // 2. Working days
        if (finalTotalDays === 0) throw new Error("No working days in selected range.");

        // 3. Balance
        const employee = await Employee.findById(data.employeeId);
        if (!employee) throw new Error("Employee not found");
        const tracker = employee.vacationTracker || { defaultDays: 22, rolloverDays: 0, usedDays: 0, pendingRequests: 0 };
        const remaining = (tracker.defaultDays || 0) + (tracker.rolloverDays || 0) - (tracker.usedDays || 0);
        const effectiveRemaining = remaining - (tracker.pendingRequests || 0);
        if (finalTotalDays > effectiveRemaining) throw new Error(`Insufficient vacation days. Requested: ${finalTotalDays}, Available: ${effectiveRemaining}`);

        // 4. Capacity & Role Conflicts (FIFO)
        const blockedRanges = await getVacationBlockedDates(data.employeeId);
        const hasConflict = blockedRanges.some((range: any) => {
            const rangeFrom = new Date(range.from);
            const rangeTo = new Date(range.to);
            // Check if any date in [start, end] overlaps with [rangeFrom, rangeTo]
            return (start <= rangeTo && end >= rangeFrom);
        });

        if (hasConflict) {
            throw new Error("The selected dates are currently unavailable due to department capacity or role conflicts.");
        }
    }

    // Proactive Schedule Check (Alert HR if already scheduled)
    const warnings: string[] = [];
    try {
        const { Schedule } = require("@/lib/models");
        const overlappingSchedules = await Schedule.find({
            "dateRange.startDate": { $lte: end },
            "dateRange.endDate": { $gte: start },
            "days.shifts.employees": data.employeeId
        }).select("slug dateRange");

        if (overlappingSchedules.length > 0) {
            warnings.push(`Employee is already assigned to shifts in ${overlappingSchedules.length} schedule(s) during this period.`);
        }
    } catch (err) {
        console.error("Schedule check error:", err);
    }

    try {
        const newRequest = await VacationRequest.create({
            ...requestData,
            totalDays: finalTotalDays,
            status: bypassValidation ? 'approved' : 'pending',
            reviewedBy: bypassValidation ? data.employeeId : undefined,
            reviewedAt: bypassValidation ? new Date() : undefined,
            storeDepartmentWarnings: warnings,
            createdAt: new Date()
        });

        const session = await getServerSession(authOptions);
        const actorId = (session?.user as any)?.id || data.employeeId;

        await logAction({
            action: 'REQUEST_VACATION',
            performedBy: actorId,
            targetId: newRequest._id,
            targetModel: 'VacationRequest',
            details: { totalDays: finalTotalDays, from: start, to: end }
        });

        if (bypassValidation) {
            await Employee.findByIdAndUpdate(data.employeeId, {
                $inc: { "vacationTracker.usedDays": finalTotalDays }
            });
            await VacationRecord.create({
                employeeId: data.employeeId,
                from: start,
                to: end,
                totalDays: finalTotalDays,
                year: start.getFullYear(),
                approvedBy: undefined
            });
        } else {
            await Employee.findByIdAndUpdate(data.employeeId, {
                $inc: { "vacationTracker.pendingRequests": finalTotalDays }
            });

            // Notification: Notify HR & Owners
            try {
                const hrAndOwners = await Employee.find({
                    roles: { $in: ['HR', 'Owner', 'hr', 'owner', 'Admin', 'admin'] }, // Case insensitive check usually needs regex or normalized field
                    active: true
                }).select('_id');

                // Better to use a normalized role check if roles are inconsistent case
                // Assuming standard "HR", "Owner" from model. 

                const recipients = hrAndOwners.map((e: any) => e._id.toString());
                const requestor = await Employee.findById(data.employeeId).select("firstName lastName");
                const requestorName = requestor ? `${requestor.firstName} ${requestor.lastName}` : "Employee";

                if (recipients.length > 0) {
                    let message = `${requestorName} requested vacation from ${start.toLocaleDateString()} to ${end.toLocaleDateString()} (${finalTotalDays} days).`;
                    if (warnings.length > 0) {
                        message += ` ALERT: ${warnings[0]}`;
                    }

                    await triggerNotification({
                        title: "New Vacation Request",
                        message: message,
                        type: warnings.length > 0 ? "warning" : "info",
                        category: "vacation",
                        recipients: recipients,
                        link: "/dashboard/vacations",
                        metadata: { requestId: newRequest._id }
                    });
                }
            } catch (notifErr) {
                console.error("Vacation Request Notification Error:", notifErr);
            }
        }

        const emp = await Employee.findById(data.employeeId).select("slug");
        revalidatePath("/dashboard/vacations");
        revalidatePath(`/dashboard/employees/${emp?.slug || data.employeeId}`);
        revalidatePath("/dashboard/employees");
        revalidatePath("/dashboard");
        return JSON.parse(JSON.stringify(newRequest));
    } catch (e) {
        console.error("createVacationRequest Error:", e);
        throw e;
    }
}

export async function getAllVacationRequests(filters: any = {}) {
    await dbConnect();
    const query: any = {};

    if (filters.status) query.status = filters.status;
    if (filters.employeeId) query.employeeId = filters.employeeId;
    if (filters.year) {
        const startOfYear = new Date(filters.year, 0, 1);
        const endOfYear = new Date(filters.year, 11, 31, 23, 59, 59);
        query.requestedFrom = { $gte: startOfYear, $lte: endOfYear };
    }

    // Filter by Store ID (for Managers)
    if (filters.storeId) {
        // If we also have storeDepartmentId, we should prioritize that intersect or just use it?
        // Usually Dept is subset of Store.
        // Let's filter by BOTH if provided to be safe/strict.
        const storeQuery: any = { storeId: filters.storeId };
        if (filters.storeDepartmentId) {
            storeQuery.storeDepartmentId = filters.storeDepartmentId;
        }

        const employeesInStore = await Employee.find(storeQuery).select("_id");
        const empIds = employeesInStore.map(e => e._id);

        if (query.employeeId) {
            // Intersect existing employeeId filter
            const existing = Array.isArray(query.employeeId.$in) ? query.employeeId.$in : [query.employeeId];
            query.employeeId = {
                $in: empIds.filter((id: any) => existing.some((ex: any) => ex.toString() === id.toString()))
            };
        } else {
            query.employeeId = { $in: empIds };
        }
    } else if (filters.storeDepartmentId) {
        // Only Dept ID provided
        const employeesInDept = await Employee.find({ storeDepartmentId: filters.storeDepartmentId }).select("_id");
        const empIds = employeesInDept.map(e => e._id);
        if (query.employeeId) {
            // Intersect
            const existing = Array.isArray(query.employeeId.$in) ? query.employeeId.$in : [query.employeeId];
            query.employeeId = {
                $in: empIds.filter((id: any) => existing.some((ex: any) => ex.toString() === id.toString()))
            };
        } else {
            query.employeeId = { $in: empIds };
        }
    }

    const requests = await VacationRequest.find(query)
        .populate({
            path: "employeeId",
            select: "firstName lastName image email storeId storeDepartmentId position",
            populate: [
                { path: "storeId", select: "name" },
                { path: "storeDepartmentId", select: "name globalDepartmentId" }
            ]
        })
        .populate("reviewedBy", "firstName lastName")
        .sort({ createdAt: -1 })
        .lean();

    return JSON.parse(JSON.stringify(requests));
}

// Helper for strict approval permissions
async function checkApprovalPermission(userId: string) {
    const user = await Employee.findById(userId).select("roles");
    const roles = (user?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
    const allowed = roles.some((r: string) => ['hr', 'owner', 'admin', 'tech'].includes(r));
    if (!allowed) {
        const locale = await getLocale();
        redirect(`/${locale}/access-denied`);
    }
}

export async function approveVacationRequest(requestId: string, approverId: string) {
    await dbConnect();
    await checkApprovalPermission(approverId);

    const request = await VacationRequest.findById(requestId);
    if (!request) throw new Error("Request not found");
    if (request.status !== 'pending') throw new Error("Request is not pending");

    const start = new Date(request.requestedFrom);
    const end = new Date(request.requestedTo);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const finalDays = calculateWorkingDays(start, end);

    // 1. Create Vacation Record
    const record = await VacationRecord.create({
        employeeId: request.employeeId,
        from: start,
        to: end,
        totalDays: finalDays,
        year: start.getFullYear(),
        approvedBy: approverId
    });

    // 2. Update Employee Tracker & Add to Vacations list
    await Employee.findByIdAndUpdate(request.employeeId, {
        $inc: {
            "vacationTracker.pendingRequests": -request.totalDays, // Use original requested days for decrement
            "vacationTracker.usedDays": finalDays // Use recalculated standardized days for balance
        },
        $push: { vacations: record._id }
    });

    // 3. Update Request Status
    request.status = 'approved';
    request.reviewedBy = approverId as any;
    request.reviewedAt = new Date();
    await request.save();

    // Trigger Real-time Update for Approvers/Admin Dashboard
    await pusherServer.trigger(`admin-updates`, "vacation:updated", {
        requestId: request._id,
        status: 'approved',
        employeeId: request.employeeId
    });

    // Trigger Real-time Update for Employee
    await pusherServer.trigger(`user-${request.employeeId}`, "vacation:approved", {
        requestId: request._id
    });

    await logAction({
        action: 'APPROVE_VACATION',
        performedBy: approverId,
        targetId: request._id,
        targetModel: 'VacationRequest',
        details: { employeeId: request.employeeId }
    });

    // Notification: Notify Employee
    try {
        await triggerNotification({
            title: "Vacation Approved",
            message: `Your vacation request for ${new Date(request.requestedFrom).toLocaleDateString()} - ${new Date(request.requestedTo).toLocaleDateString()} has been approved.`,
            type: "success",
            category: "vacation",
            recipients: [request.employeeId.toString()],
            link: "/dashboard/profile?tab=work",
            metadata: { requestId: request._id }
        });
    } catch (e) { console.error("Vacation Approve Notification Error:", e); }

    // 4. Automatic Schedule Cleanup (Remove from shifts)
    const { removeEmployeeFromSchedulesInRange } = require("./schedule.actions");
    await removeEmployeeFromSchedulesInRange(request.employeeId, start, end);

    const emp = await Employee.findById(request.employeeId).select("slug storeId");

    // Trigger Real-time Update for affected store schedules
    if (emp?.storeId) {
        await pusherServer.trigger(`store-${emp.storeId}`, "schedule:updated", {
            status: 'vacation_approved',
            employeeId: request.employeeId
        });
    }

    revalidatePath("/dashboard/vacations");
    revalidatePath(`/dashboard/employees/${emp?.slug || request.employeeId}`);
    revalidatePath("/dashboard/schedules");
    revalidatePath("/[locale]/dashboard/schedules/[slug]", "page");
    revalidatePath("/dashboard");
    const populatedRequest = await VacationRequest.findById(request._id)
        .populate({
            path: "employeeId",
            select: "firstName lastName image email storeId storeDepartmentId position",
            populate: [
                { path: "storeId", select: "name" },
                { path: "storeDepartmentId", select: "name" }
            ]
        })
        .populate("reviewedBy", "firstName lastName")
        .lean();

    return JSON.parse(JSON.stringify(populatedRequest));
}

export async function rejectVacationRequest(requestId: string, reviewerId: string, reason?: string) {
    await dbConnect();
    await checkApprovalPermission(reviewerId);

    const request = await VacationRequest.findById(requestId);
    if (!request) throw new Error("Request not found");

    if (request.status === 'pending') {
        await Employee.findByIdAndUpdate(request.employeeId, {
            $inc: { "vacationTracker.pendingRequests": -request.totalDays }
        });
    }

    await request.save();

    // Trigger Real-time Update for Approvers/Admin Dashboard
    await pusherServer.trigger(`admin-updates`, "vacation:updated", {
        requestId: request._id,
        status: 'rejected',
        employeeId: request.employeeId
    });

    await logAction({
        action: 'REJECT_VACATION',
        performedBy: reviewerId,
        targetId: request._id,
        targetModel: 'VacationRequest',
        details: { employeeId: request.employeeId, reason }
    });

    // Notification: Notify Employee
    try {
        await triggerNotification({
            title: "Vacation Rejected",
            message: `Your vacation request from ${new Date(request.requestedFrom).toLocaleDateString()} has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
            type: "error",
            category: "vacation",
            recipients: [request.employeeId.toString()],
            link: "/dashboard/profile?tab=work",
            metadata: { requestId: request._id }
        });
    } catch (e) { console.error("Vacation Reject Notification Error:", e); }

    // Trigger Real-time Update for Employee
    await pusherServer.trigger(`user-${request.employeeId}`, "vacation:rejected", {
        requestId: request._id
    });

    const emp = await Employee.findById(request.employeeId).select("slug");
    revalidatePath("/dashboard/vacations");
    revalidatePath(`/dashboard/employees/${emp?.slug || request.employeeId}`);
    const populatedRequest = await VacationRequest.findById(request._id)
        .populate({
            path: "employeeId",
            select: "firstName lastName image email storeId storeDepartmentId position",
            populate: [
                { path: "storeId", select: "name" },
                { path: "storeDepartmentId", select: "name" }
            ]
        })
        .populate("reviewedBy", "firstName lastName")
        .lean();

    return JSON.parse(JSON.stringify(populatedRequest));
}

export async function cancelVacationRecord(recordId: string, actorId: string) {
    await dbConnect();
    await checkApprovalPermission(actorId);

    const record = await VacationRecord.findById(recordId);
    if (!record) throw new Error("Record not found");

    const employeeId = record.employeeId;
    const totalDays = record.totalDays;

    // 1. Revert Employee Tracker & Remove from vacations list
    await Employee.findByIdAndUpdate(employeeId, {
        $inc: { "vacationTracker.usedDays": -totalDays },
        $pull: { vacations: recordId }
    });

    // 2. Find and update potential matching request to 'cancelled'
    // This is a heuristic search as there's no direct ID link
    try {
        await VacationRequest.findOneAndUpdate(
            {
                employeeId,
                requestedFrom: record.from,
                requestedTo: record.to,
                status: 'approved'
            },
            { status: 'cancelled' }
        );
    } catch (e) {
        console.error("Could not find matching request to cancel:", e);
    }

    // 3. Log Action
    await logAction({
        action: 'CANCEL_VACATION',
        performedBy: actorId,
        targetId: recordId,
        targetModel: 'VacationRecord',
        details: { employeeId, totalDays }
    });

    // 4. Delete Record
    await VacationRecord.findByIdAndDelete(recordId);

    revalidatePath("/dashboard/vacations");
    const emp = await Employee.findById(employeeId).select("slug");
    revalidatePath(`/dashboard/employees/${emp?.slug || employeeId}`);
    revalidatePath("/dashboard");

    return { success: true };
}

// --- Records (if needed independently) ---
export async function getVacationRecords(employeeId: string) {
    await dbConnect();
    const records = await VacationRecord.find({ employeeId }).sort({ from: -1 }).lean();
    return JSON.parse(JSON.stringify(records));
}
export async function getPendingVacationRequests() {
    await dbConnect();
    const requests = await VacationRequest.find({ status: 'pending' })
        .populate({
            path: 'employeeId',
            select: 'firstName lastName storeId',
            populate: { path: 'storeId', select: 'name' }
        })
        .sort({ createdAt: 1 })
        .lean();
    return JSON.parse(JSON.stringify(requests));
}

export async function updateVacationRequest(requestId: string, employeeId: string, data: Partial<VacationRequestData>) {
    await dbConnect();
    const request = await VacationRequest.findById(requestId);
    if (!request) throw new Error("Request not found");
    if (request.employeeId.toString() !== employeeId) {
        const locale = await getLocale();
        redirect(`/${locale}/access-denied`);
    }
    if (request.status !== 'pending') throw new Error("Only pending requests can be updated");

    const start = data.requestedFrom ? new Date(data.requestedFrom) : new Date(request.requestedFrom);
    const end = data.requestedTo ? new Date(data.requestedTo) : new Date(request.requestedTo);

    // Normalize
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const totalDays = calculateWorkingDays(start, end);

    const updated = await VacationRequest.findByIdAndUpdate(requestId, {
        ...data,
        requestedFrom: start,
        requestedTo: end,
        totalDays: data.totalDays || totalDays
    }, { new: true });

    revalidatePath("/dashboard/vacations");
    revalidatePath("/dashboard/pending-actions");
    return JSON.parse(JSON.stringify(updated));
}

export async function cancelVacationRequest(requestId: string, employeeId: string) {
    await dbConnect();
    const request = await VacationRequest.findById(requestId);
    if (!request) throw new Error("Request not found");
    if (request.employeeId.toString() !== employeeId) {
        const locale = await getLocale();
        redirect(`/${locale}/access-denied`);
    }
    if (request.status !== 'pending') throw new Error("Only pending requests can be cancelled");

    await VacationRequest.findByIdAndDelete(requestId);

    revalidatePath("/dashboard/vacations");
    revalidatePath("/dashboard/pending-actions");
    return { success: true };
}
// --- Analytics & Risks ---

export async function getVacationAnalytics(year: number = new Date().getFullYear()) {
    try {
        await dbConnect();

        // Fetch all active employees
        const employees = await Employee.find({ active: true }).select('vacationTracker');

        let totalOwed = 0;
        let totalTaken = 0;

        employees.forEach(emp => {
            const tracker = emp.vacationTracker || { defaultDays: 22, rolloverDays: 0, usedDays: 0 };
            totalOwed += (tracker.defaultDays || 0) + (tracker.rolloverDays || 0);
            totalTaken += (tracker.usedDays || 0);
        });

        const totalRemaining = totalOwed - totalTaken;

        // Previous year stats (from records)
        const lastYear = year - 1;
        const lastYearRecords = await VacationRecord.find({ year: lastYear });
        const lastYearTaken = lastYearRecords.reduce((sum, rec) => sum + rec.totalDays, 0);

        return {
            current: {
                year,
                owed: totalOwed,
                taken: totalTaken,
                remaining: totalRemaining
            },
            previous: {
                year: lastYear,
                taken: lastYearTaken
            }
        };
    } catch (error) {
        console.error("Error fetching vacation stats:", error);
        return null;
    }
}

export async function checkUpcomingVacationRisks() {
    try {
        await dbConnect();
        const { StoreDepartment, Schedule } = require("@/lib/models");

        const depts = await StoreDepartment.find({ active: true, minEmployees: { $gt: 0 } }).populate('storeId', 'name');
        const risks: any[] = [];

        const next30Days: Date[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            next30Days.push(d);
        }

        // Fetch all approved vacations in the next 30 days
        const vacations = await VacationRecord.find({
            to: { $gte: today },
            from: { $lte: next30Days[29] }
        }).populate('employeeId', 'storeDepartmentId');

        for (const dept of depts) {
            const deptEmployees = await Employee.find({ storeDepartmentId: dept._id, active: true }).select('_id');
            const totalDeptStaff = deptEmployees.length;

            for (const date of next30Days) {
                const dateStr = date.toISOString().split('T')[0];

                const outCount = vacations.filter(v => {
                    const empDeptId = (v.employeeId as any)?.storeDepartmentId?.toString();
                    if (empDeptId !== dept._id.toString()) return false;

                    const fromStr = v.from.toISOString().split('T')[0];
                    const toStr = v.to.toISOString().split('T')[0];
                    return dateStr >= fromStr && dateStr <= toStr;
                }).length;

                const activeCount = totalDeptStaff - outCount;

                if (activeCount < dept.minEmployees) {
                    // Find active schedule
                    const activeSchedule = await Schedule.findOne({
                        storeDepartmentId: dept._id,
                        status: { $in: ['published', 'draft', 'in_progress'] },
                        "dateRange.startDate": { $lte: date },
                        "dateRange.endDate": { $gte: date }
                    }).select('slug').lean();

                    risks.push({
                        deptId: dept._id.toString(),
                        deptName: dept.name,
                        storeName: dept.storeId?.name || "Unknown Store",
                        date: date,
                        activeCount,
                        minRequired: dept.minEmployees,
                        missing: dept.minEmployees - activeCount,
                        scheduleSlug: activeSchedule?.slug
                    });
                    break; // Just one alert per dept
                }
            }
        }

        return JSON.parse(JSON.stringify(risks));
    } catch (error) {
        console.error("Error checking vacation risks:", error);
        return [];
    }
}
