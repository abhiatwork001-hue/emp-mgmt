"use server";

import dbConnect from "@/lib/db";
import { Employee, VacationRequest, AbsenceRequest, Schedule, AbsenceRecord } from "@/lib/models";
import { revalidatePath } from "next/cache";

export async function getDashboardOverview(userId: string, userRoles: string[] = []) {
    await dbConnect();
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

    // Determine highest role for scoping
    const isOwner = userRoles.includes("owner");
    const isHR = userRoles.includes("hr");
    const isManager = userRoles.includes("store_manager"); // Manages specific or all stores
    const isHead = userRoles.includes("department_head"); // Manages specific department
    const isEmployee = !isOwner && !isHR && !isManager && !isHead;

    // Scope Queries based on Role
    // For now, Managers manage ALL stores as per prompt "manages all the stores".
    // Department Heads manage specific department - we need to fetch their department assignment.

    // Fetch user details to get assignments if needed
    let userDetails = null;
    if (isHead || isManager) { // Might need storeId or deptId
        userDetails = await Employee.findById(userId).select("storeId storeDepartmentId").lean();
    }

    // 1. Calculate Week/Year for schedules
    const { getISOWeekNumber } = await import("@/lib/utils");
    const { week: weekNumber, year } = getISOWeekNumber(now);

    // Query Filters
    let employeeQuery: any = {};
    let vacationQuery: any = { status: "approved", requestedFrom: { $lte: now }, requestedTo: { $gte: now } }; // Active vacations
    let absenceQuery: any = { date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)), $lt: new Date(new Date().setHours(23, 59, 59, 999)) } }; // Active absences

    let pendingVacationQuery: any = { status: "pending" };
    let pendingAbsenceQuery: any = { status: "pending" };

    let scheduleQuery: any = { year, weekNumber };

    if (isEmployee) {
        // Employee sees only their own data mostly, or public schedule
        // Stats: Personal stats maybe? Or just don't show stats card.
        // Pending Request: Only their own? Usually dashboard pending approvals implies "To Approve". 
        // Employee does NOT approve. So pendingRequests should be empty for them unless it's "My Pending Requests".
        // The prompt says "employee... can see schedule just, and ask for vacation".

        // For filtering "Data for View", employees won't see company stats.
        // We will return filtered subsets or empty for sensitive areas.

        // Let's filter schedules to their store/department
        const emp = await Employee.findById(userId).select("storeId storeDepartmentId").lean();

        // Fix: Scope employee list to STORE, not global
        if (emp?.storeId) {
            scheduleQuery.storeId = emp.storeId;
            employeeQuery.storeId = emp.storeId;
        }
        // if (emp?.storeDepartmentId) scheduleQuery.storeDepartmentId = emp.storeDepartmentId; // Show whole store schedule or just dept? Usually store.

        // No Pending Approvals for employee to act on
        pendingVacationQuery = { _id: { $exists: false } }; // Return none
        pendingAbsenceQuery = { _id: { $exists: false } };
    }
    else if (isHead) {
        // Limited to their department ?? Or Store?
        // Prompt: "create schedule for the particular storeDepartment"
        if (userDetails?.storeDepartmentId) {
            const deptId = userDetails.storeDepartmentId;
            const storeId = userDetails.storeId;

            // Revised: Show WHOLE STORE employees as per user request
            // Was: employeeQuery = { storeDepartmentId: deptId };
            if (storeId) {
                employeeQuery = { storeId: storeId };
            } else {
                employeeQuery = { storeDepartmentId: deptId }; // Fallback
            }

            // Vacations/Absences for employees in their department (Keep managing Dept only?)
            // Or view store status? "Who is working".
            // Let's keep management queries (vacation/absence pending) scoped to Dept if they only manage Dept.

            // Step 1: Get IDs of employees in dept for PENDING requests
            const deptEmpIds = await Employee.find({ storeDepartmentId: deptId }).distinct('_id');

            // View: Scoped to Store (for "Who is working")
            // Action: Scoped to Dept (for "Pending Approvals")

            // vacationQuery (Approved/Active) -> Maybe show all store?
            // Let's keep active vacations scoped to Dept for now to match "Who is working" if we want, 
            // BUT "Who is working" comes from `activeEmployees` and `employeeList`.
            // employeeList uses `employeeQuery`.

            // So `employeeQuery` = STORE.

            // But `vacationQuery` relates to Stats "On Vacation".
            // If we show Store employees, we should probably show Store stats.

            // Let's scope stats to Store for Head too?
            // If I change employeeQuery to Store, `totalEmployees` etc becomes Store count.

            // Pending requests MUST remain Dept specific because they only MANAGE the dept.
            pendingVacationQuery.employeeId = { $in: deptEmpIds };
            pendingAbsenceQuery.employeeId = { $in: deptEmpIds };

            scheduleQuery = { storeDepartmentId: deptId, year, weekNumber };
        }
    }
    // Manager/HR/Owner see all (or Manager sees all stores as per prompt)

    // 2. Parallel Fetches
    const [
        totalEmployees,
        activeEmployees,
        vacationsToday,
        absentToday,
        pendingVacations,
        pendingAbsences,
        schedules
    ] = await Promise.all([
        Employee.countDocuments(employeeQuery), // Total in scope
        Employee.countDocuments({ ...employeeQuery, active: true }),
        // Optimistic check: Fetch vacations that overlap today
        VacationRequest.countDocuments(vacationQuery),
        // Absence Records for today
        AbsenceRecord.countDocuments(absenceQuery),

        // Pending requests to ACT ON
        VacationRequest.find(pendingVacationQuery).populate("employeeId", "firstName lastName image").sort({ createdAt: -1 }).lean(),
        AbsenceRequest.find(pendingAbsenceQuery).populate("employeeId", "firstName lastName image").sort({ createdAt: -1 }).lean(),

        Schedule.find(scheduleQuery).populate("storeId", "name").populate("storeDepartmentId", "name").populate("createdBy", "firstName lastName").lean()
    ]);

    // 3. Pending Approvals
    // Merge and sort pending requests by date (newest first)
    const allPending = [
        ...pendingVacations.map((v: any) => ({ ...v, type: "vacation" })),
        ...pendingAbsences.map((a: any) => ({ ...a, type: "absence" })) // ensure type is correct
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());


    // 4. Calculate Total Hours this week (Scope filtered by scheduleQuery)
    let totalHours = 0;
    // We iterate schedules -> days -> shifts -> duration * employee count
    schedules.forEach((sch: any) => {
        if (sch.status === "published" || sch.status === "approved") {
            sch.days.forEach((day: any) => {
                day.shifts.forEach((shift: any) => {
                    const start = new Date(`1970-01-01T${shift.startTime}Z`);
                    const end = new Date(`1970-01-01T${shift.endTime}Z`);
                    let diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                    if (diff < 0) diff += 24;
                    // Minus break
                    if (shift.breakMinutes) diff -= (shift.breakMinutes / 60);

                    totalHours += diff * shift.employees.length;
                });
            });
        }
    });

    // 5. Employee Status List
    // Fetch subset based on scope
    const employees = await Employee.find({ ...employeeQuery, active: true })
        .populate("positionId", "name")
        .populate("storeId", "name")
        .limit(10)
        .lean();

    // Enhancing employee data with statuses (Vacation/Absent)
    // We need to check if they are on vacation/absent TODAY.
    const vacationEmployeeIds = (await VacationRequest.find({
        status: "approved",
        requestedFrom: { $lte: now },
        requestedTo: { $gte: now }
    }).select("employeeId").lean()).map((v: any) => v.employeeId.toString());

    const absentEmployeeIds = (await AbsenceRecord.find({
        date: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
    }).select("employeeId").lean()).map((r: any) => r.employeeId.toString());

    const employeeList = employees.map((Emp: any) => {
        let status = "Active";
        if (vacationEmployeeIds.includes(Emp._id.toString())) status = "On Vacation";
        if (absentEmployeeIds.includes(Emp._id.toString())) status = "Absent";

        return {
            _id: Emp._id,
            name: `${Emp.firstName} ${Emp.lastName}`,
            role: (Emp.positionId as any)?.name || "Employee",
            store: (Emp.storeId as any)?.name || "Unassigned",
            image: Emp.image,
            status
        };
    });

    // 6. Upcoming Vacations
    // Clean list of approved vacations starting in future (Scoped?)
    // Yes, scoped to viewable employees
    let upcomingVacationQuery: any = {
        status: "approved",
        requestedFrom: { $gt: now }
    };
    if (isHead && userDetails?.storeDepartmentId) {
        // Re-fetch ids if not already known or reuse logic
        const deptEmpIds = await Employee.find({ storeDepartmentId: userDetails.storeDepartmentId }).distinct('_id');
        upcomingVacationQuery.employeeId = { $in: deptEmpIds };
    }
    // Employee only sees theirs? Or peers? Usually theirs + peers in team.
    // For simplicity, Employee dashboard might not use this generic call or we filter to them.
    if (isEmployee) {
        upcomingVacationQuery.employeeId = userId;
    }

    const upcomingVacations = await VacationRequest.find(upcomingVacationQuery)
        .populate("employeeId", "firstName lastName image positionId")
        .populate({ path: "employeeId", populate: { path: "storeId", select: "name" } }) // deeper pop?
        .sort({ requestedFrom: 1 }) // closest first
        .limit(5)
        .lean();

    // Normalize upcoming for UI
    const upcomingList = upcomingVacations.map((v: any) => ({
        _id: v._id,
        employeeName: `${v.employeeId?.firstName} ${v.employeeId?.lastName}`,
        employeeRole: "Employee", // v.employeeId?.positionId... if we populated deep enough or just skip role
        store: "Store",
        startDate: v.requestedFrom,
        endDate: v.requestedTo,
        daysUntil: Math.ceil((new Date(v.requestedFrom).getTime() - now.getTime()) / (1000 * 3600 * 24))
    }));

    // 7. Generate Admin/Owner Alerts (Schedule Overdue)
    const alerts: any[] = [];
    if (isOwner || isHR || isManager || userRoles.includes("tech")) {
        // Evaluate Schedule Deadlines (Next Week)
        // Rule: Schedules for Next Week (currentWeek + 1) should be published by Tuesday 17:00 (or as configured in Company settings)
        // Hardcoded check for now: If today is Wed-Sun, check if Next Week exists & published.

        // Simpler check: Check CURRENT week schedules -> if missing, CRITICAL.
        // Check NEXT week schedules -> if missing and today > Deadline, WARNING.

        const nextWeekRaw = weekNumber + 1; // Needs overflow logic if week 52/53
        const nextWeek = nextWeekRaw > 52 ? 1 : nextWeekRaw; // Simple rollover
        const nextWeekYear = nextWeekRaw > 52 ? year + 1 : year; // Simple rollover

        // Find stores WITHOUT published schedule for next week
        // We need list of active stores to compare against
        const { Store } = await import("@/lib/models");
        const activeStores = await Store.find({ active: true }).select("name slug").lean();

        // Fetch ALL published schedules for next week
        const publishedNextWeek = await Schedule.find({
            year: nextWeekYear,
            weekNumber: nextWeek,
            status: 'published'
        }).distinct('storeId');

        const publishedStoreIds = publishedNextWeek.map(id => id.toString());

        // Find stores missing schedule
        const storesMissingSchedule = activeStores.filter((s: any) => !publishedStoreIds.includes(s._id.toString()));

        if (storesMissingSchedule.length > 0) {
            // Logic: Check if we are past deadline. 
            // Default: Tuesday (2) 17:00.
            const dayOfWeek = now.getDay(); // 0=Sun
            const currentHour = now.getHours();

            // Alert if: (Day > 2) OR (Day == 2 AND Hour >= 17)
            if (dayOfWeek > 2 || (dayOfWeek === 2 && currentHour >= 17)) {

                // Visible to Manager only if it's THEIR store
                if (isManager && userDetails?.storeId) {
                    const myStoreMissing = storesMissingSchedule.find((s: any) => s._id.toString() === userDetails.storeId?.toString());
                    if (myStoreMissing) {
                        alerts.push({
                            type: 'critical',
                            title: 'Schedule Approval Overdue',
                            message: `Next week's schedule for ${myStoreMissing.name} is overdue.`,
                            actionLabel: 'Create Schedule',
                            actionLink: `/manager/schedule?week=${nextWeek}&year=${nextWeekYear}`
                        });
                    }
                } else if (isOwner || isHR || userRoles.includes("admin") || userRoles.includes("tech")) {
                    // Show count or list
                    alerts.push({
                        type: 'critical',
                        title: 'Schedule Approval Overdue',
                        message: `${storesMissingSchedule.length} stores have not published next week's schedule.`,
                        details: storesMissingSchedule.map((s: any) => s.name).join(", "),
                        actionLabel: 'View Schedules',
                        actionLink: '/dashboard/schedules'
                    });
                }
            }
        }
    }

    return JSON.parse(JSON.stringify({
        stats: {
            totalEmployees,
            activeEmployees,
            onVacation: vacationsToday,
            absentToday,
            pendingApprovals: (isEmployee) ? 0 : pendingVacations.length + pendingAbsences.length, // Employees don't approve
            totalHours: Math.round(totalHours)
        },
        pendingRequests: allPending.slice(0, 10), // Limit payload
        employeeList,
        upcomingVacations: upcomingList,
        recentSchedules: schedules.slice(0, 5), // Limit
        alerts // Return generated alerts
    }));
}
