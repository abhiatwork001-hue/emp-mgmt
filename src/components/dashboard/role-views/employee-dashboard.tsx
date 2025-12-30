"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Sun, MessageSquare, Briefcase, User, Star, Utensils } from "lucide-react";
import { format } from "date-fns";
import { EmployeeScheduleTab } from "@/components/employees/employee-schedule-tab"; // Reusing for schedule view
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RequestVacationDialog } from "@/components/vacations/request-vacation-dialog";
import { ReportAbsenceDialog } from "@/components/absences/report-absence-dialog";
import { HolidayWidget } from "@/components/dashboard/widgets/holiday-widget";
import { BirthdayWidget } from "@/components/dashboard/widgets/birthday-widget";

interface EmployeeDashboardProps {
    employee: any;
    todaysCoworkers?: any[];
    currentScheduleId?: string | null;
    daysUntilNextDayOff?: number;
}

export function EmployeeDashboard({ employee, todaysCoworkers = [], currentScheduleId, daysUntilNextDayOff = 0 }: EmployeeDashboardProps) {
    const router = useRouter();
    const [greeting, setGreeting] = useState("");

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting("Good Morning");
        else if (hour < 18) setGreeting("Good Afternoon");
        else setGreeting("Good Evening");
    }, []);

    // Vacation Stats
    const vacationTracker = employee.vacationTracker || { usedDays: 0, defaultDays: 22, remainingDays: 22 };
    const nextVacation = employee.vacations?.find((v: any) => new Date(v.from) > new Date());

    return (
        <div className="space-y-6">
            {/* Greeting */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        {greeting}, <span className="bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">{employee.firstName}</span>
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium mt-1">Operational status: <span className="text-primary font-bold">Authenticated</span></p>
                </div>
                <div className="flex items-center gap-3 bg-muted/3 p-1.5 rounded-2xl border border-border/40 backdrop-blur-sm">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 h-7 px-3">Active Session</Badge>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card glass className="relative overflow-hidden group">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Vacations Remaining</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold tracking-tighter">{vacationTracker.remainingDays}</span>
                            <span className="text-sm font-medium text-muted-foreground">days</span>
                        </div>
                        <div className="mt-4 h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(vacationTracker.remainingDays / vacationTracker.defaultDays) * 100}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 group-hover:from-emerald-400 group-hover:to-teal-300 transition-all"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card glass className="relative overflow-hidden group">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Next Vacation</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {nextVacation ? (
                            <div className="space-y-1">
                                <div className="text-xl font-bold tracking-tight truncate">{format(new Date(nextVacation.from), "MMM dd, yyyy")}</div>
                                <Badge variant="success" className="text-[10px] py-0 px-2">In {Math.ceil((new Date(nextVacation.from).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days</Badge>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <div className="text-xl font-bold text-muted-foreground italic">None Planned</div>
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Plan your break!</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card glass className="relative overflow-hidden group">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Next Day Off</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold tracking-tighter">{daysUntilNextDayOff === 0 ? "Today" : daysUntilNextDayOff}</span>
                            {daysUntilNextDayOff !== 0 && <span className="text-sm font-medium text-muted-foreground">days</span>}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-1">
                            {daysUntilNextDayOff === 0 ? "Enjoy your rest!" : "Until your break"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main: Schedule */}
                <div className="lg:col-span-2 space-y-6">
                    <EmployeeScheduleTab employeeId={employee._id.toString()} />

                    {currentScheduleId && (
                        <div className="flex justify-end">
                            <Link href={`/dashboard/schedules/${currentScheduleId}`} className="text-sm text-primary hover:underline">
                                View Full Schedule &rarr;
                            </Link>
                        </div>
                    )}
                </div>

                {/* Sidebar: Quick Actions */}
                <div className="space-y-6">
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold uppercase tracking-widest">Employee Services</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <RequestVacationDialog
                                employeeId={employee._id.toString()}
                                remainingDays={vacationTracker.remainingDays}
                                trigger={
                                    <Button variant="outline" className="w-full justify-start h-12 rounded-xl group/btn hover:border-primary/50 transition-all">
                                        <Calendar className="mr-3 h-5 w-5 text-muted-foreground group-hover/btn:text-primary transition-colors" />
                                        <span className="font-semibold">Request Vacation</span>
                                    </Button>
                                }
                            />

                            <ReportAbsenceDialog
                                employeeId={employee._id.toString()}
                                trigger={
                                    <Button variant="outline" className="w-full justify-start h-12 rounded-xl group/btn hover:border-destructive/50 transition-all">
                                        <User className="mr-3 h-5 w-5 text-muted-foreground group-hover/btn:text-destructive transition-colors" />
                                        <span className="font-semibold">Report Absence</span>
                                    </Button>
                                }
                            />
                        </CardContent>
                    </Card>

                    {/* Holiday Widget */}
                    <HolidayWidget storeId={employee.storeId?._id || employee.storeId} />

                    {/* Birthday Widget */}
                    <BirthdayWidget storeId={employee.storeId?._id || employee.storeId} currentUserId={employee._id} />

                    {/* Today's Team */}
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="text-sm">Working with you today</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {todaysCoworkers.length > 0 ? todaysCoworkers.map((cw, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                                            {cw.firstName?.[0]}{cw.lastName?.[0]}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium">{cw.firstName} {cw.lastName}</div>
                                            <div className="text-xs text-muted-foreground capitalize">{cw.position || "Employee"}</div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-sm text-muted-foreground text-center py-2">No other coworkers on shift today.</div>
                                )}

                                {currentScheduleId && (
                                    <Link href={`/dashboard/schedules/${currentScheduleId}`} className="text-xs text-muted-foreground pt-2 text-center block hover:text-primary transition-colors">
                                        View full schedule details
                                    </Link>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
