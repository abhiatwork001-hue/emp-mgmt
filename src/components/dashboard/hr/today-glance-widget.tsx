"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserX, Palmtree } from "lucide-react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";

interface TodayGlanceWidgetProps {
    workingCount?: number;
    absentCount?: number;
    vacationCount?: number;
}

export function TodayGlanceWidget({
    workingCount = 0,
    absentCount = 0,
    vacationCount = 0
}: TodayGlanceWidgetProps) {
    const t = useTranslations("Dashboard.hr.todayGlance");

    const stats = [
        {
            label: t('working'),
            value: workingCount,
            icon: Users,
            color: "text-green-600 dark:text-green-400",
            bgColor: "bg-green-50 dark:bg-green-950/30",
            borderColor: "border-green-200 dark:border-green-800"
        },
        {
            label: t('absent'),
            value: absentCount,
            icon: UserX,
            color: "text-red-600 dark:text-red-400",
            bgColor: "bg-red-50 dark:bg-red-950/30",
            borderColor: "border-red-200 dark:border-red-800"
        },
        {
            label: t('onVacation'),
            value: vacationCount,
            icon: Palmtree,
            color: "text-blue-600 dark:text-blue-400",
            bgColor: "bg-blue-50 dark:bg-blue-950/30",
            borderColor: "border-blue-200 dark:border-blue-800"
        }
    ];

    return (
        <Card className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    {t('title')}
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Today
                    </span>
                </CardTitle>
                <p className="text-sm font-medium text-muted-foreground mt-1">
                    Real-time status • {format(new Date(), 'PPP')}
                </p>
            </CardHeader>
            <CardContent className="px-6 pb-6">
                <div className="grid grid-cols-3 gap-3">
                    {stats.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <div
                                key={index}
                                className={`p-4 rounded-lg border-2 ${stat.bgColor} ${stat.borderColor} flex flex-col items-center justify-center text-center`}
                            >
                                <Icon className={`h-6 w-6 mb-2 ${stat.color}`} />
                                <div className={`text-3xl font-black mb-1 ${stat.color}`}>{stat.value}</div>
                                <div className="text-xs font-bold text-foreground/70 uppercase tracking-tight">
                                    {stat.label}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
