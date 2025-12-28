"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ClipboardList, Users, Package, TrendingUp, AlertCircle, ShoppingCart, MessageSquare, Sun, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { PendingApprovalsCard } from "@/components/dashboard/pending-approvals-card";

interface StoreManagerDashboardProps {
    employee: any;
    pendingRequests: any[];
    storeStats: {
        totalEmployees: number;
        onVacation: number;
        todayShifts: number;
    };
}

export function StoreManagerDashboard({ employee, pendingRequests, storeStats }: StoreManagerDashboardProps) {
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
                        {greeting}, Manager {employee.firstName}
                    </h2>
                    <p className="text-zinc-400">Store overview for {employee.storeId?.name || "Your Store"} today.</p>
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
                        <CardTitle className="text-sm font-medium text-zinc-400">Employees & Shifts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{storeStats.todayShifts} / {storeStats.totalEmployees}</div>
                        <p className="text-xs text-zinc-500 mt-1">staff working today</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#1e293b] border-none text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">On Vacation</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            {storeStats.onVacation}
                            {storeStats.onVacation > 0 && <span className="flex h-2 w-2 rounded-full bg-amber-500" />}
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">employees absent</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#1e293b] border-none text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Pending Approvals</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${pendingRequests.length > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                            {pendingRequests.length}
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">requests require action</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#1e293b] border-none text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Tasks Completion</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">85%</div>
                        <div className="mt-1 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: '85%' }} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content: Approvals and Tasks */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Pending Approvals Widget */}
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
                                <p className="text-zinc-400">No pending vacation or schedule requests.</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Task Lists (Placeholder) */}
                    <Card className="bg-[#1e293b] border-none text-white">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Daily Tasks</CardTitle>
                            <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300">View All</Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-3 bg-[#0f172a] rounded-lg border border-zinc-800">
                                    <div className="h-5 w-5 rounded-full border-2 border-zinc-600" />
                                    <div className="flex-1">
                                        <div className="font-medium text-sm">Morning Inventory Check</div>
                                        <div className="text-xs text-zinc-500">Kitchen & Bar</div>
                                    </div>
                                    <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">High</Badge>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-[#0f172a] rounded-lg border border-zinc-800">
                                    <div className="h-5 w-5 rounded-full border-2 border-zinc-600" />
                                    <div className="flex-1">
                                        <div className="font-medium text-sm">Review Schedule for Next Week</div>
                                        <div className="text-xs text-zinc-500">Due by 5 PM</div>
                                    </div>
                                    <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">Medium</Badge>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-[#0f172a] rounded-lg border border-zinc-800 opacity-50">
                                    <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                        <CheckCircle2 className="h-3 w-3 text-black" />
                                    </div>
                                    <div className="flex-1 line-through text-zinc-500">
                                        <div className="font-medium text-sm">Submit Sales Report</div>
                                    </div>
                                    <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">Done</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar: Management Actions */}
                <div className="space-y-6">
                    <Card className="bg-[#1e293b] border-none text-white">
                        <CardHeader>
                            <CardTitle>Management Tools</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Link href="/dashboard/schedules" className="block">
                                <Button variant="outline" className="w-full justify-start border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                                    <Calendar className="mr-2 h-4 w-4" /> Manage Schedules
                                </Button>
                            </Link>

                            <Link href="/dashboard/employees" className="block">
                                <Button variant="outline" className="w-full justify-start border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                                    <Users className="mr-2 h-4 w-4" /> Manage Employees
                                </Button>
                            </Link>

                            <Button variant="outline" className="w-full justify-start border-zinc-700 hover:bg-zinc-800 text-zinc-300 opacity-50 cursor-not-allowed" title="Coming Soon">
                                <ShoppingCart className="mr-2 h-4 w-4" /> Place Orders
                            </Button>

                            <Button variant="outline" className="w-full justify-start border-zinc-700 hover:bg-zinc-800 text-zinc-300 opacity-50 cursor-not-allowed" title="Coming Soon">
                                <Package className="mr-2 h-4 w-4" /> Inventory
                            </Button>

                            <Button variant="outline" className="w-full justify-start border-zinc-700 hover:bg-zinc-800 text-zinc-300 opacity-50 cursor-not-allowed" title="Coming Soon">
                                <TrendingUp className="mr-2 h-4 w-4" /> Tips Distribution
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Department Status */}
                    <Card className="bg-[#1e293b] border-none text-white">
                        <CardHeader>
                            <CardTitle className="text-sm">Department Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-400">Kitchen</span>
                                    <Badge className="bg-emerald-500/10 text-emerald-400 border-none">Operating Normal</Badge>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-400">Front of House</span>
                                    <Badge className="bg-emerald-500/10 text-emerald-400 border-none">Operating Normal</Badge>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-400">Bar</span>
                                    <Badge className="bg-amber-500/10 text-amber-400 border-none">Understaffed</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
