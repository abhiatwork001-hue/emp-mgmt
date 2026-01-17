"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, Clock, CalendarDays, Briefcase, AlertOctagon, Activity } from "lucide-react";
import { useTranslations } from "next-intl";

interface KPIData {
    value: string | number;
    trend: number;
}

interface KPIGridProps {
    kpis: {
        totalEmployees: KPIData;
        activeToday: KPIData;
        absenceRate: KPIData;
        overtime: KPIData;
        vacationLiability: KPIData;
        openIssues: KPIData;
    };
}

export function KPIGrid({ kpis }: KPIGridProps) {
    const t = useTranslations("OwnerDashboard.kpi");

    const items = [
        {
            icon: Users,
            label: t("totalEmployees"),
            value: kpis.totalEmployees.value,
            color: "text-blue-600",
            bg: "bg-blue-100 dark:bg-blue-900/20"
        },
        {
            icon: Activity,
            label: t("activeToday"),
            value: kpis.activeToday.value,
            color: "text-emerald-600",
            bg: "bg-emerald-100 dark:bg-emerald-900/20"
        },
        {
            icon: CalendarDays,
            label: t("absenceRate"),
            value: `${kpis.absenceRate.value}%`,
            color: "text-orange-600",
            bg: "bg-orange-100 dark:bg-orange-900/20"
        },
        {
            icon: Clock,
            label: t("overtime"),
            value: `${kpis.overtime.value}h`,
            color: "text-purple-600",
            bg: "bg-purple-100 dark:bg-purple-900/20"
        },
        {
            icon: Briefcase,
            label: t("vacationLiability"),
            value: `${kpis.vacationLiability.value} days`,
            color: "text-indigo-600",
            bg: "bg-indigo-100 dark:bg-indigo-900/20"
        },
        {
            icon: AlertOctagon,
            label: t("openIssues"),
            value: kpis.openIssues.value,
            color: "text-red-600",
            bg: "bg-red-100 dark:bg-red-900/20"
        }
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {items.map((item, i) => (
                <Card key={i} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                            <div className={`p-2 rounded-lg ${item.bg} ${item.color}`}>
                                <item.icon className="h-5 w-5" />
                            </div>
                            {/* Trend placeholder - could be passed in props later */}
                            {/* <span className="text-xs font-medium text-emerald-600 flex items-center">
                                +2%
                            </span> */}
                        </div>
                        <div>
                            <span className="text-2xl font-bold block">{item.value}</span>
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                {item.label}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
