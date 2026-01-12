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
import { Schedule, Company } from "@/lib/models"; // Import Company
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

export async function AsyncDashboard({ employee, viewRole, stores, depts, managers, allRoles, storeRatings, weather }: any) {
    const { GlobalDepartment, StoreDepartment } = require("@/lib/models");

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
    let isWorkingToday = false;
    let todayShiftsCount = 0;
    let totalScheduledHours = 0;

    if (["owner", "admin", "hr", "super_user", "store_manager", "tech", "department_head", "store_department_head"].includes(viewRole)) {
        const isStoreLevelRole = ["store_manager", "store_department_head"].includes(viewRole);
        const isGlobalDeptHead = viewRole === "department_head";
        const isStoreDeptHead = viewRole === "store_department_head";

        const rawStoreId = employee.storeId?._id || employee.storeId;
        const storeId = isStoreLevelRole ? rawStoreId : undefined;
        const sid = storeId ? storeId.toString() : undefined;

        // Scoping Logic for Departments
        let did: any = undefined;
        let deptId: any = undefined;

        if (isStoreDeptHead) {
            deptId = employee.storeDepartmentId?._id || employee.storeDepartmentId;
            did = deptId ? deptId.toString() : undefined;
        } else if (isGlobalDeptHead) {
            // Find ALL store departments for ALL global departments this user heads

            const ledGlobalDepts = await GlobalDepartment.find({ departmentHead: employee._id }).select('_id');
            const ledGlobalDeptIds = ledGlobalDepts.map((d: any) => d._id);


            const storeDepts = await StoreDepartment.find({ globalDepartmentId: { $in: ledGlobalDeptIds } }).select('_id');
            const storeDeptIds = storeDepts.map((sd: any) => sd._id.toString());


            if (storeDeptIds.length > 0) {
                did = { $in: storeDeptIds };
                deptId = storeDeptIds[0]; // For legacy/single-id uses, use first one or keep as array if possible

            }
        }

        const nextWeekDate = new Date();
        nextWeekDate.setDate(nextWeekDate.getDate() + 7);
        const nextWeekISO = getISOWeekNumber(nextWeekDate);

        // group all independent database calls
        const promises = [
            getAllVacationRequests({ status: 'pending', storeId: sid, storeDepartmentId: did }),
            getAllAbsenceRequests({ status: 'pending', storeId: sid, storeDepartmentId: did }),
            getPendingOvertimeRequests({ storeId: sid }),
            getPendingSchedules(sid, did),
            getPendingCoverageApprovals(sid),
            did ? getAllEmployees({ storeDepartmentId: did }, 1, 10000) : (storeId ? getEmployeesByStore(storeId) : getEmployeeStats({})),
            Company.findOne({ active: true }).select('settings.scheduleRules').lean(),
            getEmployeeScheduleView(employee._id, new Date()),
            did ? getEmployeeStats({ storeDepartmentId: did }) : Promise.resolve(null)
        ];

        // Add store-specific details if storeId exists
        if (storeId) {
            promises.push(getSchedulesLib(storeId));
            promises.push(getStoreById(storeId.toString()));
            promises.push(getStoreDepartments(storeId.toString()));
            promises.push(getSchedulesLib(storeId, undefined, nextWeekISO.year, nextWeekISO.week));
        } else {
            // Global view schedules fetching
            promises.push(Promise.all(stores.map((s: any) => getSchedulesLib(s._id.toString()))));
            promises.push(Promise.resolve(null)); // dummy for getStoreById
            promises.push(Promise.resolve([])); // dummy for getStoreDepartments
            promises.push(Schedule.find({ year: nextWeekISO.year, weekNumber: nextWeekISO.week, status: { $in: ['published', 'approved'] } }).select('storeId').lean());
        }

        const results = await Promise.all(promises);

        const [
            pendingVacations,
            pendingAbsences,
            pendingOvertime,
            pendingSchedules,
            pendingCoverage,
            storeEmployeesOrStats,
            companyDoc,
            personalScheduleData,
            globalHeadStats,
            storeSchedulesOrAll,
            fetchedFullStore,
            fetchedStoreDepts,
            nextWeekDataOrSchedules
        ] = results;

        // Personal Stats for Global Head (as employee)
        if (personalScheduleData && personalScheduleData.days && personalScheduleData.days.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dayOff = personalScheduleData.days.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()).find((d: any) => {
                const dDate = new Date(d.date);
                dDate.setHours(0, 0, 0, 0);
                return dDate >= today && (!d.shifts || d.shifts.length === 0);
            });
            if (dayOff) {
                (employee as any).daysUntilNextDayOff = Math.ceil(Math.abs(new Date(dayOff.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            } else {
                // No day off found in schedule, check if they have any shifts at all
                const hasAnyShifts = personalScheduleData.days.some((d: any) => d.shifts && d.shifts.length > 0);
                (employee as any).daysUntilNextDayOff = hasAnyShifts ? -1 : null; // -1 = no day off scheduled, null = no schedule
            }
        } else {
            // No schedule data available
            (employee as any).daysUntilNextDayOff = null;
        }

        const deadlineDay = (companyDoc as any)?.settings?.scheduleRules?.deadlineDay ?? 2;

        // Schedule Calculation
        if (storeId) {
            const storeSchedules = storeSchedulesOrAll as any[];
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
                    // Filter shifts by department if applicable
                    const relevantShifts = did ? todayNode.shifts?.filter((s: any) => {
                        const sId = (s.storeDepartmentId?._id || s.storeDepartmentId)?.toString();
                        if (typeof did === 'string') return sId === did;
                        if (did.$in) return did.$in.includes(sId);
                        return false;
                    }) : todayNode.shifts;
                    todayShiftsCount = relevantShifts?.reduce((acc: number, s: any) => acc + (s.employees?.length || 0), 0) || 0;
                }

                currentSchedule.days?.forEach((day: any) => {
                    const shiftsToCalculate = did ? day.shifts?.filter((s: any) => {
                        const sId = (s.storeDepartmentId?._id || s.storeDepartmentId)?.toString();
                        if (typeof did === 'string') return sId === did;
                        if (did.$in) return did.$in.includes(sId);
                        return false;
                    }) : day.shifts;
                    shiftsToCalculate?.forEach((shift: any) => {
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

                if (todayNode && ["store_manager", "store_department_head"].includes(viewRole) && currentScheduleId) {
                    const fullSchedule = await getScheduleById(currentScheduleId);
                    if (fullSchedule) {
                        const fullTodayNode = fullSchedule.days?.find((d: any) => new Date(d.date).toISOString().split('T')[0] === todayStr);
                        if (fullTodayNode) {
                            const coworkersMap = new Map();
                            const shiftsToMap = did ? fullTodayNode.shifts?.filter((s: any) => {
                                const sId = (s.storeDepartmentId?._id || s.storeDepartmentId)?.toString();
                                if (typeof did === 'string') return sId === did;
                                if (did.$in) return did.$in.includes(sId);
                                return false;
                            }) : fullTodayNode.shifts;
                            shiftsToMap?.forEach((s: any) => {
                                s.employees?.forEach((e: any) => {
                                    if (e._id?.toString() !== employee._id?.toString() && !coworkersMap.has(e._id?.toString())) {
                                        coworkersMap.set(e._id?.toString(), {
                                            _id: e._id,
                                            slug: e.slug,
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
            // Global View (Admin/Tech/Owner/Global Dept Head)
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            const allSchedulesArrays = storeSchedulesOrAll as any[][];
            const coworkersMap = new Map();

            allSchedulesArrays.forEach((storeSchedules: any[]) => {
                const currentSchedule = storeSchedules.find((s: any) => {
                    const start = new Date(s.dateRange.startDate);
                    const end = new Date(s.dateRange.endDate);
                    start.setHours(0, 0, 0, 0);
                    end.setHours(23, 59, 59, 999);
                    return today >= start && today <= end;
                });

                if (currentSchedule) {
                    const todayNode = currentSchedule.days?.find((d: any) =>
                        new Date(d.date).toISOString().split('T')[0] === todayStr
                    );

                    const isMatch = (sDeptId: string) => {
                        if (!did) return true;
                        if (typeof did === 'string') return sDeptId === did;
                        if (did.$in) return did.$in.includes(sDeptId);
                        return false;
                    };

                    const relevantShifts = todayNode?.shifts?.filter((s: any) => isMatch((s.storeDepartmentId?._id || s.storeDepartmentId)?.toString()));
                    todayShiftsCount += relevantShifts?.reduce((acc: number, s: any) => acc + (s.employees?.length || 0), 0) || 0;

                    // Populate Global Coworkers
                    relevantShifts?.forEach((s: any) => {
                        s.employees?.forEach((e: any) => {
                            if (e._id?.toString() !== employee._id?.toString() && !coworkersMap.has(e._id?.toString())) {
                                coworkersMap.set(e._id?.toString(), {
                                    _id: e._id,
                                    slug: e.slug,
                                    firstName: e.firstName,
                                    lastName: e.lastName,
                                    image: e.image,
                                    position: e.contract?.employmentType || "Employee",
                                    storeName: currentSchedule.storeId?.name || "Global" // Add store context
                                });
                            }
                        });
                    });

                    currentSchedule.days?.forEach((day: any) => {
                        const shiftsToCalc = day.shifts?.filter((s: any) => isMatch((s.storeDepartmentId?._id || s.storeDepartmentId)?.toString()));
                        totalScheduledHours += shiftsToCalc?.reduce((acc: number, s: any) => {
                            if (!s.startTime || !s.endTime) return acc;
                            const [sh, sm] = s.startTime.split(':').map(Number);
                            const [eh, em] = s.endTime.split(':').map(Number);
                            let mins = (eh * 60 + em) - (sh * 60 + sm);
                            if (mins < 0) mins += 24 * 60; // Handle overnight shifts
                            mins -= (s.breakMinutes || 0);
                            const hours = Math.max(0, mins) / 60;
                            return acc + (hours * (s.employees?.length || 0));
                        }, 0) || 0;
                    });
                }
            });
            todaysCoworkers = Array.from(coworkersMap.values());
        }

        let statsTotal = 0;
        let statsVacation = 0;
        let statsCurrentActive = 0;

        if ((isGlobalDeptHead || isStoreDeptHead) && storeEmployeesOrStats && (storeEmployeesOrStats as any).employees) {
            const employees = (storeEmployeesOrStats as any).employees;
            statsTotal = globalHeadStats?.totalEmployees || employees.length;
            statsVacation = globalHeadStats?.onVacation || employees.filter((e: any) => e.status === 'vacation').length;
            statsCurrentActive = employees.filter((e: any) => e.active !== false).length;
        } else {
            statsTotal = globalHeadStats?.totalEmployees || (Array.isArray(storeEmployeesOrStats) ? storeEmployeesOrStats.length : (storeEmployeesOrStats as any).totalEmployees || 0);
            statsVacation = globalHeadStats?.onVacation || (Array.isArray(storeEmployeesOrStats) ? storeEmployeesOrStats.filter((e: any) => e.status === 'vacation').length : (storeEmployeesOrStats as any).onVacation || 0);
            statsCurrentActive = Array.isArray(storeEmployeesOrStats) ? storeEmployeesOrStats.filter((e: any) => e.active !== false).length : statsTotal;
        }

        const storeStats = {
            totalEmployees: statsTotal,
            onVacation: statsVacation,
            todayShifts: todayShiftsCount,
            totalHours: Math.round(totalScheduledHours * 10) / 10
        };

        let operationsScore = 100;
        let radarStatus: "optimal" | "warning" | "critical" = "optimal";
        const alerts: any[] = [];

        let targetStaffing = 0;
        let maxStaffing = 0;

        if (storeId && fetchedFullStore) {
            targetStaffing = (fetchedFullStore as any).minEmployees || 0;
            maxStaffing = (fetchedFullStore as any).maxEmployees || 999;
        } else {
            targetStaffing = stores.reduce((acc: number, s: any) => acc + (s.minEmployees || 0), 0);
            maxStaffing = stores.reduce((acc: number, s: any) => acc + (s.maxEmployees || 999), 0);
        }

        const staffingMetric = {
            label: (isGlobalDeptHead || isStoreDeptHead) ? "Dept Staffing" : (storeId ? "Store Staffing" : "Network Staffing"),
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

        let missingEntityNames: string[] = [];
        let missingEntityObjects: { id: string, name: string }[] = [];
        let nextWeekPublished = false;

        if (storeId) {
            const nextWeekSchedules = nextWeekDataOrSchedules as any[];
            const deptStatusMap = new Map();
            nextWeekSchedules.forEach((s: any) => {
                if (s.status === 'published' || s.status === 'approved') deptStatusMap.set(s.storeDepartmentId?._id?.toString() || s.storeDepartmentId?.toString(), true);
            });
            const missingDepts = (fetchedStoreDepts as any[]).filter((d: any) => d.active !== false && (!did || d._id.toString() === did) && !deptStatusMap.has(d._id.toString()));
            missingEntityObjects = missingDepts.map((d: any) => ({ id: d._id.toString(), name: d.name }));
            missingEntityNames = missingEntityObjects.map((d: any) => d.name);
            nextWeekPublished = missingEntityNames.length === 0;
        } else {
            const allNextWeekSchedules = nextWeekDataOrSchedules as any[];
            const fulfilledStoreIds = new Set(allNextWeekSchedules.map((s: any) => s.storeId.toString()));
            const missingStores = stores.filter((s: any) => s.active !== false && !fulfilledStoreIds.has(s._id.toString()));
            missingEntityObjects = missingStores.map((s: any) => ({ id: s._id.toString(), name: s.name }));
            missingEntityNames = missingEntityObjects.map((d: any) => d.name);
            nextWeekPublished = missingEntityNames.length === 0;
        }

        const currentDay = new Date().getDay();
        const daysUntilDeadline = deadlineDay - currentDay;
        const isOverdue = !nextWeekPublished && currentDay > deadlineDay;

        const scheduleHealth = { nextWeekPublished, daysUntilDeadline, overdue: isOverdue, missingEntities: missingEntityNames, missingEntityObjects };

        if (!nextWeekPublished && isOverdue) {
            operationsScore -= 15;
            radarStatus = radarStatus === "optimal" ? "warning" : radarStatus;
            const isManager = ["store_manager", "department_head", "store_department_head"].includes(viewRole);
            const entityLabel = did ? "Department" : (storeId ? "Departments" : "Stores");
            const listStr = missingEntityNames.slice(0, 3).join(", ") + (missingEntityNames.length > 3 ? ` +${missingEntityNames.length - 3} more` : "");
            alerts.push({ id: "sched-overdue", type: "warning", title: "Missing Schedules", message: `Next week's schedule missing for ${entityLabel}: ${listStr || "All"}.`, actionLabel: isManager ? "Create" : undefined, actionUrl: isManager ? "/dashboard/schedules" : undefined, meta: { missingEntities: missingEntityNames } });
        }

        const pendingRequests = mergeRequests(pendingVacations, pendingAbsences, pendingOvertime, pendingSchedules, pendingCoverage);
        if (pendingRequests.length > 5) {
            operationsScore -= 10;
            alerts.push({ id: "approval-queue", type: "info", title: "High Pending Volume", message: `${pendingRequests.length} requests waiting review.`, actionLabel: "Review", actionUrl: "#approvals" });
        }


        const operationsData = {
            score: Math.max(0, operationsScore),
            status: radarStatus,
            alerts,
            staffing: staffingMetric,
            scheduleHealth,
            metrics: {
                laborCost: Math.round(totalScheduledHours * 10) / 10,
                coverageGap: pendingCoverage.length
            }
        };

        const commonProps = {
            employee: JSON.parse(JSON.stringify(employee)),
            pendingRequests: JSON.parse(JSON.stringify(pendingRequests)),
            requests: JSON.parse(JSON.stringify({ vacations: pendingVacations, absences: pendingAbsences, overtime: pendingOvertime, schedules: pendingSchedules, coverage: pendingCoverage })),
            storeStats: JSON.parse(JSON.stringify(storeStats)),
            todaysCoworkers: JSON.parse(JSON.stringify(todaysCoworkers)),
            currentScheduleId,
            currentScheduleSlug,
            currentUserRole: viewRole,
            operationsData: JSON.parse(JSON.stringify(operationsData)),
            tasks: JSON.parse(JSON.stringify(tasks || [])),
            activeActions: JSON.parse(JSON.stringify(activeActions || { vacations: [], absences: [], coverageRequests: [], coverageOffers: [] })),
            personalTodos: JSON.parse(JSON.stringify(personalTodos || [])),
            swapRequests: JSON.parse(JSON.stringify(swapRequests || [])),
            currentUserRoles: allRoles,
            stores: JSON.parse(JSON.stringify(stores)),
            departments: JSON.parse(JSON.stringify(depts)),
            managers: JSON.parse(JSON.stringify(managers)),
            daysUntilNextDayOff: (employee as any).daysUntilNextDayOff,
            allEmployees: JSON.parse(JSON.stringify((storeEmployeesOrStats as any)?.employees || [])), // Pass full list for global overview
            storeRatings: JSON.parse(JSON.stringify(storeRatings || [])),
            weather: JSON.parse(JSON.stringify(weather || null))
        };

        if (viewRole === "store_department_head") {
            return <StoreDepartmentHeadDashboard {...commonProps} />;
        }

        if (viewRole === "department_head") {
            return <DepartmentHeadDashboard {...commonProps} />;
        }

        return <StoreManagerDashboard {...commonProps} />;
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
                isWorkingToday = todayNode.shifts.some((s: any) =>
                    s.employees?.some((e: any) => e._id === employee._id || e.toString() === employee._id)
                );

                if (isWorkingToday) {
                    const coworkersMap = new Map();
                    todayNode.shifts.forEach((s: any) => {
                        s.employees?.forEach((e: any) => {
                            if (e._id !== employee._id && !coworkersMap.has(e._id)) {
                                coworkersMap.set(e._id, {
                                    firstName: e.firstName,
                                    lastName: e.lastName,
                                    image: e.image,
                                    position: e.contract?.employmentType || "Employee",
                                    slug: e.slug || e._id
                                });
                            }
                        });
                    });
                    todaysCoworkers = Array.from(coworkersMap.values());
                } else {
                    todaysCoworkers = []; // Reset if not working
                }
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
        employee={JSON.parse(JSON.stringify(employee))}
        todaysCoworkers={JSON.parse(JSON.stringify(todaysCoworkers))}
        currentScheduleId={currentScheduleId}
        currentScheduleSlug={currentScheduleSlug}
        daysUntilNextDayOff={daysUntilNextDayOff}
        personalTodos={JSON.parse(JSON.stringify(personalTodos))}
        activeActions={JSON.parse(JSON.stringify(activeActions))}
        swapRequests={JSON.parse(JSON.stringify(swapRequests))}
        isWorkingToday={isWorkingToday}
        weather={JSON.parse(JSON.stringify(weather))}
    />;
}
