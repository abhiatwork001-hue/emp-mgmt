"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, CheckCircle2, Clock, PlayCircle } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface ScheduleSummary {
    _id: string;
    storeId: { name: string };
    storeDepartmentId: { name: string };
    dateRange: { startDate: string; endDate: string };
    status: string;
    createdBy: { firstName: string; lastName: string };
}

export function ScheduleOverview({ schedules }: { schedules: ScheduleSummary[] }) {
    const approvedCount = schedules.filter(s => s.status === 'published' || s.status === 'approved').length;
    const pendingCount = schedules.filter(s => s.status === 'review' || s.status === 'pending').length;
    const inProgressCount = schedules.filter(s => s.status === 'draft').length;

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-medium text-white">Schedule Overview</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex items-center gap-4 rounded-lg bg-slate-900/50 p-4 border border-zinc-800">
                    <CheckCircle2 className="h-8 w-8 text-white" />
                    <div>
                        <div className="text-2xl font-bold text-white">{approvedCount}</div>
                        <div className="text-xs text-slate-500">Approved</div>
                    </div>
                </div>
                <div className="flex items-center gap-4 rounded-lg bg-slate-900/50 p-4 border border-zinc-800">
                    <Clock className="h-8 w-8 text-white" />
                    <div>
                        <div className="text-2xl font-bold text-white">{pendingCount}</div>
                        <div className="text-xs text-slate-500">Pending Approval</div>
                    </div>
                </div>
                <div className="flex items-center gap-4 rounded-lg bg-slate-900/50 p-4 border border-zinc-800 md:col-span-2">
                    <PlayCircle className="h-8 w-8 text-white" />
                    <div>
                        <div className="text-2xl font-bold text-white">{inProgressCount}</div>
                        <div className="text-xs text-slate-500">In Progress</div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-slate-400">Recent Schedules</h4>
                </div>
                {schedules.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">No recent schedules.</div>
                ) : (
                    schedules.map((schedule) => (
                        <div key={schedule._id} className="rounded-lg border border-zinc-800 bg-slate-900 p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex gap-3">
                                    <div className="mt-1 grid h-8 w-8 place-items-center rounded bg-purple-500/10 text-purple-400">
                                        <CalendarDays className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-white">Week of {format(new Date(schedule.dateRange.startDate), "MMM dd, yyyy")}</span>
                                            <Badge variant="secondary" className={`capitalize ${schedule.status === 'published' ? 'bg-emerald-500/10 text-emerald-400' :
                                                    schedule.status === 'draft' ? 'bg-slate-500/10 text-slate-400' :
                                                        'bg-amber-500/10 text-amber-400'
                                                }`}>
                                                {schedule.status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-slate-400">
                                            {schedule.storeId?.name} • {schedule.storeDepartmentId?.name}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Created by {schedule.createdBy?.firstName} {schedule.createdBy?.lastName}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500">
                                    {format(new Date(schedule.dateRange.endDate), "yyyy-MM-dd")}
                                </div>
                            </div>

                            <div className="mt-4 flex justify-end gap-2">
                                <Button variant="outline" size="sm" className="h-8 border-zinc-700 bg-transparent text-slate-300 hover:bg-slate-800" asChild>
                                    <Link href={`/dashboard/schedules/${schedule._id}`}>View Schedule</Link>
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
