"use server";

import dbConnect from "@/lib/db";
import {
    ShiftCoverageRequest,
    Employee,
    Schedule,
    AbsenceRecord,
    StoreDepartment,
    GlobalDepartment,
    ExtraHourRequest,
    ShiftDefinition
} from "@/lib/models";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ActionLog, IAbsenceRecord, IVacationRecord, Notification, Store, StoreDepartment as StoreDepartmentModel } from "../models";
import { pusherServer } from "../pusher";
import { triggerNotification } from "./notification.actions";
import { revalidatePath } from "next/cache";
import { logAction } from "./log.actions";
import { format } from "date-fns";

// --- Types ---
interface ReportAbsenceData {
    scheduleId: string;
    dayDate: Date;
    shiftName?: string;
    startTime: string;
    endTime: string;
    storeId: string;
    storeDepartmentId: string;
    reason: string;
    attachments: string[];
}

// 1. Employee Reports Absence
export async function reportAbsenceForCoverage(data: ReportAbsenceData) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) throw new Error("Unauthorized");

    // Check for existing active request for this shift
    const existing = await ShiftCoverageRequest.findOne({
        "originalShift.scheduleId": data.scheduleId,
        "originalShift.dayDate": data.dayDate,
        "originalShift.startTime": data.startTime,
        "originalShift.endTime": data.endTime,
        status: { $ne: "cancelled" }
    });

    if (existing) {
        throw new Error("A coverage request already exists for this shift.");
    }

    // Create Request
    const request = await ShiftCoverageRequest.create({
        originalShift: {
            scheduleId: data.scheduleId,
            dayDate: data.dayDate,
            shiftName: data.shiftName || "Shift",
            startTime: data.startTime,
            endTime: data.endTime,
            storeId: data.storeId,
            storeDepartmentId: data.storeDepartmentId
        },
        originalEmployeeId: userId,
        reason: data.reason,
        attachments: data.attachments,
        status: 'pending_hr'
    });

    // Notify HR/Admins (Global) and Store Admins
    const managers = await Employee.find({
        $or: [
            { roles: { $in: ['admin', 'hr', 'owner', 'tech', 'super_user'] } }, // Global Privileged Roles
            {
                storeId: data.storeId,
                roles: { $in: ['admin', 'hr', 'owner', 'tech'] } // Support legacy store-specific admin if any
            }
        ],
        active: true
    }).select('_id');

    const recipientIds = managers.map(m => m._id.toString());
    const actor = await Employee.findById(userId).select('firstName lastName');
    const actorName = `${actor.firstName} ${actor.lastName}`;

    await triggerNotification({
        title: "Absence Reported - Coverage Needed",
        message: `${actorName} reported absence for ${new Date(data.dayDate).toLocaleDateString()} (${data.startTime}-${data.endTime}).`,
        type: "warning",
        category: "absence",
        recipients: recipientIds,
        link: `/dashboard/coverage/${request._id}`,
        senderId: userId,
        relatedStoreId: data.storeId
    });

    await logAction({
        action: 'REPORT_ABSENCE_COVERAGE',
        performedBy: userId,
        targetId: request._id,
        targetModel: 'ShiftCoverageRequest',
        details: { date: data.dayDate, reason: data.reason }
    });

    revalidatePath('/dashboard/coverage');
    return JSON.parse(JSON.stringify(request));
}

// 2. HR Gets Eligible Candidates
export async function getEligibleEmployeesForCoverage(requestId: string) {
    await dbConnect();

    const request = await ShiftCoverageRequest.findById(requestId);
    if (!request) throw new Error("Request not found");

    const { dayDate, storeDepartmentId, storeId } = request.originalShift;
    const date = new Date(dayDate);

    // 1. Find the parent Global Department
    const storeDept = await StoreDepartment.findById(storeDepartmentId).select('globalDepartmentId');
    let globalDeptId = storeDept?.globalDepartmentId;

    let globalDeptHeads: string[] = [];
    if (globalDeptId) {
        const globalDept = await GlobalDepartment.findById(globalDeptId).select('departmentHead');
        if (globalDept?.departmentHead) {
            globalDeptHeads = globalDept.departmentHead.map((id: any) => id.toString());
        }
    }

    // 2. Find ALL active employees
    const allEmployees = await Employee.find({
        active: true,
        _id: { $ne: request.originalEmployeeId }
    })
        .select('firstName lastName image email contract storeId storeDepartmentId roles')
        .lean();

    // 3. Find who is working ANYWHERE on this day
    const dayStart = new Date(date).setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(date).setUTCHours(23, 59, 59, 999);

    const schedulesOnDay = await Schedule.find({
        "days.date": { $gte: dayStart, $lte: dayEnd }
    }).select("days").lean();

    const workingEmployeeIds = new Set<string>();
    schedulesOnDay.forEach((s: any) => {
        const day = s.days.find((d: any) => new Date(d.date).setUTCHours(0, 0, 0, 0) === dayStart);
        if (day) {
            day.shifts.forEach((sh: any) => {
                sh.employees.forEach((e: any) => workingEmployeeIds.add(e.toString()));
            });
        }
    });

    // 4. Categorize available employees
    const available = allEmployees.filter(emp => !workingEmployeeIds.has(emp._id.toString()));

    // Enhance with flags
    const results = available.map((emp: any) => {
        const isGlobalHead = globalDeptHeads.includes(emp._id.toString());
        const isSameStore = emp.storeId?.toString() === storeId?.toString();
        const isSameDept = emp.storeDepartmentId?.toString() === storeDepartmentId?.toString();

        let priority = 3; // Default
        if (isGlobalHead) priority = 1;
        else if (isSameDept) priority = 2;

        return {
            ...emp,
            isGlobalHead,
            isSameStore,
            isSameDept,
            priority
        };
    });

    // Sort by priority
    results.sort((a, b) => a.priority - b.priority);

    return JSON.parse(JSON.stringify(results));
}

// 9. Get Ongoing actions for employee (unified)
export async function getActiveOngoingActions(employeeId: string) {
    await dbConnect();

    // Using loose imports since models might be already registered
    const vacations = await AbsenceRecord.find({
        employeeId,
        type: 'vacation',
        status: 'pending'
    }).lean();

    const absences = await AbsenceRecord.find({
        employeeId,
        type: 'absence',
        status: 'pending'
    }).lean();

    const coverageRequests = await ShiftCoverageRequest.find({
        originalEmployeeId: employeeId,
        status: { $in: ['pending_hr', 'seeking_coverage'] }
    }).populate('originalShift').lean();

    const employee = await Employee.findById(employeeId).select('roles');
    const PRIVILEGED_ROLES = ["admin", "hr", "owner", "tech", "super_user"];
    const isPrivileged = employee?.roles?.some((r: string) =>
        PRIVILEGED_ROLES.includes(r.toLowerCase().replace(/ /g, "_"))
    );

    const coverageOffersQuery: any = {
        status: 'seeking_coverage',
        acceptedBy: { $exists: false }
    };

    if (!isPrivileged) {
        coverageOffersQuery.candidates = employeeId;
    }

    const coverageOffers = await ShiftCoverageRequest.find(coverageOffersQuery)
        .populate('originalShift')
        .lean();

    return {
        vacations: JSON.parse(JSON.stringify(vacations)),
        absences: JSON.parse(JSON.stringify(absences)),
        coverageRequests: JSON.parse(JSON.stringify(coverageRequests)),
        coverageOffers: JSON.parse(JSON.stringify(coverageOffers))
    };
}

// 3. HR Invites Candidates
export async function inviteCandidatesForCoverage(requestId: string, employeeIds: string[], customMessage?: string) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    const request = await ShiftCoverageRequest.findByIdAndUpdate(requestId, {
        candidates: employeeIds,
        status: 'seeking_coverage',
        offerSentAt: new Date()
    }, { new: true });

    // Send Notifications
    const formattedDate = format(new Date(request.originalShift.dayDate), 'PPP');
    const defaultMessage = `A shift is available on ${formattedDate} (${request.originalShift.startTime}-${request.originalShift.endTime}). Click to accept.`;

    await triggerNotification({
        title: "Shift Coverage Opportunity",
        message: customMessage || defaultMessage,
        type: "info",
        category: "schedule",
        recipients: employeeIds,
        link: `/dashboard/coverage` // They should see it in dashboard widget? Or a dedicated offers page.
        // Let's direct them to their schedule tab or home where we show alerts.
        // We'll add a 'link' to a specific accept action or view.
    });

    await logAction({
        action: 'INVITE_COVERAGE',
        performedBy: userId,
        targetId: requestId,
        targetModel: 'ShiftCoverageRequest',
        details: { candidateCount: employeeIds.length }
    });

    revalidatePath(`/dashboard/coverage/${requestId}`);
}

// 4. Employee Accepts Offer
export async function acceptCoverageOffer(requestId: string, employeeId: string) {
    await dbConnect();

    // Atomic check: ensure status is still seeking
    const request = await ShiftCoverageRequest.findOne({ _id: requestId, status: 'seeking_coverage' });
    if (!request) throw new Error("This offer is no longer available.");

    // Check if user was invited OR has privileged role
    const accepterEmployee = await Employee.findById(employeeId).select('roles');
    const PRIVILEGED_ROLES = ["admin", "hr", "owner", "tech", "super_user"];
    const isAccepterPrivileged = accepterEmployee?.roles?.some((r: string) =>
        PRIVILEGED_ROLES.includes(r.toLowerCase().replace(/ /g, "_"))
    );

    if (!isAccepterPrivileged && !request.candidates.map((id: any) => id.toString()).includes(employeeId)) {
        throw new Error("You were not invited to cover this shift.");
    }

    // Set Accepted
    // Note: We don't change status to 'covered' yet? 
    // User said: "other employee ... accepts the request ... and ask again to hr if it is to mark as extra or add to vacation day."
    // So acceptance moves it to a "Pending HR Finalization" state? 
    // Let's keep status 'seeking_coverage' but mark 'acceptedBy'. 
    // Or better, move to 'pending_finalization' or similar?
    // The schema has 'covered'. I'll add 'pending_approval' or just use 'seeking_coverage' with 'acceptedBy' filled.
    // Actually, user said "if one takes the offer, we need to put a filter there so that if everyone accepts... we cannot put everyone".
    // So "First come first serve" for the acceptance step?
    // Yes.

    request.acceptedBy = employeeId;
    request.acceptedAt = new Date();
    request.status = 'covered'; // Wait, allow HR to confirm?
    // "ask again to hr if it is to mark as extra..."
    // This implies HR intervention AFTER acceptance but BEFORE final schedule update? 
    // Or maybe the schedule update happens, and THEN HR sets payment?
    // "make the same shift but with their name and ask again to hr" -> implies schedule update first?
    // But "ask again to hr" implies a dialog.
    // Let's make it: Employee Accepts -> Status 'pending_approval' -> HR Reviews & Selects Pay -> Status 'covered' & Schedule Updated.
    // I need to update Schema to support 'pending_approval'.
    // For now, since Schema is set, I'll use 'seeking_coverage' + 'acceptedBy' presence to denote "Wait for HR".
    // Or I'll adhere to 'covered' being final.
    // Let's implicitly assume: Employee Accepts -> Request prevents others from accepting -> HR Finalizes.

    // Validating concurrency
    const updated = await ShiftCoverageRequest.findOneAndUpdate(
        { _id: requestId, status: 'seeking_coverage' },
        {
            acceptedBy: employeeId,
            acceptedAt: new Date(),
            status: 'pending_hr' // Reuse pending_hr? Or keep seeking?
            // Reusing pending_hr is confusing with initial state. 
            // I'll trust the "acceptedBy" field.
        },
        { new: true }
    );

    if (updated) {
        await pusherServer.trigger(`admin-updates`, "coverage:accepted", {
            requestId: updated._id,
            acceptedBy: employeeId
        });
    }

    if (!updated) throw new Error("Offer taken by someone else.");

    // Notify HR/Admins
    const managers = await Employee.find({
        $or: [
            { roles: { $in: ['admin', 'hr', 'owner', 'tech', 'super_user'] } },
            {
                storeId: request.originalShift.storeId,
                roles: { $in: ['admin', 'hr', 'owner', 'tech'] }
            }
        ],
        active: true
    }).select('_id');

    const accepter = await Employee.findById(employeeId).select('firstName lastName');

    await triggerNotification({
        title: "Coverage Offer Accepted",
        message: `${accepter.firstName} ${accepter.lastName} accepted the cover. Please finalize compensation.`,
        type: "success",
        category: "schedule",
        recipients: managers.map(m => m._id.toString()),
        link: `/dashboard/coverage/${requestId}`
    });

    revalidatePath('/dashboard');
    return JSON.parse(JSON.stringify(updated));
}

// 5. HR Finalizes
export async function finalizeCoverage(requestId: string, compensationType: 'extra_hour' | 'vacation_day') {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    const request = await ShiftCoverageRequest.findById(requestId);
    if (!request || !request.acceptedBy) throw new Error("Invalid request state.");

    // 1. Update Request
    request.compensationType = compensationType;
    request.status = 'covered';
    await request.save();

    await pusherServer.trigger(`admin-updates`, "coverage:finalized", {
        requestId: request._id,
        status: 'covered'
    });

    // Also notify candidates in real-time that it's closed
    await pusherServer.trigger(`coverage-global`, "coverage:closed", {
        requestId: request._id
    });

    // 2. Schedule Update
    // Remove original, Add new
    const schedule = await Schedule.findById(request.originalShift.scheduleId);
    if (schedule) {
        // Find day and shift
        const dateStr = new Date(request.originalShift.dayDate).toDateString();
        const day = schedule.days.find((d: any) => new Date(d.date).toDateString() === dateStr);
        if (day) {
            const shift = day.shifts.find((s: any) =>
                s.startTime === request.originalShift.startTime &&
                s.endTime === request.originalShift.endTime
            );

            if (shift) {
                // Fetch original employee name for the comment
                const originalEmployee = await Employee.findById(request.originalEmployeeId).select('firstName lastName');
                const absenceNote = `Absent: ${originalEmployee?.firstName || 'Unknown'} ${originalEmployee?.lastName || ''}`;

                // Remove Original (filter out)
                shift.employees = shift.employees.filter((id: any) => id.toString() !== request.originalEmployeeId.toString());
                // Add New
                shift.employees.push(request.acceptedBy);

                // Add comment
                if (shift.notes) {
                    if (!shift.notes.includes(absenceNote)) {
                        shift.notes = `${shift.notes} | ${absenceNote}`;
                    }
                } else {
                    shift.notes = absenceNote;
                }
            }
        }
        await schedule.save();
    }

    // 3. Create Absence Record for Original
    await AbsenceRecord.create({
        employeeId: request.originalEmployeeId,
        date: request.originalShift.dayDate,
        type: 'sick', // Defaulting to sick as per prompt ("they are sick")
        justification: "Justified",
        reason: request.reason || "Covered by replacement",
        shiftRef: {
            scheduleId: request.originalShift.scheduleId,
            dayDate: request.originalShift.dayDate,
            shiftName: request.originalShift.shiftName
        },
        approvedBy: userId
    });

    // 4. Handle Compensation (Optional: Create ExtraHourRequest if applicable)
    if (compensationType === 'extra_hour') {
        // Calculate hours
        const start = parseInt(request.originalShift.startTime.split(':')[0]);
        const end = parseInt(request.originalShift.endTime.split(':')[0]);
        let duration = end - start;
        if (duration < 0) duration += 24;

        await ExtraHourRequest.create({
            employeeId: request.acceptedBy,
            date: request.originalShift.dayDate,
            hoursRequested: duration,
            note: "Shift Coverage Compensation",
            status: 'approved',
            approvedBy: userId
        });
    } else if (compensationType === 'vacation_day') {
        // Increment employee's extra days by 1
        await Employee.findByIdAndUpdate(request.acceptedBy, {
            $inc: { "vacationTracker.defaultDays": 1 }
        });

        await logAction({
            action: 'ADD_VACATION_DAY_BONUS',
            performedBy: userId,
            targetId: request.acceptedBy,
            targetModel: 'Employee',
            details: { reason: "Shift Coverage Bonus", requestId: request._id }
        });
    }

    // Notify Employees
    await triggerNotification({
        title: "Coverage Confirmed",
        message: "You are confirmed for the shift coverage.",
        type: "success",
        category: "schedule",
        recipients: [request.acceptedBy.toString()],
        link: `/dashboard/schedules/${schedule.slug}`
    });

    await triggerNotification({
        title: "Absence Covered",
        message: "Your absence is covered and approved.",
        type: "info",
        category: "absence",
        recipients: [request.originalEmployeeId.toString()]
    });

    // Notify Rejected Candidates (Optional - "Fill is gone")
    const rejects = request.candidates
        .filter((id: any) => id.toString() !== request.acceptedBy.toString())
        .map((id: any) => id.toString());

    if (rejects.length > 0) {
        await triggerNotification({
            title: "Shift Filled",
            message: "The shift coverage opportunity has been filled.",
            type: "info",
            category: "schedule",
            recipients: rejects
        });
    }

    revalidatePath('/dashboard/coverage');
    return { success: true };
}

// 6. Get Requests for HR Dashboard
export async function getCoverageRequests(storeId?: string) {
    await dbConnect();
    const query: any = {};
    if (storeId) query['originalShift.storeId'] = storeId;

    const requests = await ShiftCoverageRequest.find(query)
        .populate('originalEmployeeId', 'firstName lastName image')
        .populate('acceptedBy', 'firstName lastName image')
        .sort({ createdAt: -1 })
        .lean();

    return JSON.parse(JSON.stringify(requests));
}

// 7. Get Pending Offer for Employee
export async function getPendingCoverageOffer(employeeId: string) {
    await dbConnect();
    // Find requests where status is seeking OR pending_hr(if they accepted it)
    // Actually, user just wants to see offers "seeking"

    const requests = await ShiftCoverageRequest.find({
        status: 'seeking_coverage',
        candidates: employeeId
    }).lean();

    return JSON.parse(JSON.stringify(requests));
}

// 8. Get Single Request by ID
export async function getShiftCoverageRequestById(requestId: string) {
    if (!mongoose.Types.ObjectId.isValid(requestId)) return null;
    await dbConnect();
    const request = await ShiftCoverageRequest.findById(requestId)
        .populate('originalEmployeeId', 'firstName lastName image')
        .populate('candidates', 'firstName lastName image')
        .populate('acceptedBy', 'firstName lastName image')
        .lean();
    return JSON.parse(JSON.stringify(request));
}

// 9. Cancel Request
export async function cancelCoverageRequest(requestId: string) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) throw new Error("Unauthorized");

    const request = await ShiftCoverageRequest.findById(requestId);
    if (!request) throw new Error("Request not found");

    // Only HR or the original reporter can cancel
    const user = await Employee.findById(userId).select("roles");
    const roles = (user?.roles || []).map((r: any) => r.toLowerCase());
    const isPrivileged = roles.some((r: string) => ["admin", "hr", "owner", "tech", "super_user"].includes(r));
    const isOwner = request.originalEmployeeId.toString() === userId;

    if (!isPrivileged && !isOwner) {
        throw new Error("Forbidden");
    }

    if (['covered', 'cancelled'].includes(request.status)) {
        throw new Error("Cannot cancel a completed or already cancelled request.");
    }

    request.status = 'cancelled';
    await request.save();

    await logAction({
        action: 'CANCEL_COVERAGE_REQUEST',
        performedBy: userId,
        targetId: requestId,
        targetModel: 'ShiftCoverageRequest'
    });

    revalidatePath('/dashboard/coverage');
    revalidatePath('/dashboard');
    return { success: true };
}

// 10. Get Pending Requests by User (for Dashboard)
export async function getCoverageRequestsByUser(userId: string) {
    await dbConnect();
    const requests = await ShiftCoverageRequest.find({
        originalEmployeeId: userId,
        status: { $in: ['pending_hr', 'seeking_coverage'] }
    })
        .sort({ createdAt: -1 })
        .lean();

    return JSON.parse(JSON.stringify(requests));
}

export async function hasPendingCoverageActions(userId: string, isPrivileged: boolean) {
    await dbConnect();
    if (isPrivileged) {
        const count = await ShiftCoverageRequest.countDocuments({
            status: { $in: ['pending_hr', 'seeking_coverage'] }
        });
        return count > 0;
    } else {
        const count = await ShiftCoverageRequest.countDocuments({
            status: 'seeking_coverage',
            candidates: userId
        });
        return count > 0;
    }
}
