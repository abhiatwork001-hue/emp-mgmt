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
        return <div className="p-8 text-white">Employee record not found. Please contact admin.</div>;
    }

    // Determine Role & Dashboard Type
    const directRoles = employee.roles || [];
    const positionRoles = employee.positionId?.roles?.map((r: any) => r.name) || [];
    const allRolesRaw = [...new Set([...directRoles, ...positionRoles])];

    // Normalize to match Sidebar/Permission keys
    const normalize = (r: string) => r.toLowerCase().replace(/ /g, "_");
    const allRoles = allRolesRaw.map(normalize);

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
        if (["owner", "admin", "hr", "super_user", "store_manager"].includes(viewRole)) {
            const storeId = employee.storeId?._id || employee.storeId;
            let pendingVacations = await getAllVacationRequests({ status: 'pending' });
            let pendingAbsences = await getAllAbsenceRequests({ status: 'pending' });
            let pendingOvertime = await getPendingOvertimeRequests();
            let pendingSchedules = await getPendingSchedules();

            if (viewRole === "store_manager" && storeId) {
                const sid = storeId.toString();
                pendingVacations = pendingVacations.filter((r: any) => (r.employeeId?.storeId?._id || r.employeeId?.storeId)?.toString() === sid);
                pendingAbsences = pendingAbsences.filter((r: any) => (r.employeeId?.storeId?._id || r.employeeId?.storeId)?.toString() === sid);
                pendingOvertime = pendingOvertime.filter((r: any) => (r.employeeId?.storeId?._id || r.employeeId?.storeId)?.toString() === sid);
                pendingSchedules = pendingSchedules.filter((s: any) => (s.storeId?._id || s.storeId)?.toString() === sid);
            }

            const storeEmployees = storeId
                ? await getEmployeesByStore(storeId)
                : (viewRole === "store_manager" ? [] : await getAllEmployees({}));

            // Fetch current schedule to count shifts
            let todayShiftsCount = 0;
            let currentScheduleId = null;
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
            }

            const storeStats = {
                totalEmployees: Array.isArray(storeEmployees) ? storeEmployees.length : 0,
                onVacation: Array.isArray(storeEmployees) ? storeEmployees.filter((e: any) => e.status === 'vacation').length : 0,
                todayShifts: todayShiftsCount
            };

            return <StoreManagerDashboard
                employee={employee}
                pendingRequests={mergeRequests(pendingVacations, pendingAbsences, pendingOvertime, pendingSchedules)}
                requests={{
                    vacations: pendingVacations,
                    absences: pendingAbsences,
                    overtime: pendingOvertime,
                    schedules: pendingSchedules
                }}
                storeStats={storeStats}
                todaysCoworkers={todaysCoworkers}
                currentScheduleId={currentScheduleId}
                currentUserRole={viewRole}
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

        if (scheduleData && scheduleData.days) {
            // Find today's shifts
            const todayStr = today.toISOString().split('T')[0];
            const todayDay = scheduleData.days.find((d: any) => new Date(d.date).toISOString().split('T')[0] === todayStr);

            if (todayDay) {
                // In getEmployeeScheduleView, we only returned the *user's* shifts. 
                // To get coworkers, we really need the FULL schedule for those shifts or the store.
                // But wait, `getEmployeeScheduleView` calculates data heavily.
                // Maybe simpler: just pass the scheduleId if found, and let the component link to it.
                // For "Working with you today", we need valid data. The current `getEmployeeScheduleView` filters shifts to ONLY the user.
                // So we can't get coworkers from it.
                // We should use `getScheduleById` or `getSchedules` for the store/dept if we want coworkers.
                // Let's fallback to "View full schedule" link for now, and maybe mock coworkers or fetch efficiently if needed.
                // Actually, let's grab the schedule ID from `scheduleData` (Wait, it returns a constructed object, not the doc).
                // `scheduleData` structure: { weekNumber, year, dateRange, days: [...] }
                // It misses the `_id` of the schedule document.
                // I should check `getEmployeeScheduleView` again. It finds `schedules` array but returns a constructed object.
                // I will modify `page.tsx` to just fetch the *raw* schedule for the store to find ID and coworkers.
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
            // Extract coworkers from today's shifts in this schedule
            const todayDate = new Date();
            const todayStr = todayDate.toISOString().split('T')[0];
            const todayNode = currentSchedule.days?.find((d: any) => new Date(d.date).toISOString().split('T')[0] === todayStr);

            if (todayNode) {
                const allShiftEmployees = new Set();
                todayNode.shifts.forEach((s: any) => {
                    s.employees?.forEach((e: any) => allShiftEmployees.add(e._id || e));
                });
                // This gives IDs. We need names. `getSchedules` only populates createdBy?
                // `getSchedules` populates `storeDepartmentId`. It does NOT deep populate shift employees.
                // We might need `getScheduleById` to get names.
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
                // If no day off found in this week (and we are at end of week), it might be next week.
                // For now, if we don't see one, we can assume it's "Unknown" or "7+"
                daysUntilNextDayOff = 7; // Placeholder for "Not this week"
            }
        }

        return <EmployeeDashboard
            employee={employee}
            todaysCoworkers={todaysCoworkers}
            currentScheduleId={currentScheduleId}
            daysUntilNextDayOff={daysUntilNextDayOff}
        />;
    }

    const t = await getTranslations("Common");

    return (
        <div className="min-h-screen bg-transparent">
            <div className="space-y-10 p-4 md:p-8 max-w-[1600px] mx-auto relative z-10">
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

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Main Content Area (3 cols) */}
                    <div className="lg:col-span-3 space-y-10">
                        {/* Swap & Notices - High Priority */}
                        <ScaleIn delay={0.1}>
                            <div className="space-y-6">
                                <SwapRequestsWidget incomingRequests={swapRequests.incoming} userId={(session.user as any).id} />
                                <NoticeBoard userId={(session.user as any).id} />
                            </div>
                        </ScaleIn>

                        {/* Role Specific Stats/Widgets */}
                        <FadeIn delay={0.2} className="premium-shadow rounded-3xl overflow-hidden">
                            {await renderDashboard()}
                        </FadeIn>

                        {/* Task Management Section - Visible to All */}
                        <FadeIn delay={0.3} className="space-y-6 pt-2">
                            <div className="flex items-center gap-4 px-2">
                                <Separator className="flex-1 bg-border/20" />
                                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60 whitespace-nowrap">Collaborative Tasks</span>
                                <Separator className="flex-1 bg-border/20" />
                            </div>

                            <TaskBoard
                                tasks={JSON.parse(JSON.stringify(tasks))}
                                currentUserId={(session.user as any).id}
                                currentUser={JSON.parse(JSON.stringify(employee))}
                                stores={JSON.parse(JSON.stringify(stores))}
                                storeDepartments={JSON.parse(JSON.stringify(depts))}
                                managers={JSON.parse(JSON.stringify(managers))}
                            />
                        </FadeIn>

                        {/* Admin/HR Analytics Section */}
                        {["admin", "hr", "owner", "super_user"].includes(viewRole) && (
                            <FadeIn delay={0.4} className="pt-8">
                                <div className="bg-primary/5 p-1 rounded-3xl border border-primary/10">
                                    <StoreTaskProgress />
                                </div>
                            </FadeIn>
                        )}
                    </div>

                    {/* Sidebar Area (1 col) - Personal Notes */}
                    <FadeInRight delay={0.3} className="lg:col-span-1">
                        <div className="sticky top-10 space-y-8">
                            <ReminderWidget userId={(session.user as any).id} role={viewRole} />
                            <PersonalTodoWidget
                                initialTodos={personalTodos}
                                userId={(session.user as any).id}
                            />
                        </div>
                    </FadeInRight>
                </div>
            </div>
        </div>
    );
}
