"use client";

import { StatsCards } from "@/components/dashboard/stats-cards";
import { EmployeeStatusList } from "@/components/dashboard/employee-status-list";
import { UpcomingVacations } from "@/components/dashboard/upcoming-vacations";
import { ScheduleOverview } from "@/components/dashboard/schedule-overview";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Plus, Users, LayoutList } from "lucide-react";
import Link from "next/link";
import { PendingApprovals } from "../pending-approvals-card";

interface DepartmentHeadDashboardProps {
    data: any;
    userRole: string;
}

export function DepartmentHeadDashboard({ data, userRole }: DepartmentHeadDashboardProps) {
    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Department Dashboard</h2>
                    <p className="text-slate-400">Manage your department's schedule and team.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">Role:</span>
                    <div className="flex items-center gap-2 rounded-md border border-zinc-700 bg-slate-900 px-3 py-1.5 text-sm text-white capitalize">
                        <LayoutList className="h-4 w-4" /> {userRole.replace('_', ' ')}
                    </div>
                </div>
            </div>

            {/* Department Stats */}
            <StatsCards stats={data.stats} />

            <div className="grid gap-8 lg:grid-cols-2">
                {/* Left Column */}
                <div className="space-y-8">
                    {/* Team Status */}
                    <EmployeeStatusList employees={data.employeeList} />
                    <UpcomingVacations vacations={data.upcomingVacations} />
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                    {/* Head manages approvals for their department?? Assuming yes based on prompt "can create schedule... ask for vacation" context implies some management */}
                    {/* Actually prompt says "create schedule for the particular storeDepartment" */}
                    {/* Assuming they also handle basic requests or see them */}
                    <PendingApprovalsCard pendingRequests={data.pendingRequests} />
                    <ScheduleOverview schedules={data.recentSchedules} />
                </div>
            </div>

            {/* Quick Actions Footer - Tailored for Dept Head */}
            <div className="rounded-xl border border-zinc-800 bg-slate-900/50 p-6">
                <h3 className="mb-4 text-lg font-medium text-white">Department Actions</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Button variant="outline" className="h-12 justify-start gap-2 border-zinc-700 bg-slate-900 text-slate-300 hover:bg-slate-800" asChild>
                        <Link href="/dashboard/schedules">
                            <Calendar className="h-4 w-4" /> View Team Schedule
                        </Link>
                    </Button>
                    <Button variant="outline" className="h-12 justify-start gap-2 border-zinc-700 bg-slate-900 text-slate-300 hover:bg-slate-800" asChild>
                        <Link href="/dashboard/schedules/new">
                            <Plus className="h-4 w-4" /> Create Dept Schedule
                        </Link>
                    </Button>
                    <Button variant="outline" className="h-12 justify-start gap-2 border-zinc-700 bg-slate-900 text-slate-300 hover:bg-slate-800" asChild>
                        <Link href="/dashboard/employees">
                            <Users className="h-4 w-4" /> View My Team
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
