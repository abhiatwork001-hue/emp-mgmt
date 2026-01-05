"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";

export function TipsChart({ data }: { data: any[] }) {
    // Process data for chart
    // Aggregate by month or just show last N distributions?
    // Let's show last 10 distributions chronological
    const chartData = [...data]
        .sort((a, b) => new Date(a.weekStartDate).getTime() - new Date(b.weekStartDate).getTime())
        .slice(-10)
        .map(d => ({
            name: format(new Date(d.weekStartDate), "MMM d"),
            amount: d.totalAmount,
            employees: d.records.length
        }));

    return (
        <Card>
            <CardHeader>
                <CardTitle>Distribution Trends</CardTitle>
                <CardDescription>Total distributed amount per finalized period.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <XAxis
                                dataKey="name"
                                stroke="var(--muted-foreground)"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="var(--muted-foreground)"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `$${value}`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--card)',
                                    borderColor: 'var(--border)',
                                    borderRadius: '8px',
                                    color: 'var(--foreground)'
                                }}
                                cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                            />
                            <Bar
                                dataKey="amount"
                                fill="var(--primary)"
                                radius={[4, 4, 0, 0]}
                                name="Total Amount ($)"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
