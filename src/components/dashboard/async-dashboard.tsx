import { getTranslations } from 'next-intl/server';
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
import { Schedule, Company, Notice } from "@/lib/models"; // Import Company and Notice
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
    const t = await getTranslations('Dashboard.alerts');
    const tc = await getTranslations('Common');
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
        // Dual Role Logic: If user is HR/Admin BUT also a Store Manager, we want to fetch their store data context.
        const isStoreManagerRole = allRoles.includes("store_manager");
        // Force store-level context if they are a Store Manager, regardless of current viewRole (unless explicitly viewing another store as Admin? No, focus on "My Focused Area")
        // Actually, if viewRole is 'hr', they see HR dash. But we want to inject "My Store" widgets or data.
        // For now, let's ensure we FETCH the store-specific data if they have a storeId.

        const isStoreLevelRole = ["store_manager", "store_department_head"].includes(viewRole) || (isStoreManagerRole && !!employee.storeId);
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
            did ? getAllEmployees({ storeDepartmentId: did }, 1, 10000) : (sid ? getEmployeesByStore(sid) : getEmployeeStats({})),
            Company.findOne({ active: true }).select('settings.scheduleRules').lean(),
            getEmployeeScheduleView(employee._id, new Date()),
            did ? getEmployeeStats({ storeDepartmentId: did }) : Promise.resolve(null)
        ];

        // Add store-specific details if storeId exists
        if (storeId) {
            promises.push(getSchedulesLib(sid));
            promises.push(getStoreById(sid));
            promises.push(getStoreDepartments(sid));
            promises.push(getSchedulesLib(sid, undefined, nextWeekISO.year, nextWeekISO.week));
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
                if (s.status === 'published' || s.status === 'approved') {
                    // Robustly handle populated or unpopulated ID
                    const sid = s.storeDepartmentId ? (s.storeDepartmentId._id || s.storeDepartmentId).toString() : null;
                    if (sid) deptStatusMap.set(sid, true);
                }
            });
            // Fix: Filter departments that are ACTIVE and match current context
            const missingDepts = (fetchedStoreDepts as any[]).filter((d: any) => {
                const isActive = d.active !== false;
                const isContextMatch = !did || d._id.toString() === did;
                const isDone = deptStatusMap.has(d._id.toString());
                return isActive && isContextMatch && !isDone;
            });
            missingEntityObjects = missingDepts.map((d: any) => ({ id: d._id.toString(), name: d.name }));
            missingEntityNames = missingEntityObjects.map((d: any) => d.name);
            nextWeekPublished = missingEntityNames.length === 0;
        } else {
            // Global View (Check Stores)
            // We need to check if ALL departments in a store are published to consider the store "Done"?
            // Or just check if "Store" has "Schedule"?
            // Current logic checked "StoreId" in schedule list.
            // But schedules are per DEPARTMENT.
            // So logic: A store is missing if ANY of its active departments is missing a schedule.
            // This is heavy. Simplified: Check if store has ANY relevant schedule?
            // "missingEntity" here is "Stores".
            // Let's rely on the previous logic which checked if storeId was present in the list of "Approved/Published" schedules.
            // BUT a store might have 5 depts, and only 1 published.
            // For Global Admin, maybe just flagging "Stores causing alerts" is enough.
            // Let's refine: If a store has NO schedules at all, it's definitely missing.
            // If it has some, maybe partial.
            // Restoring previous simple logic for now but ensuring status is checked.
            const allNextWeekSchedules = nextWeekDataOrSchedules as any[];
            const fulfilledStoreIds = new Set(allNextWeekSchedules
                .filter((s: any) => s.status === 'published' || s.status === 'approved')
                .map((s: any) => s.storeId?._id?.toString() || s.storeId?.toString()));

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
            const entityLabel = did ? tc('department') : (storeId ? tc('departments') : tc('stores'));
            const listStr = missingEntityNames.slice(0, 3).join(", ") + (missingEntityNames.length > 3 ? ` +${missingEntityNames.length - 3} more` : "");
            alerts.push({ id: "sched-overdue", type: "warning", title: t('missingSchedulesTitle'), message: t('missingSchedulesMessage', { entity: entityLabel, list: listStr || tc('all') }), actionLabel: isManager ? t('createAction') : undefined, actionUrl: isManager ? "/dashboard/schedules" : undefined, meta: { missingEntities: missingEntityNames } });
        }

        const pendingRequests = mergeRequests(pendingVacations, pendingAbsences, pendingOvertime, pendingSchedules, pendingCoverage);
        if (pendingRequests.length > 5) {
            operationsScore -= 10;
            alerts.push({ id: "approval-queue", type: "info", title: t('highPendingTitle'), message: t('highPendingMessage', { count: pendingRequests.length }), actionLabel: t('reviewAction'), actionUrl: "#approvals" });
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

        // HR Dashboard - New Priority-Based Layout
        if (viewRole === "hr") {
            const { HRDashboard } = await import("@/components/dashboard/hr/hr-dashboard");

            // Map data to HR Dashboard props
            const hrProps = {
                employee: commonProps.employee,

                // A. Action Required Data - Pass full arrays for the new widget
                vacationRequests: pendingVacations,
                absenceRequests: pendingAbsences,
                overtimeRequests: pendingOvertime,
                scheduleConflicts: [], // TODO: Calculate from schedule data
                coverageRequests: pendingCoverage,

                // B. Staffing Risk Data
                understaffedToday: [], // TODO: Calculate from schedule vs required staff
                understaffedTomorrow: [],
                overlappingVacations: [], // TODO: Calculate from approved vacations
                sickLeaveImpact: [], // TODO: Calculate from absences

                // C. Today at a Glance Data
                workingCount: todayShiftsCount,
                absentCount: pendingAbsences.filter((a: any) => {
                    const absenceDate = new Date(a.date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    absenceDate.setHours(0, 0, 0, 0);
                    return absenceDate.getTime() === today.getTime() && a.status === 'approved';
                }).length,
                vacationCount: storeStats.onVacation,

                // D. Upcoming Events Data - Query approved vacations/absences for next 14 days
                upcomingEvents: await (async () => {
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    const fourteenDaysFromNow = new Date(now);
                    fourteenDaysFromNow.setDate(now.getDate() + 14);

                    const { VacationRequest, AbsenceRequest } = require('@/lib/models');

                    // Get approved vacations starting in next 14 days
                    const upcomingVacations = await VacationRequest.find({
                        status: 'approved',
                        requestedFrom: {
                            $gte: now,
                            $lte: fourteenDaysFromNow
                        }
                    })
                        .populate('employeeId', 'firstName lastName')
                        .populate({
                            path: 'employeeId',
                            populate: {
                                path: 'storeDepartmentId',
                                select: 'name'
                            }
                        })
                        .lean();

                    // Get approved absences in next 14 days
                    const upcomingAbsences = await AbsenceRequest.find({
                        status: 'approved',
                        date: {
                            $gte: now,
                            $lte: fourteenDaysFromNow
                        }
                    })
                        .populate('employeeId', 'firstName lastName')
                        .populate({
                            path: 'employeeId',
                            populate: {
                                path: 'storeDepartmentId',
                                select: 'name'
                            }
                        })
                        .lean();

                    return [
                        ...upcomingVacations.map((v: any) => ({
                            date: new Date(v.requestedFrom),
                            type: 'vacation' as const,
                            employee: `${v.employeeId?.firstName || ''} ${v.employeeId?.lastName || ''}`.trim(),
                            department: v.employeeId?.storeDepartmentId?.name || ''
                        })),
                        ...upcomingAbsences.map((a: any) => ({
                            date: new Date(a.date),
                            type: 'absence' as const,
                            employee: `${a.employeeId?.firstName || ''} ${a.employeeId?.lastName || ''}`.trim(),
                            department: a.employeeId?.storeDepartmentId?.name || ''
                        }))
                    ].sort((a, b) => a.date.getTime() - b.date.getTime());
                })(),

                // E. Compliance Data
                expiringDocs: 0, // TODO: Calculate from employee documents
                missingContracts: 0, // TODO: Calculate from employees without contracts
                incompleteProfiles: 0, // TODO: Calculate from employees with missing data
                urgentComplianceCount: 0,

                // F. Insights Data - Generate from real data with department breakdown
                vacationData: await (async () => {
                    const currentYear = new Date().getFullYear();
                    const lastYear = currentYear - 1;
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

                    const { VacationRequest } = require('@/lib/models');

                    // Get this year's data with department breakdown
                    const thisYearData = await VacationRequest.aggregate([
                        {
                            $match: {
                                status: 'approved',
                                requestedFrom: {
                                    $gte: new Date(currentYear, 0, 1),
                                    $lt: new Date(currentYear + 1, 0, 1)
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: 'employees',
                                localField: 'employeeId',
                                foreignField: '_id',
                                as: 'employee'
                            }
                        },
                        { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: 'storedepartments',
                                localField: 'employee.storeDepartmentId',
                                foreignField: '_id',
                                as: 'department'
                            }
                        },
                        { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
                        {
                            $group: {
                                _id: {
                                    month: { $month: '$requestedFrom' },
                                    department: '$department.name'
                                },
                                days: { $sum: '$totalDays' }
                            }
                        }
                    ]);

                    const lastYearData = await VacationRequest.aggregate([
                        {
                            $match: {
                                status: 'approved',
                                requestedFrom: {
                                    $gte: new Date(lastYear, 0, 1),
                                    $lt: new Date(currentYear, 0, 1)
                                }
                            }
                        },
                        {
                            $group: {
                                _id: { $month: '$requestedFrom' },
                                days: { $sum: '$totalDays' }
                            }
                        }
                    ]);

                    // Organize data by month with department breakdown
                    const monthlyData = new Map();
                    thisYearData.forEach((d: any) => {
                        const month = d._id.month;
                        if (!monthlyData.has(month)) {
                            monthlyData.set(month, { thisYear: 0, departments: [] });
                        }
                        const data = monthlyData.get(month);
                        data.thisYear += d.days;
                        if (d._id.department) {
                            data.departments.push({ department: d._id.department, days: d.days });
                        }
                    });

                    const lastYearMap = new Map(lastYearData.map((d: any) => [d._id, d.days]));

                    return months.map((month, index): { month: string; thisYear: number; lastYear: number; departments: any[] } => {
                        const data = monthlyData.get(index + 1) || { thisYear: 0, departments: [] };
                        return {
                            month,
                            thisYear: data.thisYear as number,
                            lastYear: (lastYearMap.get(index + 1) || 0) as number,
                            departments: data.departments as any[]
                        };
                    });
                })(),

                absenceData: await (async () => {
                    const currentYear = new Date().getFullYear();
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

                    const { AbsenceRequest } = require('@/lib/models');
                    const absenceStats = await AbsenceRequest.aggregate([
                        {
                            $match: {
                                status: 'approved',
                                date: {
                                    $gte: new Date(currentYear, 0, 1),
                                    $lt: new Date(currentYear + 1, 0, 1)
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: 'employees',
                                localField: 'employeeId',
                                foreignField: '_id',
                                as: 'employee'
                            }
                        },
                        { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: 'storedepartments',
                                localField: 'employee.storeDepartmentId',
                                foreignField: '_id',
                                as: 'department'
                            }
                        },
                        { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
                        {
                            $group: {
                                _id: {
                                    month: { $month: '$date' },
                                    department: '$department.name'
                                },
                                count: { $sum: 1 }
                            }
                        }
                    ]);

                    // Organize data by month with department breakdown
                    const monthlyData = new Map();
                    absenceStats.forEach((d: any) => {
                        const month = d._id.month;
                        if (!monthlyData.has(month)) {
                            monthlyData.set(month, { days: 0, departments: [] });
                        }
                        const data = monthlyData.get(month);
                        data.days += d.count;
                        if (d._id.department) {
                            data.departments.push({ department: d._id.department, days: d.count });
                        }
                    });

                    return months.map((month, index) => {
                        const data = monthlyData.get(index + 1) || { days: 0, departments: [] };
                        return {
                            month,
                            days: data.days,
                            departments: data.departments
                        };
                    });
                })(),

                // G. Announcements Data - Fetch multiple for carousel
                announcements: await Notice.find({})
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .select('_id title createdAt urgent')
                    .lean()
                    .then((notices: any[]) => notices.map(notice => ({
                        id: notice._id.toString(),
                        title: notice.title,
                        createdAt: notice.createdAt,
                        isUrgent: notice.urgent || false
                    })))
            };

            return <HRDashboard {...hrProps} />;
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
