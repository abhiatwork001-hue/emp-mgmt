import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { FadeIn, FadeInRight, ScaleIn } from "@/components/dashboard/dashboard-animations";
import { Separator } from "@/components/ui/separator";
import { authOptions } from "@/lib/auth";
import { getEmployeeById, getEmployeesByStore, getAllEmployees } from "@/lib/actions/employee.actions";
import { getAllVacationRequests } from "@/lib/actions/vacation.actions";
import { getAllAbsenceRequests } from "@/lib/actions/absence.actions";
import { getPendingOvertimeRequests } from "@/lib/actions/overtime.actions";
import { getPendingSchedules } from "@/lib/actions/schedule.actions";
import { getEmployeeScheduleView, getScheduleById } from "@/lib/actions/schedule.actions";
import { EmployeeDashboard } from "@/components/dashboard/role-views/employee-dashboard";
import { StoreManagerDashboard } from "@/components/dashboard/role-views/store-manager-dashboard";
import { DepartmentHeadDashboard } from "@/components/dashboard/role-views/department-head-dashboard";
import { StoreDepartmentHeadDashboard } from "@/components/dashboard/role-views/store-department-head-dashboard";
import { RoleSwitcher } from "@/components/dashboard/role-switcher";
import { getTasksForUser } from "@/lib/actions/task.actions";
import { getAllStores, getStoreDepartments } from "@/lib/actions/store.actions";
import { getAllGlobalDepartments } from "@/lib/actions/department.actions";
import { TaskBoard } from "@/components/tasks/task-board";
import { StoreTaskProgress } from "@/components/tasks/store-task-progress";
import { getNotes } from "@/lib/actions/personal-todo.actions";
import { PersonalTodoWidget } from "@/components/dashboard/personal-todo-widget";
import { ReminderWidget } from "@/components/reminders/reminder-widget";
import { CreateReminderDialog } from "@/components/reminders/create-reminder-dialog";
import { NoticeBoard } from "@/components/notices/notice-board";
import { CreateNoticeDialog } from "@/components/notices/create-notice-dialog";
import { getSwapRequests } from "@/lib/actions/shift-swap.actions";
import { SwapRequestsWidget } from "@/components/dashboard/swap-requests-widget";
import { getTranslations } from "next-intl/server";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { RecentActivityWidget } from "@/components/dashboard/recent-activity-widget";

// Helper to merge requests sort by date
function mergeRequests(vacations: any[], absences: any[], overtime: any[], schedules: any[]) {
    const all = [
        ...vacations.map(v => ({ ...v, type: 'vacation' })),
        ...absences.map(a => ({ ...a, type: 'absence' })),
        ...overtime.map(o => ({ ...o, type: 'overtime' })),
        ...schedules.map(s => ({ ...s, type: 'schedule' }))
    ];
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

interface DashboardPageProps {
    searchParams: { [key: string]: string | string[] | undefined };
}

export default async function DashboardPage(props: DashboardPageProps) {
    const searchParams = await props.searchParams;
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const employee = await getEmployeeById((session.user as any).id);
    if (!employee) {
        redirect("/api/auth/signout?callbackUrl=/login");
    }

    // Determine Role & Dashboard Type
    const directRoles = employee.roles || [];
    const positionRoles = employee.positionId?.roles?.map((r: any) => r.name) || [];
    const allRolesRaw = [...new Set([...directRoles, ...positionRoles])];

    // Normalize to match Sidebar/Permission keys
    // Normalize to match Sidebar/Permission keys
    const normalize = (r: any) => {
        if (!r) return "";
        if (typeof r === "object" && r.name) return r.name.toLowerCase().replace(/ /g, "_");
        if (typeof r === "string") return r.toLowerCase().replace(/ /g, "_");
        return String(r).toLowerCase();
    };
    const allRoles = allRolesRaw.map(normalize).filter(Boolean);

    const isOwner = allRoles.includes("owner");
    const isAdmin = allRoles.includes("admin");
    const canSwitchRoles = allRoles.includes("tech");

    // Check for role override
    const testRoleParam = canSwitchRoles && searchParams?.testRole;
    const testRole = testRoleParam
        ? (Array.isArray(testRoleParam) ? testRoleParam[0] : testRoleParam)
        : null;

    // Determine effective role for rendering
    let viewRole = "employee";
    if (testRole) {
        viewRole = testRole;
    } else {
        // Priority Based View Selection
        if (allRoles.includes("super_user")) viewRole = "super_user";
        else if (allRoles.includes("tech")) viewRole = "tech";
        else if (isOwner) viewRole = "owner";
        else if (isAdmin) viewRole = "admin";
        else if (allRoles.includes("hr")) viewRole = "hr";
        else if (allRoles.includes("store_manager")) viewRole = "store_manager";
        else if (allRoles.includes("department_head")) viewRole = "department_head";
        else if (allRoles.includes("store_department_head")) viewRole = "store_department_head";
    }

    // --- Task System Data Fetching ---
    const tasks = await getTasksForUser((session.user as any).id);
    const personalTodos = await getNotes((session.user as any).id);
    const swapRequests = await getSwapRequests((session.user as any).id);

    const stores = await getAllStores();
    const depts = await getAllGlobalDepartments();
    const managers = await getAllEmployees({});

    // Fetch Store Departments if viewing as Store Manager
    let localStoreDepartments: any[] = [];
    if (viewRole === "store_manager") {
        const storeId = employee.storeId?._id || employee.storeId;
        if (storeId) {
            localStoreDepartments = await getStoreDepartments(storeId.toString());
        }
    }

    // Render Helper
    async function renderDashboard() {
        if (["owner", "admin", "hr", "super_user", "store_manager", "tech"].includes(viewRole)) {
            // FORCE Global View for high-level roles unless they explicitly switched to "store_manager"
            // If viewRole is "store_manager", we respect their storeId.
            // For others (Admin, Owner, etc.), we ignore their personal storeId to show Network stats.
            const isStoreLevelRole = viewRole === "store_manager" || viewRole === "store_department_head";
            const rawStoreId = employee.storeId?._id || employee.storeId;
            const storeId = isStoreLevelRole ? rawStoreId : undefined;

            const sid = storeId ? storeId.toString() : undefined;

            let pendingVacations = await getAllVacationRequests({ status: 'pending', storeId: sid });
            let pendingAbsences = await getAllAbsenceRequests({ status: 'pending', storeId: sid });
            let pendingOvertime = await getPendingOvertimeRequests({ storeId: sid });
            let pendingSchedules = await getPendingSchedules(sid);

            const storeEmployees = storeId
                ? await getEmployeesByStore(storeId)
                : await getAllEmployees({});

            // Fetch current schedule to count shifts
            let todayShiftsCount = 0;
            let currentScheduleId = null;
            let currentScheduleSlug = null;
            let todaysCoworkers: any[] = [];

            if (storeId) {
                const { getSchedules } = require("@/lib/actions/schedule.actions");
                const storeSchedules = await getSchedules(storeId);
                const today = new Date();
                const currentSchedule = storeSchedules.find((s: any) => {
                    const start = new Date(s.dateRange.startDate);
                    const end = new Date(s.dateRange.endDate);
                    return today >= start && today <= end;
                });

                if (currentSchedule) {
                    currentScheduleId = currentSchedule._id;
                    currentScheduleSlug = currentSchedule.slug;
                    const todayStr = today.toISOString().split('T')[0];
                    const todayNode = currentSchedule.days?.find((d: any) =>
                        new Date(d.date).toISOString().split('T')[0] === todayStr
                    );
                    if (todayNode) {
                        todayShiftsCount = todayNode.shifts?.reduce((acc: number, s: any) => acc + (s.employees?.length || 0), 0) || 0;

                        // Populate coworkers for manager
                        if (viewRole === "store_manager") {
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
                }
            } else {
                // Global View - Aggregate today's shifts across all stores
                const { getSchedules } = require("@/lib/actions/schedule.actions");
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];

                // Fetch schedules for all stores in parallel for speed
                const allSchedulesArrays = await Promise.all(stores.map((s: any) => getSchedules(s._id.toString())));

                allSchedulesArrays.forEach(storeSchedules => {
                    const currentSchedule = storeSchedules.find((s: any) => {
                        const start = new Date(s.dateRange.startDate);
                        const end = new Date(s.dateRange.endDate);
                        return today >= start && today <= end;
                    });

                    if (currentSchedule) {
                        const todayNode = currentSchedule.days?.find((d: any) =>
                            new Date(d.date).toISOString().split('T')[0] === todayStr
                        );
                        if (todayNode) {
                            todayShiftsCount += todayNode.shifts?.reduce((acc: number, s: any) => acc + (s.employees?.length || 0), 0) || 0;
                        }
                    }
                });
            }

            const storeStats = {
                totalEmployees: Array.isArray(storeEmployees) ? storeEmployees.length : 0,
                onVacation: Array.isArray(storeEmployees) ? storeEmployees.filter((e: any) => e.status === 'vacation').length : 0,
                todayShifts: todayShiftsCount
            };

            // --- Operations Radar Calculation ---
            let operationsScore = 100;
            let radarStatus: "optimal" | "warning" | "critical" = "optimal";
            const alerts: any[] = [];

            // 1. Staffing Metrics
            // Fetch fresh store data for settings
            const { getStoreById } = require("@/lib/actions/store.actions");
            const fullStore = storeId ? await getStoreById(storeId.toString()) : null;

            // Aggregate targets if global
            let targetStaffing = 0;
            let maxStaffing = 0;

            if (storeId && fullStore) {
                targetStaffing = fullStore.minEmployees || 0;
                maxStaffing = fullStore.maxEmployees || 999;
            } else {
                // Network View - Sum of all stores
                targetStaffing = stores.reduce((acc: number, s: any) => acc + (s.minEmployees || 0), 0);
                maxStaffing = stores.reduce((acc: number, s: any) => acc + (s.maxEmployees || 999), 0);
            }

            const staffingMetric = {
                label: storeId ? "Store Staffing" : "Network Staffing",
                current: Array.isArray(storeEmployees) ? storeEmployees.filter((e: any) => e.active !== false).length : 0,
                target: targetStaffing,
                min: targetStaffing,
                max: maxStaffing
            };

            // Eval Staffing
            if (staffingMetric.current < staffingMetric.min) {
                operationsScore -= 20;
                radarStatus = "critical";
                alerts.push({
                    id: "staff-critical",
                    type: "critical",
                    title: "Understaffed",
                    message: `Current staff (${staffingMetric.current}) is below minimum (${staffingMetric.min}).`,
                    actionLabel: "Recruit",
                    actionUrl: "/dashboard/employees"
                });
            } else if (staffingMetric.max && staffingMetric.current > staffingMetric.max) {
                operationsScore -= 10;
                radarStatus = "warning";
                alerts.push({
                    id: "staff-limit",
                    type: "warning",
                    title: "Overstaffed",
                    message: `Exceeds max limit of ${staffingMetric.max} employees.`
                });
            }

            // 2. Schedule Health & Smart Alerts
            // Check next week
            const nextWeekDate = new Date();
            nextWeekDate.setDate(nextWeekDate.getDate() + 7);
            const { getISOWeekNumber } = require("@/lib/utils");
            const nextWeekISO = getISOWeekNumber(nextWeekDate);

            // Let's grab store schedules here to be safe and comprehensive
            const { getSchedules } = require("@/lib/actions/schedule.actions");
            const allStoreSchedules = storeId ? await getSchedules(storeId) : [];

            // Advanced Alert Logic: Identify SPECIFIC missing entities
            let missingEntityNames: string[] = [];
            let nextWeekPublished = false;

            if (storeId) {
                // Store Manager View: Check Departments
                const storeDepts = await getStoreDepartments(storeId.toString());
                const nextWeekSchedules = await getSchedules(storeId, undefined, nextWeekISO.year, nextWeekISO.week);

                // Map of Dept ID -> Schedule Status
                const deptStatusMap = new Map();
                nextWeekSchedules.forEach((s: any) => {
                    if (s.status === 'published' || s.status === 'approved') {
                        deptStatusMap.set(s.storeDepartmentId?._id?.toString() || s.storeDepartmentId?.toString(), true);
                    }
                });

                missingEntityNames = storeDepts
                    .filter((d: any) => d.active !== false && !deptStatusMap.has(d._id.toString()))
                    .map((d: any) => d.name);

                nextWeekPublished = missingEntityNames.length === 0;

            } else {
                // Network View (Owner/HR): Check Stores
                // We need to fetch next week's schedules for ALL stores
                // Optimization: Fetch all schedules for next week across the company
                const { Schedule } = require("@/lib/models");
                const allNextWeekSchedules = await Schedule.find({
                    year: nextWeekISO.year,
                    weekNumber: nextWeekISO.week,
                    status: { $in: ['published', 'approved'] }
                }).select('storeId').lean();

                const fulfilledStoreIds = new Set(allNextWeekSchedules.map((s: any) => s.storeId.toString()));

                missingEntityNames = stores
                    .filter((s: any) => s.active !== false && !fulfilledStoreIds.has(s._id.toString()))
                    .map((s: any) => s.name);

                nextWeekPublished = missingEntityNames.length === 0;
            }

            const scheduleHealth = {
                nextWeekPublished,
                daysUntilDeadline: 2,
                overdue: !nextWeekPublished && new Date().getDay() > 2,
                missingEntities: missingEntityNames // Pass this data down
            };

            if (!nextWeekPublished) {
                if (new Date().getDay() > 2) { // Late in week
                    operationsScore -= 15;
                    radarStatus = radarStatus === "optimal" ? "warning" : radarStatus;

                    // Context-Aware Alert Actions
                    const isManager = ["store_manager", "department_head", "store_department_head"].includes(viewRole);
                    const entityLabel = storeId ? "Departments" : "Stores";
                    const listStr = missingEntityNames.slice(0, 3).join(", ") + (missingEntityNames.length > 3 ? ` +${missingEntityNames.length - 3} more` : "");

                    alerts.push({
                        id: "sched-overdue",
                        type: "warning",
                        title: "Missing Schedules",
                        message: `Next week's schedule missing for ${entityLabel}: ${listStr || "All"}.`,
                        // Only show "Create" action link to roles that actually MAKE the schedule
                        actionLabel: isManager ? "Create" : undefined,
                        actionUrl: isManager ? "/dashboard/schedules" : undefined,
                        meta: { missingEntities: missingEntityNames } // Pass full list for widget to render
                    });
                }
            }

            // 3. Approval Queue
            const pendingRequests = mergeRequests(pendingVacations, pendingAbsences, pendingOvertime, pendingSchedules);
            const totalPendingCount = pendingRequests.length;
            if (totalPendingCount > 5) {
                operationsScore -= 10;
                alerts.push({
                    id: "approval-queue",
                    type: "info",
                    title: "High Pending Volume",
                    message: `${totalPendingCount} requests waiting review.`,
                    actionLabel: "Review",
                    actionUrl: "#approvals" // Anchor to widget
                });
            }

            const operationsData = {
                score: Math.max(0, operationsScore),
                status: radarStatus,
                alerts,
                staffing: staffingMetric,
                scheduleHealth
            };

            const defaultOperationsData = {
                score: 100,
                status: "optimal" as const,
                alerts: [],
                staffing: { label: "Network Staffing", current: 0, target: 0, min: 0, max: 0 },
                scheduleHealth: { nextWeekPublished: true, daysUntilDeadline: 0, overdue: false, missingEntities: [] }
            };

            return <StoreManagerDashboard
                employee={employee}
                pendingRequests={pendingRequests}
                requests={{
                    vacations: pendingVacations,
                    absences: pendingAbsences,
                    overtime: pendingOvertime,
                    schedules: pendingSchedules
                }}
                storeStats={storeStats}
                todaysCoworkers={todaysCoworkers}
                currentScheduleId={currentScheduleId}
                currentScheduleSlug={currentScheduleSlug}
                currentUserRole={viewRole}
                operationsData={operationsData || defaultOperationsData}
                tasks={JSON.parse(JSON.stringify(tasks))}
                personalTodos={personalTodos}
                swapRequests={swapRequests}
                stores={JSON.parse(JSON.stringify(stores))}
                departments={JSON.parse(JSON.stringify(depts))}
                managers={JSON.parse(JSON.stringify(managers))}
            />;
        }

        if (viewRole === "department_head") {
            const pendingVacations = await getAllVacationRequests({ status: 'pending' });
            const pendingAbsences = await getAllAbsenceRequests({ status: 'pending' });
            const pendingRequests = mergeRequests(pendingVacations, pendingAbsences, [], []);

            const allEmployees = await getAllEmployees({});
            const deptStats = {
                totalEmployees: allEmployees.length,
                onVacation: allEmployees.filter((e: any) => e.status === 'vacation').length,
                todayShifts: 0 // Deep calculation needed for global head, defaulting to 0 for now
            };

            return <DepartmentHeadDashboard employee={employee} pendingRequests={pendingRequests} deptStats={deptStats} />;
        }

        if (viewRole === "store_department_head") {
            const deptId = employee.storeDepartmentId?._id || employee.storeDepartmentId;
            let pendingVacations = await getAllVacationRequests({ status: 'pending' });
            let pendingAbsences = await getAllAbsenceRequests({ status: 'pending' });

            if (deptId) {
                pendingVacations = pendingVacations.filter((r: any) => r.employeeId?.storeDepartmentId === deptId);
                pendingAbsences = pendingAbsences.filter((r: any) => r.employeeId?.storeDepartmentId === deptId);
            }

            const pendingRequests = mergeRequests(pendingVacations, pendingAbsences, [], []);
            const deptEmployees = await getAllEmployees({ storeDepartmentId: deptId });
            const deptStats = {
                totalEmployees: deptEmployees.length,
                onVacation: deptEmployees.filter((e: any) => e.status === 'vacation').length,
                todayShifts: 0 // Calculate if needed
            };

            return <StoreDepartmentHeadDashboard employee={employee} pendingRequests={pendingRequests} deptStats={deptStats} />;
        }

        // Fetch Schedule & Coworkers for Employee View
        const today = new Date();
        const scheduleData = await getEmployeeScheduleView(employee._id, today);
        let todaysCoworkers: any[] = [];
        let currentScheduleId = null;
        let currentScheduleSlug = null;

        if (scheduleData && scheduleData.days) {
            // Find today's shifts
            const todayStr = today.toISOString().split('T')[0];
            const todayDay = scheduleData.days.find((d: any) => new Date(d.date).toISOString().split('T')[0] === todayStr);

            if (todayDay) {
                // Logic maintained for employee view...
            }
        }

        // Alternative: Fetch store schedule for this week
        const { getSchedules } = require("@/lib/actions/schedule.actions");
        const storeSchedules = await getSchedules(employee.storeId?._id || employee.storeId);

        // Find schedule that covers today
        const todayForSchedule = new Date();
        const currentSchedule = storeSchedules.find((s: any) => {
            const start = new Date(s.dateRange.startDate);
            const end = new Date(s.dateRange.endDate);
            // Ensure end date includes the full day (set to 23:59:59 if needed, or rely on date comparison if dates are stored as start of day)
            // Usually best to check if today is between start and end.
            return todayForSchedule >= start && todayForSchedule <= end;
        }) || (storeSchedules.length > 0 ? storeSchedules[0] : null);

        if (currentSchedule) {
            currentScheduleId = currentSchedule._id;
            currentScheduleSlug = currentSchedule.slug;
            // Extract coworkers from today's shifts in this schedule
            const todayDate = new Date();
            const todayStr = todayDate.toISOString().split('T')[0];
            const todayNode = currentSchedule.days?.find((d: any) => new Date(d.date).toISOString().split('T')[0] === todayStr);

            if (todayNode) {
                const allShiftEmployees = new Set();
                todayNode.shifts.forEach((s: any) => {
                    s.employees?.forEach((e: any) => allShiftEmployees.add(e._id || e));
                });
            }
        }

        // For efficiency, I will simply pass `currentScheduleId` for the link.
        // For coworkers, I will defer or skip deep fetching to avoid perf hit unless requested strictly.
        // The user said "working with you today working from database". So I SHOULD fetch it.
        // I will use `getScheduleById` if a schedule is found.
        if (currentScheduleId) {
            const fullSchedule = await import("@/lib/actions/schedule.actions").then(m => m.getScheduleById(currentScheduleId));
            if (fullSchedule) {
                const todayDate = new Date();
                const todayStr = todayDate.toISOString().split('T')[0];
                const todayNode = fullSchedule.days?.find((d: any) => new Date(d.date).toISOString().split('T')[0] === todayStr);
                if (todayNode) {
                    const coworkersMap = new Map();
                    todayNode.shifts.forEach((s: any) => {
                        // Check if current user is in this shift? Or just anyone working today?
                        // "Working with you" implies same shift or same day.
                        // Let's show everyone working in the department today.
                        s.employees?.forEach((e: any) => {
                            if (e._id !== employee._id && !coworkersMap.has(e._id)) {
                                coworkersMap.set(e._id, { firstName: e.firstName, lastName: e.lastName, position: e.contract?.employmentType || "Employee" }); // Position isn't always populated perfectly in nested, checking `getScheduleById`... it populates `employees` with `firstName lastName image positionId`.
                            }
                        });
                    });
                    todaysCoworkers = Array.from(coworkersMap.values()).slice(0, 3); // Top 3
                }
            }
        }

        // Calculate Days Until Next Day Off
        let daysUntilNextDayOff = -1;
        if (scheduleData && scheduleData.days) {
            const todayDate = new Date();
            todayDate.setHours(0, 0, 0, 0);

            // Sort days just in case
            const sortedDays = scheduleData.days.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // Find first day >= today with NO shifts
            const dayOff = sortedDays.find((d: any) => {
                const dDate = new Date(d.date);
                dDate.setHours(0, 0, 0, 0);
                return dDate >= todayDate && (!d.shifts || d.shifts.length === 0);
            });

            if (dayOff) {
                const dDate = new Date(dayOff.date);
                dDate.setHours(0, 0, 0, 0);
                const diffTime = Math.abs(dDate.getTime() - todayDate.getTime());
                daysUntilNextDayOff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            } else {
                daysUntilNextDayOff = 7; // Placeholder for "Not this week"
            }
        }

        return <EmployeeDashboard
            employee={employee}
            todaysCoworkers={todaysCoworkers}
            currentScheduleId={currentScheduleId}
            currentScheduleSlug={currentScheduleSlug}
            daysUntilNextDayOff={daysUntilNextDayOff}
            personalTodos={personalTodos}
        />;
    }

    const t = await getTranslations("Common");

    // UI Visiblity Control
    const isPrivileged = ["admin", "hr", "owner", "super_user", "tech"].includes(viewRole);
    // Recent Activity Only for Privileged Roles
    const showRecentActivity = isPrivileged;
    // Unified Sidebar logic: Always show utility sidebar for better visual density and quick access
    const showSidebar = true;

    const dashboardContent = await renderDashboard();

    // Roles that use the new Unified Dashboard structure
    const shouldUseNewLayout = ["owner", "admin", "hr", "super_user", "store_manager", "tech", "department_head", "store_department_head"].includes(viewRole);

    if (shouldUseNewLayout) {
        return (
            <div className="min-h-screen bg-transparent">
                <div className="space-y-4 p-4 md:p-8 max-w-[98%] mx-auto relative z-10">
                    <FadeIn y={-20}>
                        <DashboardHeader
                            session={session}
                            viewRole={viewRole}
                            employee={employee}
                            stores={stores}
                            depts={depts}
                            localStoreDepartments={localStoreDepartments}
                            canSwitchRoles={canSwitchRoles}
                        />
                    </FadeIn>
                    <div className="mt-2">
                        {dashboardContent}
                    </div>
                </div>
            </div>
        );
    }

    // Fallback for basic Employee View (already has its own internal structure in EmployeeDashboard)
    return (
        <div className="min-h-screen bg-transparent">
            <div className="space-y-4 p-4 md:p-8 max-w-[1600px] mx-auto relative z-10">
                <DashboardHeader
                    session={session}
                    viewRole={viewRole}
                    employee={employee}
                    stores={stores}
                    depts={depts}
                    localStoreDepartments={localStoreDepartments}
                    canSwitchRoles={canSwitchRoles}
                />
                <div className="mt-6">
                    {dashboardContent}
                </div>
            </div>
        </div>
    );
}
