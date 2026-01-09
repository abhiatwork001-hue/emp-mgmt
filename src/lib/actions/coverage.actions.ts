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
        .populate('storeId', 'name')
        .populate({
            path: 'storeDepartmentId',
            select: 'name globalDepartmentId',
        })
        .lean();

    // 3. Find who is working ANYWHERE on this day
    const dayStart = new Date(date).setUTCHours(0, 0, 0, 0);

    // Scan ANY schedule (Draft or Published) to find commitments
    const schedulesOnDay = await Schedule.find({
        status: { $ne: 'rejected' },
        "days.date": dayStart
    }).select("days").lean();

    const workingEmployeeIds = new Set<string>();
    schedulesOnDay.forEach((s: any) => {
        const day = s.days.find((d: any) => new Date(d.date).getTime() === dayStart);
        if (day) {
            day.shifts.forEach((sh: any) => {
                const shiftName = sh.shiftName?.toLowerCase() || "";
                const isDayOff = /day off|do$|^-$/.test(shiftName);
                if (!isDayOff) {
                    sh.employees.forEach((e: any) => workingEmployeeIds.add(e.toString()));
                }
            });
        }
    });

    // 4. Categorize available employees (exclude already invited candidates)
    const currentCandidateIds = request.candidates.map((c: any) => c.toString());
    const available = allEmployees.filter(emp =>
        !workingEmployeeIds.has(emp._id.toString()) &&
        !currentCandidateIds.includes(emp._id.toString())
    );

    // Enhance with flags and 4-Tier Priority
    const results = available.map((emp: any) => {
        const isGlobalHead = globalDeptHeads.includes(emp._id.toString());

        // Robust ID extraction for Store
        const empStoreId = emp.storeId?._id ? emp.storeId._id.toString() : emp.storeId?.toString();
        const reqStoreId = storeId?.toString();
        const isSameStore = empStoreId && reqStoreId && empStoreId === reqStoreId;

        // Robust ID extraction for Global Dept
        const empGlobalId = emp.storeDepartmentId?.globalDepartmentId?._id
            ? emp.storeDepartmentId.globalDepartmentId._id.toString()
            : emp.storeDepartmentId?.globalDepartmentId?.toString();
        const targetGlobalId = globalDeptId?.toString();
        const isSameGlobalDept = empGlobalId && targetGlobalId && empGlobalId === targetGlobalId;

        // Robust ID extraction for Dept
        const empDeptId = emp.storeDepartmentId?._id
            ? emp.storeDepartmentId._id.toString()
            : emp.storeDepartmentId?.toString();
        const reqDeptId = storeDepartmentId?.toString();
        const isSameDept = empDeptId && reqDeptId && empDeptId === reqDeptId;

        let priority = 4; // Default: Rest of Global Staff

        if (isSameStore) {
            if (isSameDept) {
                priority = 1; // Same Store + Same Dept
            } else {
                priority = 4; // Same Store + Different Dept
            }
        } else if (isSameGlobalDept) {
            priority = 2; // Global Same Dept
        } else if (isGlobalHead) {
            priority = 3; // Global Dept Head
        }

        return {
            ...emp,
            displayName: `${emp.firstName} ${emp.lastName}`,
            isGlobalHead,
            isSameStore,
            isSameGlobalDept,
            isSameDept,
            priority
        };
    });

    // Sort by priority (1 is highest)
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
    })
        .populate({
            path: 'originalShift.storeId',
            select: 'name'
        })
        .populate({
            path: 'originalShift.storeDepartmentId',
            select: 'name'
        })
        .lean();

    const employee = await Employee.findById(employeeId).select('roles storeId storeDepartmentId');
    const PRIVILEGED_ROLES = ["admin", "hr", "owner", "tech", "super_user"];
    const isPrivileged = employee?.roles?.some((r: string) =>
        PRIVILEGED_ROLES.includes(r.toLowerCase().replace(/ /g, "_"))
    );

    // 9. Get Ongoing actions for employee (unified) - UPDATED for Open Market
    const coverageOffersQuery: any = {
        status: 'seeking_coverage',
        acceptedBy: { $exists: false }
    };

    if (!isPrivileged) {
        // Allow if:
        // A) User is explicitly invited (candidates)
        // B) User matches the Store AND Department of the shift (Open Market within Dept)
        // C) User matches the Store (if generic coverage? Sticking to Dept for now to be safe)

        coverageOffersQuery.$or = [
            { candidates: employeeId },
            {
                "originalShift.storeId": employee.storeId,
                "originalShift.storeDepartmentId": employee.storeDepartmentId
            }
        ];
    }
    // ... (keep rest of query execution)


    const requests = await ShiftCoverageRequest.find(coverageOffersQuery)
        .populate('originalEmployeeId', 'firstName lastName image')
        .populate({
            path: 'originalShift.storeId',
            select: 'name'
        })
        .populate({
            path: 'originalShift.storeDepartmentId',
            select: 'name'
        })
        .lean();

    const coverageOffers = await Promise.all(requests.map(async (req: any) => {
        const schedule = await Schedule.findById(req.originalShift.scheduleId)
            .populate({
                path: 'days.shifts.employees',
                select: 'firstName lastName'
            })
            .lean();

        let coworkers: any[] = [];
        if (schedule) {
            const dayStart = new Date(req.originalShift.dayDate).setUTCHours(0, 0, 0, 0);
            const day = schedule.days.find((d: any) => new Date(d.date).getTime() === dayStart);
            if (day) {
                const shift = day.shifts.find((s: any) =>
                    s.startTime === req.originalShift.startTime &&
                    s.endTime === req.originalShift.endTime
                );
                if (shift) {
                    coworkers = shift.employees
                        .filter((e: any) => e._id.toString() !== req.originalEmployeeId._id.toString())
                        .map((e: any) => `${e.firstName} ${e.lastName}`);
                }
            }
        }
        return { ...req, coworkers };
    }));

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

    // Use $addToSet to add new candidates without removing existing ones
    const request = await ShiftCoverageRequest.findByIdAndUpdate(requestId, {
        $addToSet: { candidates: { $each: employeeIds } },
        status: 'seeking_coverage',
        offerSentAt: new Date(),
        hrMessage: customMessage
    }, { new: true });

    // Send Notifications only to the NEW candidates
    const formattedDate = format(new Date(request.originalShift.dayDate), 'PPP');
    const defaultMessage = `A shift is available on ${formattedDate} (${request.originalShift.startTime}-${request.originalShift.endTime}). Click to accept.`;

    await triggerNotification({
        title: "Shift Coverage Opportunity",
        message: customMessage || defaultMessage,
        type: "info",
        category: "schedule",
        recipients: employeeIds,
        link: `/dashboard/pending-actions`
    });

    await logAction({
        action: 'INVITE_COVERAGE',
        performedBy: userId,
        targetId: requestId,
        targetModel: 'ShiftCoverageRequest',
        details: { candidateCount: employeeIds.length, totalCandidates: request.candidates.length }
    });

    // Trigger real-time updates for all invited candidates
    employeeIds.forEach(async (candidateId) => {
        await pusherServer.trigger(`user-${candidateId}`, "coverage:invited", {
            requestId
        });
    });

    revalidatePath(`/dashboard/coverage/${requestId}`);
    revalidatePath('/dashboard/pending-actions');
}

// 4. Employee Accepts Offer
export async function acceptCoverageOffer(requestId: string, employeeId: string) {
    await dbConnect();

    // Atomic check: ensure status is still seeking
    const request = await ShiftCoverageRequest.findById(requestId);
    if (!request) return { success: false, error: "Request not found." };
    if (request.status !== 'seeking_coverage' || request.acceptedBy) {
        if (request.acceptedBy?.toString() === employeeId) return { success: true };
        return { success: false, error: "This offer is no longer available or already accepted." };
    }

    // Check if user was invited OR has privileged role
    const accepterEmployee = await Employee.findById(employeeId).select('roles');
    const PRIVILEGED_ROLES = ["admin", "hr", "owner", "tech", "super_user"];
    const isAccepterPrivileged = accepterEmployee?.roles?.some((r: string) =>
        PRIVILEGED_ROLES.includes(r.toLowerCase().replace(/ /g, "_"))
    );

    if (!isAccepterPrivileged && !request.candidates.map((id: any) => id.toString()).includes(employeeId)) {
        return { success: false, error: "You were not invited to cover this shift." };
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
        // Notify Admins
        await pusherServer.trigger(`admin-updates`, "coverage:accepted", {
            requestId: updated._id,
            acceptedBy: employeeId
        });

        // Notify Requestor
        await pusherServer.trigger(`user-${request.originalEmployeeId}`, "coverage:accepted", {
            requestId: updated._id,
            acceptedBy: employeeId
        });

        // Notify Candidates (to remove from their list)
        if (request.candidates && request.candidates.length > 0) {
            request.candidates.forEach(async (candidateId: any) => {
                await pusherServer.trigger(`user-${candidateId.toString()}`, "coverage:taken", {
                    requestId: updated._id,
                    acceptedBy: employeeId
                });
            });
        }
        await pusherServer.trigger(`user-${updated.originalEmployeeId}`, "coverage:updated", { requestId: updated._id, status: 'accepted' });
        await pusherServer.trigger(`user-${employeeId}`, "coverage:updated", { requestId: updated._id, status: 'accepted' });
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
    return { success: true, request: JSON.parse(JSON.stringify(updated)) };
}

// 4b. Employee Declines Offer
export async function declineCoverageOffer(requestId: string, employeeId: string) {
    await dbConnect();

    const request = await ShiftCoverageRequest.findById(requestId);
    if (!request) return { success: false, error: "Request not found." };
    if (request.status !== 'seeking_coverage') {
        return { success: false, error: "This offer is no longer available." };
    }

    // Remove employee from candidates list
    const updated = await ShiftCoverageRequest.findByIdAndUpdate(
        requestId,
        {
            $pull: { candidates: employeeId }
        },
        { new: true }
    );

    if (!updated) return { success: false, error: "Failed to decline offer." };

    // Notify HR that candidate declined
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

    const decliner = await Employee.findById(employeeId).select('firstName lastName');

    await triggerNotification({
        title: "Coverage Offer Declined",
        message: `${decliner.firstName} ${decliner.lastName} declined the coverage offer for ${format(new Date(request.originalShift.dayDate), 'PPP')}.`,
        type: "info",
        category: "schedule",
        recipients: managers.map(m => m._id.toString()),
        link: `/dashboard/coverage/${requestId}`
    });

    await logAction({
        action: 'DECLINE_COVERAGE_OFFER',
        performedBy: employeeId,
        targetId: requestId,
        targetModel: 'ShiftCoverageRequest'
    });

    // Trigger real-time updates for original employee and HR
    await pusherServer.trigger(`user-${request.originalEmployeeId}`, "coverage:declined", {
        requestId,
        declinedBy: employeeId
    });

    revalidatePath('/dashboard');
    return { success: true };
}

// 5. HR Finalizes
export async function finalizeCoverage(
    requestId: string,
    compensationSettings: { type: 'extra_hour' | 'vacation_day'; amount?: number },
    absenceSettings: { type: string; justification: string; justificationStatus: 'Justified' | 'Unjustified' }
) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    const request = await ShiftCoverageRequest.findById(requestId);
    if (!request || !request.acceptedBy) throw new Error("Invalid request state.");

    // 1. Update Request
    request.compensationType = compensationSettings.type;
    request.status = 'covered';
    await request.save();

    await pusherServer.trigger(`admin-updates`, "coverage:finalized", {
        requestId: request._id,
        status: 'covered'
    });

    await pusherServer.trigger(`coverage-global`, "coverage:closed", {
        requestId: request._id
    });

    // 2. Schedule Update
    const schedule = await Schedule.findById(request.originalShift.scheduleId);
    if (schedule) {
        const dateStr = new Date(request.originalShift.dayDate).toDateString();
        const day = schedule.days.find((d: any) => new Date(d.date).toDateString() === dateStr);
        if (day) {
            const shift = day.shifts.find((s: any) =>
                s.startTime === request.originalShift.startTime &&
                s.endTime === request.originalShift.endTime
            );

            if (shift) {
                // A. Handle "Mark as Absence" for Original Employee
                // Instead of just vanishing, we add them to the Schedule's absence list for visual tracking?
                // The prompt says "have that shift of that employee but mark as absence".
                // Ideally, we move them to a separate list on the schedule or rely on AbsenceRecord.
                // Current renderer views 'schedule.absences'. So we must push to `schedule.absences`.

                // B. Handle Schedule Updates
                // 1. Keep Original Employee (for history/greyed out view) but ensure they are marked absent via 'schedule.absences'
                // shift.employees = shift.employees.filter((id: any) => id.toString() !== request.originalEmployeeId.toString());

                // 2. Add New Employee to active shift
                if (!shift.employees.includes(request.acceptedBy)) {
                    shift.employees.push(request.acceptedBy);
                }

                // 3. Add Meta Data for Styling (Unique Color for Cover)
                if (!shift.meta) shift.meta = {};
                if (!shift.meta.coverages) shift.meta.coverages = [];
                shift.meta.coverages.push({
                    originalEmployeeId: request.originalEmployeeId,
                    coveringEmployeeId: request.acceptedBy,
                    compensationType: compensationSettings.type,
                    amount: compensationSettings.amount
                });
                shift.markModified('meta'); // Ensure mixed type is saved

                // 4. Add Absence Marker to Schedule for Original Employee
                if (!schedule.absences) schedule.absences = [];
                schedule.absences.push({
                    employeeId: request.originalEmployeeId,
                    date: request.originalShift.dayDate,
                    type: absenceSettings.type || 'absence',
                    status: absenceSettings.justificationStatus,
                    reason: absenceSettings.justification || 'Covered Shift'
                });


            }
        }
        await schedule.save();
    }

    // 3. Create Absence Record for Original Employee (Official Record)
    // Transfer documentation and reason from the coverage request
    await AbsenceRecord.create({
        employeeId: request.originalEmployeeId,
        date: request.originalShift.dayDate,
        type: absenceSettings.type,
        justification: absenceSettings.justificationStatus,
        reason: absenceSettings.justification || request.reason || "Shift Covered",
        attachments: request.attachments || [], // Transfer attachments
        shiftRef: {
            scheduleId: request.originalShift.scheduleId,
            dayDate: request.originalShift.dayDate,
            shiftName: request.originalShift.shiftName
        },
        approvedBy: userId
    });

    // 4. Handle Compensation for Covering Employee
    let compMessage = "";
    if (compensationSettings.type === 'extra_hour') {
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
        compMessage = ` (+${duration} Extra Hours added)`;
    } else if (compensationSettings.type === 'vacation_day') {
        const daysToAdd = compensationSettings.amount || 1;

        // Find employee and handle tracker initialization if needed
        const coveringEmp = await Employee.findById(request.acceptedBy);
        if (coveringEmp) {
            if (!coveringEmp.vacationTracker) {
                coveringEmp.vacationTracker = {
                    defaultDays: 22, // Default fallback
                    rolloverDays: 0,
                    usedDays: 0,
                    pendingRequests: 0,
                    remainingDays: 22,
                    year: new Date().getFullYear()
                };
            }
            coveringEmp.vacationTracker.defaultDays += daysToAdd;
            // Also update remainingDays if it's a simple sum
            coveringEmp.vacationTracker.remainingDays += daysToAdd;
            await coveringEmp.save();
        }

        await logAction({
            action: 'ADD_VACATION_DAY_BONUS',
            performedBy: userId,
            targetId: request.acceptedBy,
            targetModel: 'Employee',
            details: { reason: "Shift Coverage Bonus", days: daysToAdd, requestId: request._id }
        });
        compMessage = ` (+${daysToAdd} Vacation Days added to balance)`;
    }

    await logAction({
        action: 'FINALIZE_COVERAGE',
        performedBy: userId,
        targetId: requestId,
        targetModel: 'ShiftCoverageRequest',
        details: {
            cover: request.acceptedBy,
            original: request.originalEmployeeId,
            compensation: compensationSettings
        }
    });

    // Notify Employees
    await triggerNotification({
        title: "Coverage Confirmed",
        message: `You are confirmed for the shift coverage.${compMessage}`,
        type: "success",
        category: "schedule",
        recipients: [request.acceptedBy.toString()],
        link: `/dashboard/schedules/${schedule?.slug || ''}`
    });

    await triggerNotification({
        title: "Absence Processed",
        message: `Your absence has been processed as ${absenceSettings.type}.`,
        type: "info",
        category: "absence",
        recipients: [request.originalEmployeeId.toString()]
    });

    // Trigger Real-time update for both involved users
    await pusherServer.trigger(`user-${request.originalEmployeeId}`, "coverage:updated", { requestId: requestId, status: 'finalized' });
    if (request.acceptedBy) {
        await pusherServer.trigger(`user-${request.acceptedBy}`, "coverage:updated", { requestId: requestId, status: 'finalized' });
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
    })
        .populate('originalEmployeeId', 'firstName lastName image')
        .populate({
            path: 'originalShift.storeId',
            select: 'name'
        })
        .populate({
            path: 'originalShift.storeDepartmentId',
            select: 'name'
        })
        .lean();

    const enhancedRequests = await Promise.all(requests.map(async (req: any) => {
        const schedule = await Schedule.findById(req.originalShift.scheduleId)
            .populate({
                path: 'days.shifts.employees',
                select: 'firstName lastName'
            })
            .lean();

        let coworkers: any[] = [];
        if (schedule) {
            const dayStart = new Date(req.originalShift.dayDate).setUTCHours(0, 0, 0, 0);
            const day = schedule.days.find((d: any) => new Date(d.date).getTime() === dayStart);
            if (day) {
                const shift = day.shifts.find((s: any) =>
                    s.startTime === req.originalShift.startTime &&
                    s.endTime === req.originalShift.endTime
                );
                if (shift) {
                    coworkers = shift.employees
                        .filter((e: any) => e._id.toString() !== req.originalEmployeeId._id.toString())
                        .map((e: any) => `${e.firstName} ${e.lastName}`);
                }
            }
        }
        return { ...req, coworkers };
    }));

    return JSON.parse(JSON.stringify(enhancedRequests));
}

// 8. Get Single Request by ID
export async function getShiftCoverageRequestById(requestId: string) {
    if (!mongoose.Types.ObjectId.isValid(requestId)) return null;
    await dbConnect();
    const request = await ShiftCoverageRequest.findById(requestId)
        .populate('originalEmployeeId', 'firstName lastName image')
        .populate('candidates', 'firstName lastName image')
        .populate('acceptedBy', 'firstName lastName image')
        .populate({
            path: 'originalShift.storeId',
            select: 'name'
        })
        .populate({
            path: 'originalShift.storeDepartmentId',
            select: 'name'
        })
        .lean();

    if (!request) return null;

    // Fetch Coworkers
    const schedule = await Schedule.findById(request.originalShift.scheduleId)
        .populate({
            path: 'days.shifts.employees',
            select: 'firstName lastName'
        })
        .lean();

    let coworkers: any[] = [];
    if (schedule) {
        const dayStart = new Date(request.originalShift.dayDate).setUTCHours(0, 0, 0, 0);
        const day = schedule.days.find((d: any) => new Date(d.date).getTime() === dayStart);
        if (day) {
            const shift = day.shifts.find((s: any) =>
                s.startTime === request.originalShift.startTime &&
                s.endTime === request.originalShift.endTime
            );
            if (shift) {
                coworkers = shift.employees
                    .filter((e: any) => e._id.toString() !== request.originalEmployeeId._id.toString())
                    .map((e: any) => `${e.firstName} ${e.lastName}`);
            }
        }
    }

    return JSON.parse(JSON.stringify({ ...request, coworkers }));
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
    const userRoleInfo = await Employee.findById(userId).select("roles");
    const roles = (userRoleInfo?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
    const isPrivileged = roles.some((r: string) => ["admin", "hr", "owner", "tech", "super_user"].includes(r));

    // More robust owner check - handle both ObjectId and string formats
    const originalEmpId = request.originalEmployeeId?._id || request.originalEmployeeId;
    const isOwner = originalEmpId?.toString() === userId.toString();

    if (!isPrivileged && !isOwner) {
        console.error('Authorization failed:', {
            userId,
            originalEmployeeId: originalEmpId?.toString(),
            roles,
            isPrivileged,
            isOwner
        });
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
    }
}

// 11. Get Pending Coverage Approvals (for Admin/HR Dashboard)
export async function getPendingCoverageApprovals(storeId?: string) {
    await dbConnect();
    const query: any = {
        status: { $in: ['pending_hr', 'seeking_coverage'] }
    };

    if (storeId) {
        query['originalShift.storeId'] = storeId;
    }

    const requests = await ShiftCoverageRequest.find(query)
        .populate('originalEmployeeId', 'firstName lastName image slug')
        .populate('acceptedBy', 'firstName lastName image slug')
        .populate({
            path: 'originalShift.storeId',
            select: 'name'
        })
        .populate({
            path: 'originalShift.storeDepartmentId',
            select: 'name'
        })
        .sort({ createdAt: -1 })
        .lean();
    return JSON.parse(JSON.stringify(requests));
}

// --- Debug Actions ---
export async function getStoreDepartmentStaffStatus(storeDeptId: string, date: Date) {
    await dbConnect();
    const dayStart = new Date(date).setUTCHours(0, 0, 0, 0);

    const employees = await Employee.find({
        storeDepartmentId: storeDeptId,
        active: true
    }).select('firstName lastName').lean();

    const schedules = await Schedule.find({
        status: { $ne: 'rejected' },
        "days.date": dayStart
    }).select("days").lean();

    const staffStatus = employees.map(emp => {
        let currentShift = "None (Available)";
        let isWorking = false;

        schedules.forEach(s => {
            const day = s.days.find((d: any) => new Date(d.date).getTime() === dayStart);
            if (day) {
                day.shifts.forEach((sh: any) => {
                    if (sh.employees.some((e: any) => e.toString() === emp._id.toString())) {
                        const isDayOff = /day off|do$|^-$/i.test(sh.shiftName);
                        if (!isDayOff) isWorking = true;
                        currentShift = `${sh.shiftName} (${sh.startTime}-${sh.endTime})${isDayOff ? " [Day Off]" : ""}`;
                    }
                });
            }
        });

        return {
            id: emp._id.toString(),
            name: `${emp.firstName} ${emp.lastName}`,
            status: isWorking ? 'Working' : 'Available',
            shift: currentShift
        };
    });

    return JSON.parse(JSON.stringify(staffStatus));
}
