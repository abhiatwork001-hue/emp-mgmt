"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

interface DepartmentData {
    department: string;
    days: number;
}

interface VacationDataPoint {
    month: string;
    thisYear: number;
    lastYear: number;
    departments?: DepartmentData[];
}

interface AbsenceDataPoint {
    month: string;
    days: number;
    departments?: DepartmentData[];
}

interface HRInsightsWidgetProps {
    vacationData?: VacationDataPoint[];
    absenceData?: AbsenceDataPoint[];
}

// Custom Tooltip for Vacation Chart
const VacationTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
            <p className="font-bold text-sm mb-2">{label}</p>
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-[#3b82f6]"></div>
                    <span className="text-xs">This Year: <strong>{data.thisYear} days</strong></span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-[#94a3b8] opacity-70"></div>
                    <span className="text-xs">Last Year: <strong>{data.lastYear} days</strong></span>
                </div>
            </div>
            {data.departments && data.departments.length > 0 && (
                <div className="mt-3 pt-2 border-t border-border">
                    <p className="text-xs font-bold mb-1">By Department:</p>
                    <div className="space-y-1">
                        {data.departments.map((dept: DepartmentData, idx: number) => (
                            <div key={idx} className="text-xs flex justify-between gap-4">
                                <span className="text-muted-foreground">{dept.department}</span>
                                <span className="font-medium">{dept.days} days</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Custom Tooltip for Absence Chart
const AbsenceTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
            <p className="font-bold text-sm mb-2">{label}</p>
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
                    <span className="text-xs">Total: <strong>{data.days} days</strong></span>
                </div>
            </div>
            {data.departments && data.departments.length > 0 && (
                <div className="mt-3 pt-2 border-t border-border">
                    <p className="text-xs font-bold mb-1">By Department:</p>
                    <div className="space-y-1">
                        {data.departments.map((dept: DepartmentData, idx: number) => (
                            <div key={idx} className="text-xs flex justify-between gap-4">
                                <span className="text-muted-foreground">{dept.department}</span>
                                <span className="font-medium">{dept.days} days</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export function HRInsightsWidget({
    vacationData = [],
    absenceData = []
}: HRInsightsWidgetProps) {
    const t = useTranslations("Dashboard.hr.insights");

    return (
        <Card className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    {t('title')}
                </CardTitle>
                <p className="text-sm font-medium text-muted-foreground mt-1">
                    Year-over-year comparison
                </p>
            </CardHeader>
            <CardContent className="px-6 pb-6">
                <div className="space-y-6">
                    {/* Vacation Usage Chart */}
                    <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">{t('vacationUsage')}</h4>
                        <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={vacationData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis
                                    dataKey="month"
                                    className="text-xs"
                                    tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                                />
                                <YAxis
                                    className="text-xs"
                                    tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                                    label={{ value: t('days'), angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: 'hsl(var(--foreground))' } }}
                                />
                                <Tooltip content={<VacationTooltip />} cursor={false} />
                                <Legend
                                    wrapperStyle={{ fontSize: 12 }}
                                />
                                <Bar
                                    dataKey="thisYear"
                                    fill="#3b82f6"
                                    name={t('thisYear')}
                                    radius={[4, 4, 0, 0]}
                                />
                                <Bar
                                    dataKey="lastYear"
                                    fill="#94a3b8"
                                    name={t('lastYear')}
                                    radius={[4, 4, 0, 0]}
                                    opacity={0.7}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Absence Trend Chart */}
                    <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">{t('absenceTrend')} ({t('monthly')})</h4>
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={absenceData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis
                                    dataKey="month"
                                    className="text-xs"
                                    tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                                />
                                <YAxis
                                    className="text-xs"
                                    tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                                    label={{ value: t('days'), angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: 'hsl(var(--foreground))' } }}
                                />
                                <Tooltip content={<AbsenceTooltip />} cursor={false} />
                                <Line
                                    type="monotone"
                                    dataKey="days"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    dot={{ fill: '#ef4444', r: 4 }}
                                    activeDot={{ r: 6 }}

                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
