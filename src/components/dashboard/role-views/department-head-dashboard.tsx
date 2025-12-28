"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ClipboardList, Package, MessageSquare, Sun, CheckCircle2 } from "lucide-react";
import { PendingApprovalsCard } from "@/components/dashboard/pending-approvals-card";
import { EmployeeScheduleTab } from "@/components/employees/employee-schedule-tab";

interface DepartmentHeadDashboardProps {
    employee: any;
    pendingRequests: any[];
    deptStats: {
        totalEmployees: number;
        onVacation: number;
        todayShifts: number;
    };
}

export function DepartmentHeadDashboard({ employee, pendingRequests, deptStats }: DepartmentHeadDashboardProps) {
    const [greeting, setGreeting] = useState("");

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting("Good Morning");
        else if (hour < 18) setGreeting("Good Afternoon");
        else setGreeting("Good Evening");
    }, []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">
                        {greeting}, Head {employee.firstName}
                    </h2>
                    <p className="text-zinc-400">
                        Overview for {employee.storeDepartmentId?.name || "Your Department"} at {employee.storeId?.name || "Store"}.
                    </p>
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
                        <CardTitle className="text-sm font-medium text-zinc-400">Team Today</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{deptStats.todayShifts} / {deptStats.totalEmployees}</div>
                        <p className="text-xs text-zinc-500 mt-1">members on shift</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#1e293b] border-none text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Team Vacation</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            {deptStats.onVacation}
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">members away</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#1e293b] border-none text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Approvals</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${pendingRequests.length > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                            {pendingRequests.length}
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">pending requests</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#1e293b] border-none text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Next Meeting</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold">14:00 Today</div>
                        <p className="text-xs text-zinc-500 mt-1">Weekly Ops Review</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Pending Approvals */}
                    {pendingRequests.length > 0 ? (
                        <PendingApprovalsCard pendingRequests={pendingRequests} />
                    ) : (
                        <Card className="bg-[#1e293b] border-none text-white">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-emerald-400">
                                    <CheckCircle2 className="h-5 w-5" /> All Caught Up
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-zinc-400">No pending requests for your department.</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Department Schedule Preview - reusing employee schedule tab but could be customized for dept view */}
                    {/* Ideally we show the schedule for the whole department here. Using EmployeeScheduleTab for personal view + link to full dept schedule */}
                    <Card className="bg-[#1e293b] border-none text-white">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>My Schedule</CardTitle>
                            <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300">View Full Dept Schedule</Button>
                        </CardHeader>
                        <CardContent>
                            <EmployeeScheduleTab employeeId={employee._id.toString()} />
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card className="bg-[#1e293b] border-none text-white">
                        <CardHeader>
                            <CardTitle>Department Tools</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button variant="outline" className="w-full justify-start border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                                <Calendar className="mr-2 h-4 w-4" /> Create Schedule
                            </Button>

                            <Button variant="outline" className="w-full justify-start border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                                <Package className="mr-2 h-4 w-4" /> Inventory Check
                            </Button>

                            <Button variant="outline" className="w-full justify-start border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                                <ClipboardList className="mr-2 h-4 w-4" /> Assigned Tasks
                            </Button>

                            <Button variant="outline" className="w-full justify-start border-zinc-700 hover:bg-zinc-800 text-zinc-300 opacity-50 cursor-not-allowed" title="Coming Soon">
                                <MessageSquare className="mr-2 h-4 w-4" /> Message Team
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Tasks */}
                    <Card className="bg-[#1e293b] border-none text-white">
                        <CardHeader>
                            <CardTitle className="text-sm">Pending Tasks</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-3 bg-[#0f172a] rounded-lg border border-zinc-800">
                                    <div className="h-4 w-4 rounded border border-zinc-600" />
                                    <div className="flex-1">
                                        <div className="font-medium text-sm">Approve overtime</div>
                                        <div className="text-xs text-zinc-500">John Doe - 2h</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-[#0f172a] rounded-lg border border-zinc-800">
                                    <div className="h-4 w-4 rounded border border-zinc-600" />
                                    <div className="flex-1">
                                        <div className="font-medium text-sm">Submit defect report</div>
                                        <div className="text-xs text-zinc-500">Coffee Machine</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
