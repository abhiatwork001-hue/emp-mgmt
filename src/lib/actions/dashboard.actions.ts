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
    const day = now.getUTCDay() || 7;
    const weekDate = new Date(now);
    weekDate.setUTCDate(weekDate.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(weekDate.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil((((weekDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    const year = weekDate.getUTCFullYear();

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
        if (emp?.storeId) scheduleQuery.storeId = emp.storeId;
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

            // Employees in their department
            employeeQuery = { storeDepartmentId: deptId };

            // Vacations/Absences for employees in their department
            // This requires a join or two-step. 
            // Step 1: Get IDs of employees in dept
            const deptEmpIds = await Employee.find({ storeDepartmentId: deptId }).distinct('_id');

            vacationQuery.employeeId = { $in: deptEmpIds };
            absenceQuery.employeeId = { $in: deptEmpIds };

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
        recentSchedules: schedules.slice(0, 5) // Limit
    }));
}
