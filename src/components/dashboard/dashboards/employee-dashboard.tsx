"use client";

import { UpcomingVacations } from "@/components/dashboard/upcoming-vacations";
import { ScheduleOverview } from "@/components/dashboard/schedule-overview";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface EmployeeDashboardProps {
    data: any;
    userRole: string;
    userName?: string;
    userImage?: string;
}

export function EmployeeDashboard({ data, userRole, userName, userImage }: EmployeeDashboardProps) {
    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">My Dashboard</h2>
                    <p className="text-slate-400">Welcome back! Check your schedule and upcoming events.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">Role:</span>
                    <div className="flex items-center gap-2 rounded-md border border-zinc-700 bg-slate-900 px-3 py-1.5 text-sm text-white capitalize">
                        <User className="h-4 w-4" /> {userRole}
                    </div>
                </div>
            </div>

            {/* Personal Summary Card? - Reuse StatsCards but maybe just showing "My Hours" or "Vacation Left" if we had that data passed easily.
                 For now, reusing StatsCards might show company data which we blanked out.
                 If data.stats items are 0/hidden, we might want to skip or show a personal summary.
                 Let's assume data.stats is filtered to personal or 0.
             */}

            {/* Instead of company stats, let's show a personal welcome card or next shift */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-slate-900/50 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-200">
                            Next Shift
                        </CardTitle>
                        <Calendar className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">--</div>
                        {/* Placeholder as we didn't calculate "next shift" specifically in actions yet, 
                            but could derive from schedule list if passed. 
                            For now, keeping simple. */}
                        <p className="text-xs text-slate-500">Check schedule overview</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                {/* Left Column: My Upcoming Vacations (or status) */}
                <div className="space-y-8">
                    <UpcomingVacations vacations={data.upcomingVacations} />
                </div>

                {/* Right Column: Public/My Schedules */}
                <div className="space-y-8">
                    <ScheduleOverview schedules={data.recentSchedules} />
                </div>
            </div>

            {/* Quick Actions Footer - Tailored for Employee */}
            <div className="rounded-xl border border-zinc-800 bg-slate-900/50 p-6">
                <h3 className="mb-4 text-lg font-medium text-white">My Actions</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Button variant="outline" className="h-12 justify-start gap-2 border-zinc-700 bg-slate-900 text-slate-300 hover:bg-slate-800" asChild>
                        <Link href="/dashboard/schedules">
                            <Calendar className="h-4 w-4" /> View My Schedule
                        </Link>
                    </Button>
                    <Button variant="outline" className="h-12 justify-start gap-2 border-zinc-700 bg-slate-900 text-slate-300 hover:bg-slate-800" asChild>
                        <Link href="/dashboard/vacations">
                            <Clock className="h-4 w-4" /> Request Vacation
                        </Link>
                    </Button>
                    <Button variant="outline" className="h-12 justify-start gap-2 border-zinc-700 bg-slate-900 text-slate-300 hover:bg-slate-800" asChild>
                        <Link href="/profile">
                            <User className="h-4 w-4" /> Edit Profile
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
