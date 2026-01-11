"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, CalendarDays, AlertCircle, Clock, Timer } from "lucide-react";

// ... (imports remain)
import { useTranslations } from "next-intl";

interface DashboardStats {
    totalEmployees: number;
    activeEmployees: number;
    onVacation: number;
    absentToday: number;
    pendingApprovals: number;
    totalHours: number;
}

export function StatsCards({ stats }: { stats: DashboardStats }) {
    const t = useTranslations("Dashboard.widgets.statsCards");

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Card className="border-none bg-slate-800 text-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2 overflow-hidden">
                    <CardTitle className="text-sm font-medium text-slate-400 truncate" title={t('totalEmployees')}>{t('totalEmployees')}</CardTitle>
                    <Users className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalEmployees}</div>
                </CardContent>
            </Card>

            <Card className="border-none bg-slate-800 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">{t('activeEmployees')}</CardTitle>
                    <UserCheck className="h-4 w-4 text-emerald-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.activeEmployees}</div>
                </CardContent>
            </Card>

            <Card className="border-none bg-slate-800 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">{t('onVacation')}</CardTitle>
                    <CalendarDays className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.onVacation}</div>
                </CardContent>
            </Card>

            <Card className="border-none bg-slate-800 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">{t('absentToday')}</CardTitle>
                    <AlertCircle className="h-4 w-4 text-rose-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.absentToday}</div>
                </CardContent>
            </Card>

            <Card className="border-none bg-slate-800 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">{t('pendingApprovals')}</CardTitle>
                    <Clock className="h-4 w-4 text-amber-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
                </CardContent>
            </Card>

            <Card className="border-none bg-slate-800 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">{t('totalHours')}</CardTitle>
                    <Timer className="h-4 w-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalHours}</div>
                </CardContent>
            </Card>
        </div>
    );
}
