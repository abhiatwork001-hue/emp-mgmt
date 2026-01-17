"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { TrendingUp } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const data = [
    { name: 'Week 1', overtime: 40, absence: 24 },
    { name: 'Week 2', overtime: 30, absence: 13 },
    { name: 'Week 3', overtime: 20, absence: 58 },
    { name: 'Week 4', overtime: 27, absence: 39 },
    { name: 'Week 5', overtime: 18, absence: 48 },
    { name: 'Week 6', overtime: 23, absence: 38 },
    { name: 'Week 7', overtime: 34, absence: 43 },
];

export function CostTrendChart() {
    const t = useTranslations("OwnerDashboard.costTrend");

    return (
        <Card className="h-full">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    {t("title")}
                </CardTitle>
                {/* 30d / 90d toggle would go here */}
            </CardHeader>
            <CardContent className="pt-4 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorOvertime" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorAbsence" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                        <Tooltip />
                        <Area type="monotone" dataKey="overtime" stroke="#4f46e5" fillOpacity={1} fill="url(#colorOvertime)" name={t("overtime")} />
                        <Area type="monotone" dataKey="absence" stroke="#f59e0b" fillOpacity={1} fill="url(#colorAbsence)" name={t("absence")} />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
