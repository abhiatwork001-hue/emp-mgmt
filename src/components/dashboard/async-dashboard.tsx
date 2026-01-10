import { getEmployeesByStore, getAllEmployees, getEmployeeStats } from "@/lib/actions/employee.actions";
import { getAllVacationRequests } from "@/lib/actions/vacation.actions";
import { getAllAbsenceRequests } from "@/lib/actions/absence.actions";
import { getPendingOvertimeRequests } from "@/lib/actions/overtime.actions";
import { getPendingSchedules, getScheduleById, getEmployeeScheduleView } from "@/lib/actions/schedule.actions";
import { getTasksForUser } from "@/lib/actions/task.actions";
import { getStoreDepartments, getStoreById } from "@/lib/actions/store.actions";
import { getNotes } from "@/lib/actions/personal-todo.actions";
import { getSwapRequests } from "@/lib/actions/shift-swap.actions";
import { getPendingCoverageApprovals, getActiveOngoingActions } from "@/lib/actions/coverage.actions";
import { StoreManagerDashboard } from "@/components/dashboard/role-views/store-manager-dashboard";
import { DepartmentHeadDashboard } from "@/components/dashboard/role-views/department-head-dashboard";
import { StoreDepartmentHeadDashboard } from "@/components/dashboard/role-views/store-department-head-dashboard";
import { EmployeeDashboard } from "@/components/dashboard/role-views/employee-dashboard";
import { getISOWeekNumber } from "@/lib/utils";
import { Schedule } from "@/lib/models";
import { getSchedules as getSchedulesLib } from "@/lib/actions/schedule.actions";

// Helper to merge requests sort by date
function mergeRequests(vacations: any[], absences: any[], overtime: any[], schedules: any[], coverage: any[] = []) {
    const all = [
        ...vacations.map(v => ({ ...v, type: 'vacation' })),
        ...absences.map(a => ({ ...a, type: 'absence' })),
        ...overtime.map(o => ({ ...o, type: 'overtime' })),
        ...schedules.map(s => ({ ...s, type: 'schedule' })),
        ...coverage.map(c => ({
            id: c._id,
            type: 'coverage',
            acceptedBy: c.acceptedBy,
            originalEmployeeId: c.originalEmployeeId,
            originalShift: c.originalShift,
            createdAt: c.createdAt
        }))
    ];
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function AsyncDashboard({ employee, viewRole, stores, depts, managers, allRoles }: any) {
    // --- Task System Data Fetching ---
    // Parallelize these fetches
    const [tasks, personalTodos, swapRequests, activeActions] = await Promise.all([
        getTasksForUser(employee._id),
        getNotes(employee._id),
        getSwapRequests(employee._id),
        getActiveOngoingActions(employee._id)
    ]);

    let currentScheduleId: string | null = null;
    let currentScheduleSlug: string | null = null;
    let todaysCoworkers: any[] = [];
    let todayShiftsCount = 0;
    let totalScheduledHours = 0;

    if (["owner", "admin", "hr", "super_user", "store_manager", "tech"].includes(viewRole)) {
        const isStoreLevelRole = viewRole === "store_manager" || viewRole === "store_department_head";
        const rawStoreId = employee.storeId?._id || employee.storeId;
        const storeId = isStoreLevelRole ? rawStoreId : undefined;
        const sid = storeId ? storeId.toString() : undefined;

        // Parallelize Pending Requests
        const [
            pendingVacations,
            pendingAbsences,
            pendingOvertime,
            pendingSchedules,
            pendingCoverage,
            storeEmployeesOrStats
        ] = await Promise.all([
            getAllVacationRequests({ status: 'pending', storeId: sid }),
            getAllAbsenceRequests({ status: 'pending', storeId: sid }),
            getPendingOvertimeRequests({ storeId: sid }),
            getPendingSchedules(sid),
            getPendingCoverageApprovals(sid),
            // STRICT SECURITY: If sid (storeId) is missing for a store manager, we MUST NOT return stats?
            // Actually for Admin/Tech/Global Owner, we WANT global stats.
            storeId ? getEmployeesByStore(storeId) : getEmployeeStats({})
        ]);

        // Schedule Calculation
        if (storeId) {
            const storeSchedules = await getSchedulesLib(storeId);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const currentSchedule = storeSchedules.find((s: any) => {
                const start = new Date(s.dateRange.startDate);
                const end = new Date(s.dateRange.endDate);
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                return today >= start && today <= end;
            }) || storeSchedules.find((s: any) => new Date(s.dateRange.startDate) <= today);

            if (currentSchedule) {
                currentScheduleId = currentSchedule._id;
                currentScheduleSlug = currentSchedule.slug;
                const todayStr = today.toISOString().split('T')[0];
                const todayNode = currentSchedule.days?.find((d: any) =>
                    new Date(d.date).toISOString().split('T')[0] === todayStr
                );
                if (todayNode) {
                    todayShiftsCount = todayNode.shifts?.reduce((acc: number, s: any) => acc + (s.employees?.length || 0), 0) || 0;
                }

                currentSchedule.days?.forEach((day: any) => {
                    day.shifts?.forEach((shift: any) => {
                        if (!shift.startTime || !shift.endTime) return;
                        const [sh, sm] = shift.startTime.split(':').map(Number);
                        const [eh, em] = shift.endTime.split(':').map(Number);
                        let mins = (eh * 60 + em) - (sh * 60 + sm);
                        if (mins < 0) mins += 24 * 60;
                        mins -= (shift.breakMinutes || 0);
                        const hours = Math.max(0, mins) / 60;
                        totalScheduledHours += hours * (shift.employees?.length || 0);
                    });
                });

                if (todayNode && viewRole === "store_manager" && currentScheduleId) {
                    const fullSchedule = await getScheduleById(currentScheduleId);
                    if (fullSchedule) {
                        const fullTodayNode = fullSchedule.days?.find((d: any) => new Date(d.date).toISOString().split('T')[0] === todayStr);
                        if (fullTodayNode) {
                            const coworkersMap = new Map();
                            fullTodayNode.shifts.forEach((s: any) => {
                                s.employees?.forEach((e: any) => {
                                    if (e._id?.toString() !== employee._id?.toString() && !coworkersMap.has(e._id?.toString())) {
                                        coworkersMap.set(e._id?.toString(), {
                                            firstName: e.firstName,
                                            lastName: e.lastName,
                                            image: e.image,
                                            position: e.contract?.employmentType || "Employee"
                                        });
                                    }
                                });
                            });
                            todaysCoworkers = Array.from(coworkersMap.values());
                        }
                    }
                }
            }
        } else {
            // Global View
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            const allSchedulesArrays = await Promise.all(stores.map((s: any) => getSchedulesLib(s._id.toString())));

            allSchedulesArrays.forEach((storeSchedules: any[]) => {
                const currentSchedule = storeSchedules.find((s: any) => {
                    const start = new Date(s.dateRange.startDate);
                    const end = new Date(s.dateRange.endDate);
                    start.setHours(0, 0, 0, 0); // Optimization: Reuse Aggregations?
                    end.setHours(23, 59, 59, 999);
                    return today >= start && today <= end;
                });

                if (currentSchedule) {
                    const todayNode = currentSchedule.days?.find((d: any) =>
                        new Date(d.date).toISOString().split('T')[0] === todayStr
                    );
                    todayShiftsCount += todayNode?.shifts?.reduce((acc: number, s: any) => acc + (s.employees?.length || 0), 0) || 0;

                    currentSchedule.days?.forEach((day: any) => {
                        day.shifts?.forEach((shift: any) => {
                            if (!shift.startTime || !shift.endTime) return;
                            const [sh, sm] = shift.startTime.split(':').map(Number);
                            const [eh, em] = shift.endTime.split(':').map(Number);
                            let mins = (eh * 60 + em) - (sh * 60 + sm);
                            if (mins < 0) mins += 24 * 60;
                            mins -= (shift.breakMinutes || 0);
                            const hours = Math.max(0, mins) / 60;
                            totalScheduledHours += hours * (shift.employees?.length || 0);
                        });
                    });
                }
            });
        }

        const statsTotal = Array.isArray(storeEmployeesOrStats) ? storeEmployeesOrStats.length : (storeEmployeesOrStats as any).totalEmployees || 0;
        const statsVacation = Array.isArray(storeEmployeesOrStats) ? storeEmployeesOrStats.filter((e: any) => e.status === 'vacation').length : (storeEmployeesOrStats as any).onVacation || 0;
        const statsCurrentActive = Array.isArray(storeEmployeesOrStats) ? storeEmployeesOrStats.filter((e: any) => e.active !== false).length : statsTotal; // Approx for stats obj

        const storeStats = {
            totalEmployees: statsTotal,
            onVacation: statsVacation,
            todayShifts: todayShiftsCount,
            totalHours: Math.round(totalScheduledHours * 10) / 10
        };

        let operationsScore = 100;
        let radarStatus: "optimal" | "warning" | "critical" = "optimal";
        const alerts: any[] = [];

        const fullStore = storeId ? await getStoreById(storeId.toString()) : null;
        let targetStaffing = 0;
        let maxStaffing = 0;

        if (storeId && fullStore) {
            targetStaffing = fullStore.minEmployees || 0;
            maxStaffing = fullStore.maxEmployees || 999;
        } else {
            targetStaffing = stores.reduce((acc: number, s: any) => acc + (s.minEmployees || 0), 0);
            maxStaffing = stores.reduce((acc: number, s: any) => acc + (s.maxEmployees || 999), 0);
        }

        const staffingMetric = {
            label: storeId ? "Store Staffing" : "Network Staffing",
            current: statsCurrentActive,
            target: targetStaffing,
            min: targetStaffing,
            max: maxStaffing
        };

        if (staffingMetric.current < staffingMetric.min) {
            operationsScore -= 20;
            radarStatus = "critical";
            alerts.push({ id: "staff-critical", type: "critical", title: "Understaffed", message: `Current staff (${staffingMetric.current}) is below minimum (${staffingMetric.min}).`, actionLabel: "Recruit", actionUrl: "/dashboard/employees" });
        } else if (staffingMetric.max && staffingMetric.current > staffingMetric.max) {
            operationsScore -= 10;
            radarStatus = "warning";
            alerts.push({ id: "staff-limit", type: "warning", title: "Overstaffed", message: `Exceeds max limit of ${staffingMetric.max} employees.` });
        }

        const nextWeekDate = new Date();
        nextWeekDate.setDate(nextWeekDate.getDate() + 7);
        const nextWeekISO = getISOWeekNumber(nextWeekDate);

        let missingEntityNames: string[] = [];
        let missingEntityObjects: { id: string, name: string }[] = [];
        let nextWeekPublished = false;

        if (storeId) {
            const storeDepts = await getStoreDepartments(storeId.toString());
            const nextWeekSchedules = await getSchedulesLib(storeId, undefined, nextWeekISO.year, nextWeekISO.week);
            const deptStatusMap = new Map();
            nextWeekSchedules.forEach((s: any) => {
                if (s.status === 'published' || s.status === 'approved') deptStatusMap.set(s.storeDepartmentId?._id?.toString() || s.storeDepartmentId?.toString(), true);
            });
            const missingDepts = storeDepts.filter((d: any) => d.active !== false && !deptStatusMap.has(d._id.toString()));
            missingEntityObjects = missingDepts.map((d: any) => ({ id: d._id.toString(), name: d.name }));
            missingEntityNames = missingEntityObjects.map((d: any) => d.name);
            nextWeekPublished = missingEntityNames.length === 0;
        } else {
            const allNextWeekSchedules = await Schedule.find({ year: nextWeekISO.year, weekNumber: nextWeekISO.week, status: { $in: ['published', 'approved'] } }).select('storeId').lean();
            const fulfilledStoreIds = new Set(allNextWeekSchedules.map((s: any) => s.storeId.toString()));
            const missingStores = stores.filter((s: any) => s.active !== false && !fulfilledStoreIds.has(s._id.toString()));
            missingEntityObjects = missingStores.map((s: any) => ({ id: s._id.toString(), name: s.name }));
            missingEntityNames = missingEntityObjects.map((s: any) => s.name);
            nextWeekPublished = missingEntityNames.length === 0;
        }

        const scheduleHealth = { nextWeekPublished, daysUntilDeadline: 2, overdue: !nextWeekPublished && new Date().getDay() > 2, missingEntities: missingEntityNames, missingEntityObjects };

        if (!nextWeekPublished && new Date().getDay() > 2) {
            operationsScore -= 15;
            radarStatus = radarStatus === "optimal" ? "warning" : radarStatus;
            const isManager = ["store_manager", "department_head", "store_department_head"].includes(viewRole);
            const entityLabel = storeId ? "Departments" : "Stores";
            const listStr = missingEntityNames.slice(0, 3).join(", ") + (missingEntityNames.length > 3 ? ` +${missingEntityNames.length - 3} more` : "");
            alerts.push({ id: "sched-overdue", type: "warning", title: "Missing Schedules", message: `Next week's schedule missing for ${entityLabel}: ${listStr || "All"}.`, actionLabel: isManager ? "Create" : undefined, actionUrl: isManager ? "/dashboard/schedules" : undefined, meta: { missingEntities: missingEntityNames } });
        }

        const pendingRequests = mergeRequests(pendingVacations, pendingAbsences, pendingOvertime, pendingSchedules, pendingCoverage);
        if (pendingRequests.length > 5) {
            operationsScore -= 10;
            alerts.push({ id: "approval-queue", type: "info", title: "High Pending Volume", message: `${pendingRequests.length} requests waiting review.`, actionLabel: "Review", actionUrl: "#approvals" });
        }

        const operationsData = { score: Math.max(0, operationsScore), status: radarStatus, alerts, staffing: staffingMetric, scheduleHealth };

        return <StoreManagerDashboard
            employee={employee}
            pendingRequests={pendingRequests}
            requests={{ vacations: pendingVacations, absences: pendingAbsences, overtime: pendingOvertime, schedules: pendingSchedules, coverage: pendingCoverage }}
            storeStats={storeStats}
            todaysCoworkers={todaysCoworkers}
            currentScheduleId={currentScheduleId}
            currentScheduleSlug={currentScheduleSlug}
            currentUserRole={viewRole}
            operationsData={operationsData}
            tasks={JSON.parse(JSON.stringify(tasks || []))}
            activeActions={activeActions}
            personalTodos={personalTodos}
            swapRequests={swapRequests}
            currentUserRoles={allRoles}
            stores={JSON.parse(JSON.stringify(stores))}
            departments={JSON.parse(JSON.stringify(depts))}
            managers={JSON.parse(JSON.stringify(managers))}
        />;
    }

    if (viewRole === "department_head") {
        // Security Patch: If they have a StoreDepartmentId, they are likely a Store Dept Head misclassified or with dual roles.
        // We must restrict them if they are not truly global.
        const effectiveDeptId = employee.storeDepartmentId?._id || employee.storeDepartmentId;

        let pendingVacations, pendingAbsences, allEmployees;

        if (effectiveDeptId) {
            const queryId = effectiveDeptId.toString();
            [pendingVacations, pendingAbsences, { employees: allEmployees }] = await Promise.all([
                getAllVacationRequests({ status: 'pending', storeDepartmentId: queryId }),
                getAllAbsenceRequests({ status: 'pending', storeDepartmentId: queryId }),
                getAllEmployees({ storeDepartmentId: queryId }, 1, 10000)
            ]);
        } else {
            // Truly global Department Head (or unassigned)
            [pendingVacations, pendingAbsences, { employees: allEmployees }] = await Promise.all([
                getAllVacationRequests({ status: 'pending' }),
                getAllAbsenceRequests({ status: 'pending' }),
                getAllEmployees({}, 1, 10000)
            ]);
        }

        const pendingRequests = mergeRequests(pendingVacations, pendingAbsences, [], []);
        const deptStats = {
            totalEmployees: allEmployees.length,
            onVacation: allEmployees.filter((e: any) => e.status === 'vacation').length,
            todayShifts: 0
        };
        return <DepartmentHeadDashboard employee={employee} pendingRequests={pendingRequests} deptStats={deptStats} activeActions={activeActions} personalTodos={personalTodos} />;
    }

    if (viewRole === "store_department_head") {
        const deptId = employee.storeDepartmentId?._id || employee.storeDepartmentId;
        // Secure: Filter at DB level. If no deptId, prevent fetching (pass dummy or empty).
        const queryDeptId = deptId ? deptId.toString() : "000000000000000000000000";

        // Pass storeDepartmentId to actions
        const [pendingVacations, pendingAbsences] = await Promise.all([
            getAllVacationRequests({ status: 'pending', storeDepartmentId: queryDeptId }),
            getAllAbsenceRequests({ status: 'pending', storeDepartmentId: queryDeptId })
        ]);

        const pendingRequests = mergeRequests(pendingVacations, pendingAbsences, [], []);
        const { employees: deptEmployees } = await getAllEmployees({ storeDepartmentId: deptId }, 1, 10000);
        const deptStats = {
            totalEmployees: deptEmployees.length,
            onVacation: deptEmployees.filter((e: any) => e.status === 'vacation').length,
            todayShifts: 0
        };
        return <StoreDepartmentHeadDashboard employee={employee} pendingRequests={pendingRequests} deptStats={deptStats} activeActions={activeActions} personalTodos={personalTodos} />;
    }

    // Employee View
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const [scheduleData, storeSchedules] = await Promise.all([
        getEmployeeScheduleView(employee._id, today),
        getSchedulesLib(employee.storeId?._id || employee.storeId)
    ]);

    const todayForSchedule = new Date();
    todayForSchedule.setHours(0, 0, 0, 0);
    const currentSchedule = storeSchedules.find((s: any) => {
        const start = new Date(s.dateRange.startDate);
        const end = new Date(s.dateRange.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return todayForSchedule >= start && todayForSchedule <= end;
    }) || storeSchedules.find((s: any) => new Date(s.dateRange.startDate) <= todayForSchedule) || (storeSchedules.length > 0 ? storeSchedules[0] : null);

    if (currentSchedule) {
        currentScheduleId = currentSchedule._id;
        currentScheduleSlug = currentSchedule.slug;
    }

    if (currentScheduleId) {
        const fullSchedule = await getScheduleById(currentScheduleId);
        if (fullSchedule) {
            const todayNode = fullSchedule.days?.find((d: any) => new Date(d.date).toISOString().split('T')[0] === todayStr);
            if (todayNode) {
                const coworkersMap = new Map();
                todayNode.shifts.forEach((s: any) => {
                    s.employees?.forEach((e: any) => {
                        if (e._id !== employee._id && !coworkersMap.has(e._id)) {
                            coworkersMap.set(e._id, { firstName: e.firstName, lastName: e.lastName, position: e.contract?.employmentType || "Employee" });
                        }
                    });
                });
                todaysCoworkers = Array.from(coworkersMap.values()).slice(0, 3);
            }
        }
    }

    let daysUntilNextDayOff = -1;
    if (scheduleData && scheduleData.days) {
        const dayOff = scheduleData.days.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()).find((d: any) => {
            const dDate = new Date(d.date);
            dDate.setHours(0, 0, 0, 0);
            return dDate >= today && (!d.shifts || d.shifts.length === 0);
        });
        if (dayOff) {
            daysUntilNextDayOff = Math.ceil(Math.abs(new Date(dayOff.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        } else {
            daysUntilNextDayOff = 7;
        }
    }

    return <EmployeeDashboard
        employee={employee}
        todaysCoworkers={todaysCoworkers}
        currentScheduleId={currentScheduleId}
        currentScheduleSlug={currentScheduleSlug}
        daysUntilNextDayOff={daysUntilNextDayOff}
        personalTodos={personalTodos}
        activeActions={activeActions}
        swapRequests={swapRequests}
    />;
}
