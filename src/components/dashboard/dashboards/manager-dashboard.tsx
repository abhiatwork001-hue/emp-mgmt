"use client";

import { StatsCards } from "@/components/dashboard/stats-cards";
import { EmployeeStatusList } from "@/components/dashboard/employee-status-list";
import { UpcomingVacations } from "@/components/dashboard/upcoming-vacations";
import { PendingApprovalsCard } from "@/components/dashboard/pending-approvals-card";
import { ScheduleOverview } from "@/components/dashboard/schedule-overview";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Plus, Users, Store as StoreIcon } from "lucide-react";
import Link from "next/link";

interface ManagerDashboardProps {
    data: any;
    userRole: string;
}

export function ManagerDashboard({ data, userRole }: ManagerDashboardProps) {
    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Store Manager Dashboard</h2>
                    <p className="text-slate-400">Overview of your store operations and schedules.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">Role:</span>
                    <div className="flex items-center gap-2 rounded-md border border-zinc-700 bg-slate-900 px-3 py-1.5 text-sm text-white capitalize">
                        <StoreIcon className="h-4 w-4" /> {userRole.replace('_', ' ')}
                    </div>
                </div>
            </div>

            {/* Stats Overview - Scoped to Store */}
            <StatsCards stats={data.stats} />

            <div className="grid gap-8 lg:grid-cols-2">
                {/* Left Column */}
                <div className="space-y-8">
                    <EmployeeStatusList employees={data.employeeList} />
                    <UpcomingVacations vacations={data.upcomingVacations} />
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                    <PendingApprovalsCard pendingRequests={data.pendingRequests} />
                    <ScheduleOverview schedules={data.recentSchedules} />
                </div>
            </div>

            {/* Quick Actions Footer - Tailored for Manager */}
            <div className="rounded-xl border border-zinc-800 bg-slate-900/50 p-6">
                <h3 className="mb-4 text-lg font-medium text-white">Manager Actions</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Button variant="outline" className="h-12 justify-start gap-2 border-zinc-700 bg-slate-900 text-slate-300 hover:bg-slate-800" asChild>
                        <Link href="/dashboard/schedules">
                            <Calendar className="h-4 w-4" /> Manage Schedules
                        </Link>
                    </Button>
                    <Button variant="outline" className="h-12 justify-start gap-2 border-zinc-700 bg-slate-900 text-slate-300 hover:bg-slate-800" asChild>
                        <Link href="/dashboard/store-departments">
                            <Users className="h-4 w-4" /> Manage Departments
                        </Link>
                    </Button>
                    <Button variant="outline" className="h-12 justify-start gap-2 border-zinc-700 bg-slate-900 text-slate-300 hover:bg-slate-800" asChild>
                        <Link href="/dashboard/schedules/new">
                            <Plus className="h-4 w-4" /> Create Schedule
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
