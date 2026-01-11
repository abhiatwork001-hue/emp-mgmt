"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ClipboardList, Package, MessageSquare, Sun, CheckCircle2 } from "lucide-react";
import { PendingApprovalsCard } from "@/components/dashboard/pending-approvals-card";
import { EmployeeScheduleTab } from "@/components/employees/employee-schedule-tab";
import { HolidayWidget } from "@/components/dashboard/widgets/holiday-widget";
import { ProblemStatsWidget } from "@/components/dashboard/widgets/problem-stats-widget";
import { ActiveActionsWidget } from "@/components/dashboard/active-actions-widget";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import { PersonalTodoWidget } from "@/components/dashboard/personal-todo-widget";
import { ReminderWidget } from "@/components/reminders/reminder-widget";

// ... (imports remain)
import { useTranslations } from "next-intl";

interface DepartmentHeadDashboardProps {
    employee: any;
    pendingRequests: any[];
    deptStats: {
        totalEmployees: number;
        onVacation: number;
        todayShifts: number;
    };
    activeActions?: {
        vacations: any[];
        absences: any[];
        coverageRequests: any[];
        coverageOffers: any[];
    };
    personalTodos: any[];
}

export function DepartmentHeadDashboard({ employee, pendingRequests, deptStats, activeActions, personalTodos }: DepartmentHeadDashboardProps) {
    const t = useTranslations("Dashboard");
    const sidebarContent = {
        todo: <PersonalTodoWidget initialTodos={personalTodos} userId={employee._id} />,
        notifications: (
            <div className="space-y-6">
                <ReminderWidget userId={employee._id} role="department_head" />
            </div>
        )
    };

    return (
        <DashboardLayout sidebar={sidebarContent}>
            <div className="space-y-8">
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest bg-muted/30 border-border/20 px-3 py-1 text-muted-foreground">
                        {t('widgets.departmentOverview')}
                    </Badge>
                </motion.div>
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-foreground">
                            {t('widgets.headTitle')} {employee.firstName}
                        </h2>
                        <p className="text-muted-foreground">
                            {t('widgets.overviewText', { department: employee.storeDepartmentId?.name || "Your Department", store: employee.storeId?.name || "Store" })}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full border border-border">
                            <Sun className="h-4 w-4 text-amber-500" />
                            <span className="text-sm font-medium text-foreground">24°C Sunny</span>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-card border-border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{t('widgets.teamToday')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{deptStats.todayShifts} / {deptStats.totalEmployees}</div>
                            <p className="text-xs text-muted-foreground mt-1">{t('widgets.membersOnShift')}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{t('widgets.teamVacation')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold flex items-center gap-2">
                                {deptStats.onVacation}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{t('widgets.membersAway')}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{t('widgets.approvals')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${pendingRequests.length > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                                {pendingRequests.length}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{t('widgets.pendingRequests')}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{t('widgets.nextMeeting')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg font-bold">14:00 Today</div>
                            <p className="text-xs text-muted-foreground mt-1">Weekly Ops Review</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {/* Pending Approvals Area */}
                        <div className="space-y-6">
                            {activeActions && (activeActions.vacations.length > 0 || activeActions.absences.length > 0 || activeActions.coverageRequests.length > 0 || activeActions.coverageOffers.length > 0) && (
                                <ActiveActionsWidget
                                    vacations={activeActions.vacations}
                                    absences={activeActions.absences}
                                    coverageRequests={activeActions.coverageRequests}
                                    coverageOffers={activeActions.coverageOffers}
                                    userId={employee._id}
                                />
                            )}
                            {pendingRequests.length > 0 ? (
                                <PendingApprovalsCard pendingRequests={pendingRequests} />
                            ) : (
                                <Card className="bg-card border-border h-full flex flex-col justify-center items-center py-12">
                                    <CheckCircle2 className="h-12 w-12 text-emerald-400 mb-4 opacity-50" />
                                    <CardTitle className="text-emerald-400">{t('widgets.allCaughtUp')}</CardTitle>
                                    <p className="text-muted-foreground mt-2">{t('widgets.noPendingRequestsDept')}</p>
                                </Card>
                            )}
                        </div>

                        {/* Department Tools & Problems */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="bg-card border-border">
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold uppercase tracking-wider">{t('widgets.departmentTools')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {[
                                        { icon: Calendar, label: t('widgets.createSchedule') },
                                        { icon: Package, label: t('widgets.inventoryCheck') },
                                        { icon: ClipboardList, label: t('widgets.assignedTasks') },
                                    ].map((tool, i) => (
                                        <Button key={i} variant="outline" className="w-full justify-start h-11 rounded-xl hover:bg-muted/50 transition-all">
                                            <tool.icon className="mr-3 h-4 w-4 text-muted-foreground" />
                                            <span className="font-semibold">{tool.label}</span>
                                        </Button>
                                    ))}
                                </CardContent>
                            </Card>

                            <div className="space-y-6">
                                <ProblemStatsWidget
                                    userId={employee._id}
                                    role="department_head"
                                />
                                <HolidayWidget storeId={employee.storeId?._id || employee.storeId} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {/* Schedule Preview */}
                        <Card className="bg-card border-border h-full">
                            <CardHeader className="flex flex-row items-center justify-between bg-muted/20 border-b border-border/10 py-4">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider">{t('widgets.mySchedule')}</CardTitle>
                                <Button variant="ghost" size="sm" className="text-[10px] font-bold text-primary px-3">
                                    {t('widgets.fullDeptView')} &rarr;
                                </Button>
                            </CardHeader>
                            <CardContent className="p-6">
                                <EmployeeScheduleTab employeeId={employee._id.toString()} />
                            </CardContent>
                        </Card>

                        {/* Tasks */}
                        <Card className="bg-card border-border">
                            <CardHeader className="bg-muted/20 border-b border-border/10 py-4">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider">{t('widgets.pendingTeamTasks')}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 gap-4">
                                    {[
                                        { title: "Approve overtime", info: "John Doe - 2h" },
                                        { title: "Submit defect report", info: "Coffee Machine" },
                                    ].map((task, i) => (
                                        <div key={i} className="flex items-center gap-4 p-4 bg-muted/30 rounded-2xl border border-border/40 hover:bg-muted/50 transition-all group">
                                            <div className="h-5 w-5 rounded-lg border-2 border-primary/20 group-hover:border-primary/50 transition-colors" />
                                            <div className="flex-1">
                                                <div className="font-bold text-sm tracking-tight">{task.title}</div>
                                                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">{task.info}</div>
                                            </div>
                                            <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <CheckCircle2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
