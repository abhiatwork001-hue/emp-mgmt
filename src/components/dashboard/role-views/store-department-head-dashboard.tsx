"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ClipboardList, Package, MessageSquare, Sun, CheckCircle2 } from "lucide-react";
import { PendingApprovalsCard } from "@/components/dashboard/pending-approvals-card";
import { EmployeeScheduleTab } from "@/components/employees/employee-schedule-tab";
import { ReminderWidget } from "@/components/reminders/reminder-widget";
import { HolidayWidget } from "@/components/dashboard/widgets/holiday-widget";
import { ProblemStatsWidget } from "@/components/dashboard/widgets/problem-stats-widget";
import { ActiveActionsWidget } from "@/components/dashboard/active-actions-widget";

interface StoreDepartmentHeadDashboardProps {
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
}

export function StoreDepartmentHeadDashboard({ employee, pendingRequests, deptStats, activeActions }: StoreDepartmentHeadDashboardProps) {
    return (
        <div className="space-y-8">
            <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
            >
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest bg-muted/30 border-border/20 px-3 py-1 text-muted-foreground">
                    Store Department Overview
                </Badge>
            </motion.div>

            {/* Stats Grid - Specific to THIS Store Dept */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Team Today</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{deptStats.todayShifts} / {deptStats.totalEmployees}</div>
                        <p className="text-xs text-muted-foreground mt-1">on shift in {employee.storeDepartmentId?.name}</p>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">On Vacation</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            {deptStats.onVacation}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">members away</p>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Approvals</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${pendingRequests.length > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                            {pendingRequests.length}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">pending requests</p>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-8">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Approvals Section */}
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
                                <CardTitle className="text-emerald-400">All Caught Up</CardTitle>
                                <p className="text-muted-foreground mt-2">No pending requests for your department.</p>
                            </Card>
                        )}
                    </div>

                    {/* Quick Tools & Problem Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-6">
                            <ProblemStatsWidget
                                userId={employee._id}
                                role="store_department_head"
                                storeId={employee.storeId?._id || employee.storeId}
                            />
                            <HolidayWidget storeId={employee.storeId?._id || employee.storeId} />
                        </div>

                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Management Tools</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {[
                                    { icon: Calendar, label: "Manage Schedule" },
                                    { icon: ClipboardList, label: "Team Tasks" },
                                ].map((tool, i) => (
                                    <Button key={i} variant="outline" className="w-full justify-start h-12 rounded-xl border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all">
                                        <tool.icon className="mr-3 h-5 w-5 text-muted-foreground" />
                                        <span className="font-semibold">{tool.label}</span>
                                    </Button>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Schedule Preview Section */}
                <Card className="bg-card border-border overflow-hidden">
                    <CardHeader className="bg-muted/20 border-b border-border/10 py-4">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider">My Schedule Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <EmployeeScheduleTab employeeId={employee._id.toString()} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
