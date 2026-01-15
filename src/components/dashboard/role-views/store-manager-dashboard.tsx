"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ClipboardList, Users, Package, TrendingUp, AlertCircle, Sun, MapPin, Palmtree, Store, Truck } from "lucide-react";
import { format } from "date-fns";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { WidgetSkeleton } from "@/components/dashboard/widget-skeleton";
import { RequestVacationDialog } from "@/components/vacations/request-vacation-dialog";
import { ReportAbsenceDialog } from "@/components/absences/report-absence-dialog";
import { SmartOrderPlanner } from "@/components/suppliers/smart-order-planner";

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

const StoreAnalyticsWidget = dynamic(() => import("@/components/dashboard/analytics/store-analytics-widget").then(mod => mod.StoreAnalyticsWidget), {
    loading: () => <div className="h-64 animate-pulse bg-muted/20 rounded-xl" />,
    ssr: false
});

const ApiUsageWidget = dynamic(() => import("@/components/dashboard/widgets/api-usage-widget").then(mod => mod.ApiUsageWidget), {
    loading: () => <div className="h-40 animate-pulse bg-muted/20 rounded-xl" />,
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
import { VacationAnalytics } from "@/components/dashboard/hr/vacation-analytics";
import { ReputationSummary } from "@/components/dashboard/reputation-summary";
import { ScheduleAlertModal } from "@/components/dashboard/schedule-alert-modal";
import { getAvailableSuppliersForToday } from "@/lib/actions/supplier-alerts.actions";
import { SupplierAlertWidget } from "@/components/suppliers/supplier-alert-widget";
interface StoreManagerDashboardProps {
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
    storeRatings?: any[];
    weather?: any;
}

export function StoreManagerDashboard({
    employee,
    pendingRequests = [],
    requests,
    storeStats = { totalEmployees: 0, onVacation: 0, todayShifts: 0 },
    todaysCoworkers = [],
    currentScheduleId,
    currentScheduleSlug,
    currentUserRole = "store_manager",
    operationsData,
    tasks = [],
    personalTodos = [],
    swapRequests = [],
    currentUserRoles = [],
    stores = [],
    departments = [],
    storeRatings = [],
    managers = [],
    activeActions = { vacations: [], absences: [], coverageRequests: [], coverageOffers: [] },
    weather
}: StoreManagerDashboardProps) {
    const [showScheduleAlert, setShowScheduleAlert] = useState(false);
    const [supplierAlerts, setSupplierAlerts] = useState<any[]>([]);
    const t = useTranslations("Dashboard");
    const tc = useTranslations("Common");

    const extendedStats = {
        totalEmployees: storeStats.totalEmployees,
        onVacation: storeStats.onVacation,
        activeEmployees: Math.max(0, storeStats.totalEmployees - storeStats.onVacation),
        absentToday: 0,
        pendingApprovals: pendingRequests.length,
        totalHours: storeStats.totalHours || 0
    };

    const isHighLevel = ["owner", "admin", "hr", "super_user", "tech"].includes(currentUserRole);
    const isDeptLevel = ["department_head", "store_department_head"].includes(currentUserRole);

    const userStoreId = typeof employee.storeId === 'object' ? employee.storeId?._id : employee.storeId;
    const effectiveStoreId = isHighLevel ? (userStoreId || undefined) : (userStoreId || stores[0]?._id);

    useEffect(() => {
        if (effectiveStoreId) {
            getAvailableSuppliersForToday(effectiveStoreId.toString()).then(setSupplierAlerts);
        }
    }, [effectiveStoreId]);

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
                            {t('widgets.noTeamMembers')}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    const widgets = {
        "operations-radar": operationsData ? (
            <OperationsRadar
                overallScore={operationsData.score}
                status={operationsData.status}
                alerts={operationsData.alerts}
                staffing={operationsData.staffing}
                scheduleHealth={operationsData.scheduleHealth}
                role={currentUserRole}
            />
        ) : <div className="p-4 text-center text-muted-foreground">{t('widgets.opsDataUnavailable')}</div>,

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
            <CredentialManager storeId={effectiveStoreId || ""} userId={employee._id} canEdit={["admin", "hr", "owner", "super_user", "tech", "store_manager"].includes(currentUserRole)} />
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
                            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-tight">{t('widgets.systemRotas')}</span>
                        </div>
                    </Link>

                    <Link href="/dashboard/employees" className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/50 transition-all group shadow-sm shrink-0">
                        <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform shrink-0">
                            <Users className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-sm font-black italic text-foreground truncate">{t('widgets.manageTeam')}</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-tight">{t('widgets.staffDirectory')}</span>
                        </div>
                    </Link>

                    {effectiveStoreId && (
                        <Link href={`/dashboard/stores/${effectiveStoreId}`} className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/50 transition-all group shadow-sm shrink-0">
                            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform shrink-0">
                                <Store className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-sm font-black italic text-foreground truncate">{t('widgets.myStore')}</span>
                                <span className="text-[10px] text-muted-foreground uppercase font-black tracking-tight">{t('widgets.settingsDetails')}</span>
                            </div>
                        </Link>
                    )}
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

        "insights-panel": <InsightsPanel />,
        "problem-stats": <ProblemStatsWidget userId={employee._id} role={currentUserRole} storeId={effectiveStoreId} />,
        "notice-board": <NoticeBoard userId={employee._id} />,
        "birthday-widget": <BirthdayWidget storeId={effectiveStoreId || ""} currentUserId={employee._id} />,
        "my-schedule": <EmployeeScheduleTab employeeId={employee._id} />,
        "coworkers-widget": <CoworkersWidget />,
        "holiday-greeting": <HolidayGreetingWidget />,
        "holiday-widget": <HolidayWidget storeId={effectiveStoreId || ""} />,
        "reputation-summary": storeRatings && storeRatings.length > 0 ? (
            <ReputationSummary stores={storeRatings} />
        ) : null,
        "api-usage": <ApiUsageWidget />,
        "analytics-widget": effectiveStoreId ? (
            <StoreAnalyticsWidget storeId={effectiveStoreId} />
        ) : null,
        "supplier-alerts": effectiveStoreId && supplierAlerts.length > 0 ? (
            <SupplierAlertWidget alerts={supplierAlerts} storeId={effectiveStoreId.toString()} />
        ) : null,

        "quick-requests": (
            <Card className="shadow-sm border-l-4 border-l-sky-500">
                <CardHeader className="py-3 px-4 bg-muted/5">
                    <CardTitle className="text-md font-semibold flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-sky-600" />
                        {t('widgets.quickActions')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex flex-col gap-3">
                    <RequestVacationDialog
                        employeeId={employee._id}
                        remainingDays={employee.vacationTracker?.remainingDays || 0}
                        trigger={
                            <Button variant="outline" className="w-full justify-start gap-3 h-12 bg-card hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200">
                                <div className="h-8 w-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                                    <Palmtree className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-sm font-bold">{t('widgets.requestVacation')}</span>
                                    <span className="text-[10px] text-muted-foreground">{t('widgets.planTimeOff')}</span>
                                </div>
                            </Button>
                        }
                    />
                    <ReportAbsenceDialog
                        employeeId={employee._id}
                        trigger={
                            <Button variant="outline" className="w-full justify-start gap-3 h-12 bg-card hover:bg-red-50 hover:text-red-700 hover:border-red-200">
                                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                                    <AlertCircle className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-sm font-bold">{t('widgets.reportAbsence')}</span>
                                    <span className="text-[10px] text-muted-foreground">{t('widgets.sickLeaveDesc')}</span>
                                </div>
                            </Button>
                        }
                    />
                </CardContent>
            </Card>
        ),

        "smart-planner": effectiveStoreId ? (
            <SmartOrderPlanner storeId={effectiveStoreId.toString()} />
        ) : null
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

    if (["tech", "super_user", "owner", "admin", "hr"].includes(currentUserRole)) {
        sidebarContent.activity = <ActivityLog userId={undefined} userRoles={employee.roles || []} variant="widget" />;
    }

    return (
        <DashboardLayout sidebar={sidebarContent}>
            <div className="flex flex-col gap-8 animate-in fade-in duration-700">
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="px-3 py-1 bg-primary/5 text-primary border-primary/20 font-bold uppercase tracking-wider text-[10px]">
                        {isHighLevel ? t('widgets.networkDashboard') : isDeptLevel ? t('widgets.departmentView') : t('widgets.storeDashboard')}
                    </Badge>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-border/50 via-border to-transparent" />
                </div>

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
                                        {t('widgets.complianceMessage', { entity: currentUserRole === 'store_manager' ? tc('departments') : tc('stores') })}
                                        <span className="block mt-2 font-bold text-red-700">
                                            {operationsData.scheduleHealth.missingEntities?.slice(0, 3).join(", ") || t('widgets.allEntities')}
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

                {widgets["reputation-summary"] && (
                    <div className="w-full">
                        {widgets["reputation-summary"]}
                    </div>
                )}

                <div className="w-full">
                    {widgets["operations-radar"]}
                </div>

                {widgets["supplier-alerts"] && (
                    <div className="w-full">
                        {widgets["supplier-alerts"]}
                    </div>
                )}

                {widgets["analytics-widget"] && (
                    <div className="w-full">
                        <div className="flex items-center gap-3 mb-4">
                            <Badge variant="outline" className="px-3 py-1 bg-yellow-500/5 text-yellow-600 border-yellow-500/20 font-bold uppercase tracking-wider text-[10px]">
                                <TrendingUp className="h-3 w-3 mr-1 inline" />
                                {t('widgets.monthlyAnalytics')}
                            </Badge>
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-border/50 via-border to-transparent" />
                        </div>
                        {widgets["analytics-widget"]}
                    </div>
                )}

                {isHighLevel && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="px-3 py-1 bg-emerald-500/5 text-emerald-600 border-emerald-500/20 font-bold uppercase tracking-wider text-[10px]">
                                <Palmtree className="h-3 w-3 mr-1 inline" />
                                {t('widgets.vacationAnalytics')}
                            </Badge>
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-border/50 via-border to-transparent" />
                        </div>
                        <VacationAnalytics />
                    </div>
                )}

                <div className="w-full lg:hidden">
                    {widgets["quick-requests"]}
                </div>

                <div className="w-full">
                    {widgets["problem-stats"]}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                    <div className="h-full">
                        {widgets["management-suite"]}
                    </div>
                    <div className="h-full">
                        {widgets["pending-approvals-card"]}
                    </div>
                </div>

                <div className="w-full">
                    {widgets["smart-planner"]}
                </div>

                <div className="w-full">
                    {widgets["task-board"]}
                </div>

                <div className="w-full">
                    {widgets["my-schedule"]}
                </div>

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

                {["tech", "admin", "owner"].includes(currentUserRole) && (
                    <div className="grid grid-cols-1 gap-6">
                        {widgets["api-usage"]}
                    </div>
                )}

                <ScheduleAlertModal
                    isOpen={showScheduleAlert}
                    onOpenChange={setShowScheduleAlert}
                    missingEntities={operationsData?.scheduleHealth?.missingEntities || []}
                    missingEntityObjects={(operationsData?.scheduleHealth as any)?.missingEntityObjects || []}
                    type={currentUserRole === 'store_manager' ? 'department' : 'store'}
                />
            </div>
        </DashboardLayout>
    );
}
