"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Sun, MessageSquare, Briefcase, User, Star, Utensils, Palmtree, Users, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { EmployeeScheduleTab } from "@/components/employees/employee-schedule-tab";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RequestVacationDialog } from "@/components/vacations/request-vacation-dialog";
import { ReportAbsenceDialog } from "@/components/absences/report-absence-dialog";
import { HolidayWidget } from "@/components/dashboard/widgets/holiday-widget";
import { BirthdayWidget } from "@/components/dashboard/widgets/birthday-widget";
import { HolidayGreetingWidget } from "@/components/dashboard/widgets/holiday-greeting-widget";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import { ActivityLog } from "@/components/dashboard/activity-log";
import { PersonalTodoWidget } from "@/components/dashboard/personal-todo-widget";
import { ReminderWidget } from "@/components/reminders/reminder-widget";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { NoticeBoard } from "@/components/notices/notice-board";
import { ActiveActionsWidget } from "@/components/dashboard/active-actions-widget";
import { EmployeePendingActionsWidget } from "@/components/dashboard/employee-pending-actions-widget";
import { OvertimeRequestDialog } from "@/components/schedules/overtime-request-dialog";

export function EmployeeDashboard({
    employee,
    todaysCoworkers = [],
    currentScheduleId,
    currentScheduleSlug,
    daysUntilNextDayOff = 0,
    personalTodos = [],
    activeActions = { vacations: [], absences: [], coverageRequests: [], coverageOffers: [] },
    swapRequests = [] // New Prop
}: any) {
    const router = useRouter();

    // Vacation Stats
    const vacationTracker = employee.vacationTracker || { usedDays: 0, defaultDays: 22, remainingDays: 22 };
    const nextVacation = employee.vacations?.find((v: any) => new Date(v.from) > new Date());

    const hasSchedule = currentScheduleId && currentScheduleId !== "null";

    const sidebarContent = {
        todo: <PersonalTodoWidget initialTodos={personalTodos} userId={employee._id} />,
        notifications: (
            <div className="space-y-6">
                <EmployeePendingActionsWidget
                    swapRequests={swapRequests}
                    coverageOffers={activeActions.coverageOffers}
                    myVacations={activeActions.vacations}
                    myAbsences={activeActions.absences}
                    myCoverageRequests={activeActions.coverageRequests}
                    userId={employee._id}
                />
                <ReminderWidget userId={employee._id} role="employee" />
            </div>
        )
    };

    return (
        <DashboardLayout sidebar={sidebarContent}>
            <div className="flex flex-col gap-8 animate-in fade-in duration-700">
                {/* Visual Role Indicator */}
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="px-3 py-1 bg-primary/5 text-primary border-primary/20 font-bold uppercase tracking-wider text-[10px]">
                        Personal Workspace
                    </Badge>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-border/50 via-border to-transparent" />
                </div>

                {/* 0. No Schedule Warning (High Visibility) */}
                {!hasSchedule && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="border-l-4 border-l-destructive bg-destructive/5 overflow-hidden">
                            <CardContent className="p-6 flex items-center gap-6">
                                <div className="h-16 w-16 rounded-3xl bg-destructive/10 flex items-center justify-center shrink-0">
                                    <AlertCircle className="h-8 w-8 text-destructive" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <h2 className="text-xl font-black text-foreground">No Schedule Available</h2>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Your manager hasn't published the schedule for this week yet.
                                        Please check back later or contact your supervisor for confirmation.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* 1. Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                    <Card className="border-l-4 border-l-emerald-500 overflow-hidden h-full">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                                <Palmtree className="h-3 w-3" /> Vacations Remaining
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black italic">{vacationTracker.remainingDays}</span>
                                <span className="text-xs font-bold text-muted-foreground uppercase">days left</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-violet-500 overflow-hidden h-full">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Next Vacation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {nextVacation ? (
                                <div className="space-y-1">
                                    <div className="text-xl font-bold tracking-tight">{format(new Date(nextVacation.from), "MMM dd, yyyy")}</div>
                                    <Badge variant="secondary" className="text-[9px] py-0 px-2 font-bold uppercase">In {Math.ceil((new Date(nextVacation.from).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days</Badge>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1 items-start">
                                    <div className="text-lg font-bold text-muted-foreground/40 italic">None Planned</div>
                                    <Link href="/dashboard/vacations" className="text-[9px] font-black text-primary hover:underline uppercase">Schedule it now &rarr;</Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-amber-500 overflow-hidden h-full">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                                <Clock className="h-3 w-3" /> Next Day Off
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black italic">{daysUntilNextDayOff === 0 || daysUntilNextDayOff === -1 ? "Rest Day" : daysUntilNextDayOff}</span>
                                {daysUntilNextDayOff > 0 && <span className="text-xs font-bold text-muted-foreground uppercase">days away</span>}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 2. Main Schedule - Full Width */}
                {hasSchedule && (
                    <div className="w-full animate-in zoom-in-95 duration-500">
                        <Card className="border shadow-sm overflow-hidden flex flex-col bg-card/50 backdrop-blur-sm">
                            <CardHeader className="py-3 px-4 bg-muted/5 border-b shrink-0">
                                <CardTitle className="text-md font-black italic flex items-center gap-2 text-primary uppercase tracking-tight">
                                    <Calendar className="h-4 w-4" /> My Weekly Schedule
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <EmployeeScheduleTab employeeId={employee._id.toString()} />
                            </CardContent>
                        </Card>
                    </div>
                )}

                <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                    {/* Main Operations Card */}
                    <Card className="p-6 border shadow-sm flex flex-col gap-8 bg-card/30">
                        {/* 1. Request Buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <RequestVacationDialog
                                employeeId={employee._id.toString()}
                                remainingDays={vacationTracker.remainingDays}
                                trigger={
                                    <Button variant="outline" className="w-full justify-start h-16 rounded-2xl group/btn hover:border-primary/50 transition-all bg-card/50 shadow-sm border-l-4 border-l-primary">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 group-hover/btn:scale-110 transition-transform">
                                            <Calendar className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex flex-col items-start min-w-0">
                                            <span className="text-md font-black italic">Time Off</span>
                                            <span className="text-[9px] text-muted-foreground uppercase font-black">Request Vacation</span>
                                        </div>
                                    </Button>
                                }
                            />

                            <ReportAbsenceDialog
                                employeeId={employee._id.toString()}
                                trigger={
                                    <Button variant="outline" className="w-full justify-start h-16 rounded-2xl group/btn hover:border-destructive/50 transition-all bg-card/50 shadow-sm border-l-4 border-l-destructive">
                                        <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center mr-3 group-hover/btn:scale-110 transition-transform">
                                            <AlertCircle className="h-5 w-5 text-destructive" />
                                        </div>
                                        <div className="flex flex-col items-start min-w-0">
                                            <span className="text-md font-black italic">Sick Report</span>
                                            <span className="text-[9px] text-muted-foreground uppercase font-black">Report Absence</span>
                                        </div>
                                    </Button>
                                }
                            />
                        </div>



                        <div className="h-[1px] bg-border/50" />

                        {/* 3. Holidays & Birthdays Grid (Half-Half) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                                    <Sun className="h-3 w-3 text-amber-500" /> Public Holidays
                                </h3>
                                <HolidayWidget storeId={employee.storeId?._id || employee.storeId} />
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                                    <Star className="h-3 w-3 text-primary" /> Birthdays
                                </h3>
                                <BirthdayWidget storeId={employee.storeId?._id || employee.storeId} currentUserId={employee._id} />
                            </div>
                        </div>
                    </Card>

                    <HolidayGreetingWidget />
                </div>

                {/* 4. Official Notices */}
                <div className="grid grid-cols-1 gap-8 pb-12 items-stretch">
                    <Card className="border shadow-sm h-full flex flex-col min-h-[500px]">
                        <CardHeader className="py-3 px-4 bg-muted/5 border-b shrink-0">
                            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-primary" /> Official Company Notices
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-hidden">
                            <NoticeBoard userId={employee._id} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}

// Ensure necessary imports are present or updated in parent file imports if needed, 
// but since I'm rewriting the whole body I'll add them to the top block.

