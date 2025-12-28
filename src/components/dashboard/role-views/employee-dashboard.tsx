"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Sun, MessageSquare, Briefcase, User, Star, Utensils } from "lucide-react";
import { format } from "date-fns";
import { EmployeeScheduleTab } from "@/components/employees/employee-schedule-tab"; // Reusing for schedule view
import { useRouter } from "next/navigation";
import { RequestVacationDialog } from "@/components/vacations/request-vacation-dialog";
import { ReportAbsenceDialog } from "@/components/absences/report-absence-dialog";

interface EmployeeDashboardProps {
    employee: any;
}

export function EmployeeDashboard({ employee }: EmployeeDashboardProps) {
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
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">
                        {greeting}, {employee.firstName}
                    </h2>
                    <p className="text-zinc-400">Here's what's happening today.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-[#1e293b] px-3 py-1.5 rounded-full border border-zinc-700">
                        <Sun className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium text-white">24°C Sunny</span>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-[#1e293b] border-none text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Vacations Remaining</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{vacationTracker.remainingDays} <span className="text-sm font-normal text-zinc-500">days</span></div>
                        <div className="mt-1 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500"
                                style={{ width: `${(vacationTracker.remainingDays / vacationTracker.defaultDays) * 100}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#1e293b] border-none text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Next Vacation</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {nextVacation ? (
                            <>
                                <div className="text-lg font-bold truncate">{format(new Date(nextVacation.from), "MMM dd, yyyy")}</div>
                                <div className="text-xs text-zinc-500 mt-1">in {Math.ceil((new Date(nextVacation.from).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days</div>
                            </>
                        ) : (
                            <>
                                <div className="text-lg font-bold text-zinc-500">Not Scheduled</div>
                                <div className="text-xs text-zinc-600 mt-1">Plan your time off!</div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-[#1e293b] border-none text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Day Off Counter</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">2 <span className="text-sm font-normal text-zinc-500">stored</span></div>
                        <p className="text-xs text-zinc-500 mt-1">Earned from overtime</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#1e293b] border-none text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Messages</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">0 <span className="text-sm font-normal text-zinc-500">new</span></div>
                        <p className="text-xs text-zinc-500 mt-1">No urgent alerts</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main: Schedule */}
                <div className="lg:col-span-2 space-y-6">
                    <EmployeeScheduleTab employeeId={employee._id.toString()} />

                    {/* Recipes Access Placeholder */}
                    <Card className="bg-[#1e293b] border-none text-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Utensils className="h-5 w-5 text-zinc-400" />
                                Knowledge Base & Recipes
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="p-8 border border-dashed border-zinc-700 rounded-lg text-center text-zinc-500">
                                <p>Access to company recipes and training materials coming soon!</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar: Quick Actions */}
                <div className="space-y-6">
                    <Card className="bg-[#1e293b] border-none text-white">
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <RequestVacationDialog
                                employeeId={employee._id.toString()}
                                remainingDays={vacationTracker.remainingDays}
                                trigger={
                                    <Button variant="outline" className="w-full justify-start border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                                        <Calendar className="mr-2 h-4 w-4" /> Request Vacation
                                    </Button>
                                }
                            />

                            <ReportAbsenceDialog
                                employeeId={employee._id.toString()}
                                trigger={
                                    <Button variant="outline" className="w-full justify-start border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                                        <User className="mr-2 h-4 w-4" /> Report Absence / Day Off
                                    </Button>
                                }
                            />

                            <Button variant="outline" className="w-full justify-start border-zinc-700 hover:bg-zinc-800 text-zinc-300 opacity-50 cursor-not-allowed" title="Coming Soon">
                                <Clock className="mr-2 h-4 w-4" /> Request Overtime
                            </Button>

                            <Button variant="outline" className="w-full justify-start border-zinc-700 hover:bg-zinc-800 text-zinc-300 opacity-50 cursor-not-allowed" title="Coming Soon">
                                <Briefcase className="mr-2 h-4 w-4" /> Swap Shift
                            </Button>

                            <Button variant="outline" className="w-full justify-start border-zinc-700 hover:bg-zinc-800 text-zinc-300 opacity-50 cursor-not-allowed" title="Coming Soon">
                                <MessageSquare className="mr-2 h-4 w-4" /> Message Admin
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Today's Team Placeholder */}
                    <Card className="bg-[#1e293b] border-none text-white">
                        <CardHeader>
                            <CardTitle className="text-sm">Working with you today</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold">JD</div>
                                    <div>
                                        <div className="text-sm font-medium">John Doe</div>
                                        <div className="text-xs text-zinc-500">Waitstaff</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold">AS</div>
                                    <div>
                                        <div className="text-sm font-medium">Alice Smith</div>
                                        <div className="text-xs text-zinc-500">Manager</div>
                                    </div>
                                </div>
                                <p className="text-xs text-zinc-500 pt-2 text-center">View full schedule details</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
