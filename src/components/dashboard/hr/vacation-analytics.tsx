"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getVacationAnalytics } from "@/lib/actions/vacation.actions";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
    Legend
} from "recharts";
import { Loader2, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function VacationAnalytics() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const stats = await getVacationAnalytics();
            setData(stats);
            setLoading(false);
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <Card className="h-[400px] flex items-center justify-center border-border/50 bg-card/50 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </Card>
        );
    }

    if (!data) return null;

    const { current, previous } = data;

    // Data for Pie Chart (Current State)
    const pieData = [
        { name: "Taken", value: current.taken, color: "var(--color-emerald-500)" }, // emerald-500 might not be a var, check standard tailwind
        { name: "Remaining", value: current.remaining, color: "var(--primary)" },
    ];

    // Data for Bar Chart (YoY Comparison)
    const yoyData = [
        { name: previous.year.toString(), taken: previous.taken },
        { name: current.year.toString(), taken: current.taken },
    ];

    const takenIncrease = current.taken - previous.taken;
    const isIncrease = takenIncrease > 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Summary Stats */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Owed Days</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold tracking-tight">{current.owed}</div>
                    <p className="text-xs text-muted-foreground mt-1">Company-wide allocation for {current.year}</p>
                </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden group">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Taken vs Previous Year</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline space-x-2">
                        <div className="text-3xl font-bold tracking-tight">{current.taken}</div>
                        <div className={cn(
                            "flex items-center text-sm font-medium",
                            isIncrease ? "text-emerald-500" : "text-amber-500"
                        )}>
                            {isIncrease ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                            {Math.abs(takenIncrease)}
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Difference compared to {previous.year}</p>
                </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden group">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Liability</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold tracking-tight text-primary">{current.remaining}</div>
                    <p className="text-xs text-muted-foreground mt-1">Days yet to be taken this year</p>
                </CardContent>
            </Card>

            {/* Charts Section */}
            <Card className="col-span-full lg:col-span-2 border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
                <CardHeader>
                    <CardTitle>Usage Comparison</CardTitle>
                    <CardDescription>Vacation days taken: {previous.year} vs {current.year}</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={yoyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--popover)',
                                    borderColor: 'var(--border)',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    color: 'var(--popover-foreground)'
                                }}
                                itemStyle={{ color: 'var(--foreground)' }}
                                cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                            />
                            <Bar
                                dataKey="taken"
                                radius={[4, 4, 0, 0]}
                                barSize={40}
                            >
                                {yoyData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={index === 1 ? 'var(--primary)' : 'var(--muted-foreground)'}
                                        fillOpacity={index === 1 ? 1 : 0.5}
                                        strokeWidth={0}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
                <CardHeader>
                    <CardTitle>Current Status</CardTitle>
                    <CardDescription>Allocation Distribution</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex flex-col items-center justify-center">
                    <ResponsiveContainer width="100%" height="80%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="text-center mt-2">
                        <span className="text-2xl font-bold">{Math.round((current.taken / current.owed) * 100)}%</span>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest">Efficiency</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
