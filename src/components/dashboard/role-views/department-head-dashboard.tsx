"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ClipboardList, Users, Package, TrendingUp, AlertCircle, ShoppingCart, MessageSquare, Sun, CheckCircle2, Palmtree, Store, Clock, Globe } from "lucide-react";
import { format } from "date-fns";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { WidgetSkeleton } from "@/components/dashboard/widget-skeleton";

const PendingApprovalsWidget = dynamic(() => import("@/components/dashboard/pending-approvals-widget").then(mod => mod.PendingApprovalsWidget), {
    loading: () => <WidgetSkeleton />,
    ssr: false
});

const TaskBoard = dynamic(() => import("@/components/tasks/task-board").then(mod => mod.TaskBoard), {
    loading: () => <WidgetSkeleton />,
    ssr: false
});

const ActiveActionsWidget = dynamic(() => import("@/components/dashboard/active-actions-widget").then(mod => mod.ActiveActionsWidget), {
    loading: () => <div className="h-32 animate-pulse bg-muted/20 rounded-xl" />,
    ssr: false
});

const SwapRequestsWidget = dynamic(() => import("@/components/dashboard/swap-requests-widget").then(mod => mod.SwapRequestsWidget), {
    loading: () => <div className="h-24 animate-pulse bg-muted/20 rounded-xl" />,
    ssr: false
});

const BirthdayWidget = dynamic(() => import("@/components/dashboard/widgets/birthday-widget").then(mod => mod.BirthdayWidget), {
    loading: () => <div className="h-32 animate-pulse bg-muted/20 rounded-xl" />,
    ssr: false
});

const HolidayWidget = dynamic(() => import("@/components/dashboard/widgets/holiday-widget").then(mod => mod.HolidayWidget), {
    loading: () => <div className="h-32 animate-pulse bg-muted/20 rounded-xl" />,
    ssr: false
});

import { CredentialManager } from "@/components/credentials/credential-list";
import { HolidayGreetingWidget } from "@/components/dashboard/widgets/holiday-greeting-widget";
import { ProblemStatsWidget } from "@/components/dashboard/widgets/problem-stats-widget";
import { EmployeeScheduleTab } from "@/components/employees/employee-schedule-tab";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmployeeLink } from "../../common/employee-link";
import { OperationsRadar, DashboardAlert } from "@/components/dashboard/operations-radar";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import { ActivityLog } from "@/components/dashboard/activity-log";
import { PersonalTodoWidget } from "@/components/dashboard/personal-todo-widget";
import { ReminderWidget } from "@/components/reminders/reminder-widget";
import { NoticeBoard } from "@/components/notices/notice-board";
import { StatsCards } from "@/components/dashboard/stats-cards";
import InsightsPanel from "@/components/dashboard/insights-panel";
import { ScheduleAlertModal } from "@/components/dashboard/schedule-alert-modal";
import { StoreWeatherWidget } from "@/components/stores/store-weather-widget";

interface DepartmentHeadDashboardProps {
    employee: any;
    pendingRequests: any[];
    requests?: {
        vacations: any[];
        absences: any[];
        overtime: any[];
        schedules: any[];
        coverage?: any[];
    };
    storeStats: {
        totalEmployees: number;
        onVacation: number;
        todayShifts: number;
        totalHours?: number;
    };
    todaysCoworkers?: any[];
    currentScheduleId?: string | null;
    currentScheduleSlug?: string | null;
    currentUserRole?: string;
    operationsData?: {
        score: number;
        status: "optimal" | "warning" | "critical";
        alerts: DashboardAlert[];
        staffing: any;
        scheduleHealth: any;
    };
    tasks: any[];
    personalTodos: any[];
    swapRequests: any[];
    stores?: any[];
    departments?: any[];
    managers?: any[];
    activeActions?: {
        vacations: any[];
        absences: any[];
        coverageRequests: any[];
        coverageOffers: any[];
    };
    currentUserRoles?: string[];
    daysUntilNextDayOff?: number | null;
    allEmployees?: any[];
    weather?: any;
}

export function DepartmentHeadDashboard({
    employee,
    pendingRequests = [],
    requests,
    storeStats = { totalEmployees: 0, onVacation: 0, todayShifts: 0 },
    todaysCoworkers = [],
    currentScheduleId,
    currentScheduleSlug,
    currentUserRole = "department_head",
    operationsData,
    tasks = [],
    personalTodos = [],
    swapRequests = [],
    currentUserRoles = [],
    stores = [],
    departments = [],
    managers = [],
    activeActions = { vacations: [], absences: [], coverageRequests: [], coverageOffers: [] },
    daysUntilNextDayOff = null,
    allEmployees = [],
    weather
}: DepartmentHeadDashboardProps) {
    const [showScheduleAlert, setShowScheduleAlert] = useState(false);
    const t = useTranslations("Dashboard");



    const extendedStats = {
        totalEmployees: storeStats.totalEmployees,
        onVacation: storeStats.onVacation,
        activeEmployees: Math.max(0, storeStats.totalEmployees - storeStats.onVacation),
        absentToday: 0,
        pendingApprovals: pendingRequests.length,
        totalHours: storeStats.totalHours || 0
    };

    const userStoreId = typeof employee.storeId === 'object' ? employee.storeId?._id : employee.storeId;
    const effectiveStoreId = userStoreId || stores[0]?._id;

    // Personal Stats
    const vacationTracker = employee.vacationTracker || { usedDays: 0, defaultDays: 22, remainingDays: 22 };
    const nextVacation = (employee.vacations || [])?.find((v: any) => new Date(v.from) > new Date());

    const PersonalStats = () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="border-l-4 border-l-emerald-500 overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-2 py-3 px-4">
                    <CardTitle className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                        <Palmtree className="h-3 w-3" /> {t('widgets.vacationsRemaining')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black italic">{vacationTracker.remainingDays}</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{t('widgets.daysLeft')}</span>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-l-4 border-l-violet-500 overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-2 py-3 px-4">
                    <CardTitle className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">{t('widgets.nextVacation')}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                    {nextVacation ? (
                        <div className="space-y-0.5">
                            <div className="text-lg font-bold tracking-tight">{format(new Date(nextVacation.from), "MMM dd, yyyy")}</div>
                            <Badge variant="secondary" className="text-[9px] py-0 px-2 font-bold uppercase">
                                {Math.ceil((new Date(nextVacation.from).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days away
                            </Badge>
                        </div>
                    ) : (
                        <div className="text-md font-bold text-muted-foreground/40 italic">{t('widgets.nonePlanned')}</div>
                    )}
                </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500 overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-2 py-3 px-4">
                    <CardTitle className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                        <Clock className="h-3 w-3" /> {t('widgets.nextDayOff')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black italic">
                            {daysUntilNextDayOff === null ? "No Schedule" :
                                daysUntilNextDayOff === 0 ? "Today" :
                                    daysUntilNextDayOff === -1 ? "None Scheduled" :
                                        daysUntilNextDayOff}
                        </span>
                        {daysUntilNextDayOff !== null && daysUntilNextDayOff > 0 && <span className="text-[10px] font-bold text-muted-foreground uppercase">{t('widgets.daysAway')}</span>}
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    const CoworkersWidget = () => (
        <Card className="h-full border-l-4 border-l-emerald-500 shadow-sm relative overflow-hidden flex flex-col min-h-[400px]">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Users className="h-24 w-24" />
            </div>
            <CardHeader className="py-3 px-4 bg-muted/5 min-h-[60px] flex justify-center">
                <CardTitle className="text-md font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-emerald-600" />
                        {t('widgets.workingToday')}
                    </span>
                    {(currentScheduleSlug || currentScheduleId) && (
                        <Link href={`/dashboard/schedules/${currentScheduleSlug || currentScheduleId}`} className="text-[10px] font-bold text-primary hover:underline">
                            {t('widgets.viewSchedule')}
                        </Link>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-4 overflow-y-auto">
                {todaysCoworkers.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {todaysCoworkers.map((cw: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-border/40">
                                <Avatar className="h-10 w-10 border shadow-sm">
                                    <AvatarImage src={cw.image} />
                                    <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold">{cw.firstName[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col min-w-0">
                                    <EmployeeLink
                                        employeeId={cw._id}
                                        slug={cw.slug}
                                        name={`${cw.firstName} ${cw.lastName}`}
                                        currentUserRoles={currentUserRoles}
                                        className="text-xs font-bold text-foreground truncate"
                                    />
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-tight truncate">{cw.position}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-center space-y-3">
                        <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                            <Users className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                        <div className="text-xs font-medium text-muted-foreground italic max-w-[200px]">
                            {t('widgets.itsJustYou')}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    const widgets: Record<string, React.ReactNode> = {
        "operations-radar": operationsData ? (
            <OperationsRadar
                overallScore={operationsData.score}
                status={operationsData.status}
                alerts={operationsData.alerts}
                staffing={operationsData.staffing}
                scheduleHealth={operationsData.scheduleHealth}
                role={currentUserRole}
            />
        ) : <div className="p-4 text-center text-muted-foreground">Operations Data Unavailable</div>,

        "stats-cards": (
            <StatsCards stats={extendedStats} />
        ),

        "pending-approvals-card": (
            <PendingApprovalsWidget
                overtime={requests?.overtime || []}
                vacations={requests?.vacations || []}
                absences={requests?.absences || []}
                schedules={requests?.schedules || []}
                coverage={requests?.coverage || []}
                compact={false}
                role={currentUserRole}
                currentUserRoles={currentUserRoles}
            />
        ),

        "credential-manager": (
            <CredentialManager storeId={effectiveStoreId || ""} userId={employee._id} canEdit={["admin", "hr", "owner", "super_user", "tech"].includes(currentUserRole || "")} />
        ),

        "management-suite": (
            <Card className="border-l-4 border-l-primary shadow-sm flex flex-col">
                <CardHeader className="py-3 px-4 bg-muted/5 min-h-[50px] flex justify-center shrink-0">
                    <CardTitle className="text-md font-semibold flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        {t('widgets.managementActions')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-3 flex flex-col gap-3 overflow-y-auto">
                    <Link href="/dashboard/schedules" className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/50 transition-all group shadow-sm shrink-0">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shrink-0">
                            <Calendar className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-sm font-black italic text-foreground truncate">{t('widgets.manageSchedules')}</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-tight">System rotas</span>
                        </div>
                    </Link>

                    <Link href="/dashboard/employees" className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/50 transition-all group shadow-sm shrink-0">
                        <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform shrink-0">
                            <Users className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-sm font-black italic text-foreground truncate">{t('widgets.manageTeam')}</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-tight">Staff directory</span>
                        </div>
                    </Link>
                </CardContent>
            </Card>
        ),

        "task-board": (
            <TaskBoard
                tasks={tasks}
                currentUserId={employee._id}
                currentUser={employee}
                stores={stores}
                storeDepartments={departments}
                managers={managers}
            />
        ),

        "problem-stats": <ProblemStatsWidget userId={employee._id} role={currentUserRole} storeId={effectiveStoreId} />,

        "notice-board": <NoticeBoard userId={employee._id} />,

        "birthday-widget": <BirthdayWidget storeId={effectiveStoreId || ""} currentUserId={employee._id} />,

        "my-schedule": <EmployeeScheduleTab employeeId={employee._id} />,

        "coworkers-widget": <CoworkersWidget />,

        "holiday-greeting": <HolidayGreetingWidget />,

        "holiday-widget": <HolidayWidget storeId={effectiveStoreId || ""} />,

        "personal-stats": <PersonalStats />,

        "global-workforce": (() => {
            const [currentPage, setCurrentPage] = useState(1);
            const itemsPerPage = 10;
            const totalPages = Math.ceil(allEmployees.length / itemsPerPage);
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedEmployees = allEmployees.slice(startIndex, endIndex);

            return (
                <Card className="border shadow-sm flex flex-col h-full bg-card/50 backdrop-blur-sm">
                    <CardHeader className="py-3 px-4 border-b shrink-0 flex flex-row items-center justify-between">
                        <CardTitle className="text-md font-black italic flex items-center gap-2 text-primary uppercase tracking-tight">
                            <Globe className="h-4 w-4" /> Global Workforce
                        </CardTitle>
                        <Link href="/dashboard/employees" className="text-[10px] font-bold text-primary hover:underline uppercase tracking-tight">
                            {t('widgets.manageTeam')} &rarr;
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto flex-1">
                        <table className="w-full text-left">
                            <thead className="bg-muted/30 text-[9px] font-black uppercase tracking-widest text-muted-foreground border-b italic">
                                <tr>
                                    <th className="px-4 py-3">Employee</th>
                                    <th className="px-4 py-3">Store</th>
                                    <th className="px-4 py-3">Today's Status</th>
                                    <th className="px-4 py-3">Vacation Left</th>
                                    <th className="px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {paginatedEmployees.map((emp: any) => {
                                    const tracker = emp.vacationTracker || { defaultDays: 22, usedDays: 0, rolloverDays: 0 };
                                    const remaining = (tracker.defaultDays || 22) + (tracker.rolloverDays || 0) - (tracker.usedDays || 0);
                                    const isWorking = todaysCoworkers.find((cw: any) => cw._id === emp._id || cw._id?.toString() === emp._id?.toString());
                                    return (
                                        <tr key={emp._id} className="hover:bg-muted/10 transition-colors group">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-7 w-7 border shadow-sm group-hover:scale-105 transition-transform">
                                                        <AvatarImage src={emp.image} />
                                                        <AvatarFallback className="text-[9px] font-bold italic bg-primary/10 text-primary">{emp.firstName[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-xs font-bold text-foreground truncate">{emp.firstName} {emp.lastName}</span>
                                                        <span className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter truncate opacity-70">{emp.positionId?.name || emp.contract?.employmentType || "Staff"}</span>
                                                    </div>
                                                </div>

                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase text-foreground truncate max-w-[120px]">
                                                        {emp.storeId?.name || "Global"}
                                                    </span>
                                                    <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest">{emp.storeDepartmentId?.name || "All Depts"}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    {isWorking ? (
                                                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] font-black italic uppercase py-0 px-2 h-5">
                                                            <div className="h-1 w-1 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                                                            On Shift
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-muted-foreground/50 border-border/50 text-[9px] font-black italic uppercase py-0 px-2 h-5">
                                                            Off Duty
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={cn("text-sm font-black italic", remaining > 5 ? "text-emerald-600" : (remaining > 0 ? "text-amber-500" : "text-rose-600"))}>
                                                        {remaining}
                                                    </span>
                                                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-tight">{t('widgets.daysLeft')}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Link href={`/dashboard/employees/${emp.slug || emp._id}`} className="text-[9px] font-black text-primary hover:text-primary/70 transition-colors uppercase tracking-widest flex items-center justify-end gap-1">
                                                    View <ClipboardList className="h-3 w-3" />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {allEmployees.length === 0 && (
                            <div className="p-8 text-center bg-muted/5">
                                <p className="text-xs font-medium text-muted-foreground italic">No employees found in this global department.</p>
                            </div>
                        )}
                    </CardContent>
                    {totalPages > 1 && (
                        <div className="border-t px-4 py-3 flex items-center justify-between bg-muted/5">
                            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                                Showing {startIndex + 1}-{Math.min(endIndex, allEmployees.length)} of {allEmployees.length}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="h-7 px-2 text-[10px] font-bold"
                                >
                                    Previous
                                </Button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <Button
                                            key={page}
                                            variant={currentPage === page ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setCurrentPage(page)}
                                            className="h-7 w-7 p-0 text-[10px] font-bold"
                                        >
                                            {page}
                                        </Button>
                                    ))}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="h-7 px-2 text-[10px] font-bold"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            );
        })(),

    };

    const sidebarContent: any = {
        todo: <PersonalTodoWidget initialTodos={personalTodos} userId={employee._id} />,
        notifications: (
            <div className="space-y-6">
                <ActiveActionsWidget
                    vacations={activeActions.vacations}
                    absences={activeActions.absences}
                    coverageRequests={activeActions.coverageRequests}
                    coverageOffers={activeActions.coverageOffers}
                    userId={employee._id}
                />
                <SwapRequestsWidget
                    incomingRequests={swapRequests}
                    userId={employee._id}
                    currentUserRoles={currentUserRoles}
                />
                <ReminderWidget userId={employee._id} role={currentUserRole} />
            </div>
        )
    };

    return (
        <DashboardLayout sidebar={sidebarContent}>
            <div className="flex flex-col gap-8 animate-in fade-in duration-700">
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="px-3 py-1 bg-primary/5 text-primary border-primary/20 font-bold uppercase tracking-wider text-[10px]">
                        {t('widgets.networkDashboard')}
                    </Badge>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-border/50 via-border to-transparent" />
                </div>

                {widgets["personal-stats"]}

                {operationsData?.scheduleHealth?.overdue && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full"
                    >
                        <Card className="border-2 border-red-500/50 bg-red-500/5 overflow-hidden">
                            <CardContent className="p-6 flex items-center gap-6">
                                <div className="h-16 w-16 rounded-2xl bg-red-500/10 flex items-center justify-center shrink-0 animate-pulse">
                                    <AlertCircle className="h-8 w-8 text-red-600" />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl font-black text-red-700 tracking-tight uppercase italic">{t('widgets.complianceWarning')}</h2>
                                        <Badge variant="destructive" className="font-bold uppercase tracking-widest text-[10px]">{t('widgets.overdue')}</Badge>
                                    </div>
                                    <p className="text-sm text-red-600/80 font-medium leading-relaxed max-w-2xl">
                                        The deadline for next week's schedule submission has passed. The following entities have not yet published their rotas:
                                        <span className="block mt-2 font-bold text-red-700">
                                            {operationsData.scheduleHealth.missingEntities?.slice(0, 3).join(", ") || "All entities"}
                                            {(operationsData.scheduleHealth.missingEntities?.length || 0) > 3 && ` + ${(operationsData.scheduleHealth.missingEntities?.length || 0) - 3} more`}
                                        </span>
                                    </p>
                                </div>
                                <div className="hidden md:flex flex-col gap-2">
                                    <Button
                                        variant="destructive"
                                        className="font-bold italic uppercase tracking-tight"
                                        onClick={() => setShowScheduleAlert(true)}
                                    >
                                        {t('widgets.reviewBreakdown')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                <div className="w-full">
                    {widgets["stats-cards"]}
                </div>

                <div className="w-full">
                    {widgets["operations-radar"]}
                </div>

                <div className="w-full">
                    {widgets["problem-stats"]}
                </div>

                {/* 4. Management & Pending Approvals (Side by Side, Equal Height) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                    <div className="h-full">
                        {widgets["management-suite"]}
                    </div>
                    <div className="h-full">
                        {widgets["pending-approvals-card"]}
                    </div>
                </div>

                {/* 5. Team Tasks (Full Width) */}
                <div className="w-full">
                    {widgets["task-board"]}
                </div>

                {/* 6. My Schedule (Full Width) */}
                <div className="w-full">
                    {widgets["my-schedule"]}
                </div>

                {/* 7. Credential Manager (Full Width) */}
                <div className="w-full">
                    {widgets["credential-manager"]}
                </div>

                <div className="w-full">
                    {widgets["notice-board"]}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                    <div className="h-full">
                        {widgets["birthday-widget"]}
                    </div>
                    <div className="h-full">
                        {widgets["holiday-widget"]}
                    </div>
                </div>

                <ScheduleAlertModal
                    isOpen={showScheduleAlert}
                    onOpenChange={setShowScheduleAlert}
                    missingEntities={operationsData?.scheduleHealth?.missingEntities || []}
                    missingEntityObjects={(operationsData?.scheduleHealth as any)?.missingEntityObjects || []}
                    type="store"
                />
            </div>
        </DashboardLayout>
    );
}
