"use client";

import { useEffect, useState } from "react";
import { getStoreTaskProgress } from "@/lib/actions/task-analytics.actions";
import { TrendingUp, BarChart3, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

export function StoreTaskProgress() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProgress = async () => {
            const res = await getStoreTaskProgress();
            setData(res);
            setLoading(false);
        };
        fetchProgress();
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-12 space-y-4 text-muted-foreground animate-pulse">
            <BarChart3 className="h-10 w-10 opacity-20" />
            <p className="text-sm font-medium tracking-widest uppercase">Analyzing Store Logistics...</p>
        </div>
    );

    const globalAverage = data.length > 0
        ? Math.round(data.reduce((acc, curr) => acc + curr.percentage, 0) / data.length)
        : 0;

    // Prepare data for chart - Sort by performance
    const chartData = [...data]
        .sort((a, b) => b.percentage - a.percentage)
        .map(item => ({
            name: item.storeName.split(' ')[0], // Short name
            fullName: item.storeName,
            score: item.percentage,
            tasks: `${item.completed}/${item.total}`,
            status: item.percentage === 100 ? 'optimal' : item.percentage >= 60 ? 'good' : 'critical'
        }));

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-background/95 backdrop-blur-md border border-border p-3 rounded-xl shadow-xl">
                    <p className="text-sm font-bold mb-1">{data.fullName}</p>
                    <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full",
                            data.score === 100 ? "bg-yellow-500" :
                                data.score >= 60 ? "bg-primary" : "bg-destructive"
                        )} />
                        <span className="font-mono font-bold text-lg">{data.score}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                        {data.tasks} Tasks Complete
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-end justify-between gap-6 pb-4 border-b border-border/10">
                <div className="space-y-1">
                    <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Network Performance
                    </h2>
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
                        Real-time Task Completion Metrics
                    </p>
                </div>
                <div className="flex items-center gap-8">
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Global Avg.</p>
                        <p className="text-3xl font-black text-foreground tracking-tighter flex items-center justify-end gap-1">
                            {globalAverage}<span className="text-sm text-muted-foreground">%</span>
                        </p>
                    </div>
                    <div className="h-8 w-px bg-border/40" />
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Active Nodes</p>
                        <p className="text-3xl font-black text-foreground tracking-tighter">{data.length}</p>
                    </div>
                </div>
            </div>

            {/* Main Chart Area */}
            {data.length > 0 ? (
                <div className="h-[350px] w-full bg-gradient-to-b from-transparent to-primary/5 rounded-3xl border border-border/20 p-6 relative overflow-hidden">
                    {/* Background Grid Pattern */}
                    <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.1} />
                            <XAxis
                                dataKey="name"
                                tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 700 }}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                domain={[0, 100]}
                                tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 700 }}
                                tickLine={false}
                                axisLine={false}
                                dx={-10}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--primary)', opacity: 0.05 }} />
                            <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={50} animationDuration={1500}>
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={
                                            entry.score === 100 ? '#eab308' :
                                                entry.score >= 60 ? 'var(--primary)' :
                                                    'var(--destructive)'
                                        }
                                        className="transition-all duration-300 hover:opacity-80"
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="text-center p-20 border-2 border-dashed border-border/40 rounded-[2rem] bg-muted/5">
                    <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">No Performance Data Available</p>
                </div>
            )}

            {/* Legend/Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-yellow-600">Excellence</span>
                    </div>
                    <span className="text-xl font-black text-yellow-600">{chartData.filter(d => d.score === 100).length}</span>
                </div>
                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">On Track</span>
                    </div>
                    <span className="text-xl font-black text-primary">{chartData.filter(d => d.score >= 60 && d.score < 100).length}</span>
                </div>
                <div className="bg-destructive/5 border border-destructive/10 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-destructive" />
                        <span className="text-xs font-bold uppercase tracking-wider text-destructive">Critical</span>
                    </div>
                    <span className="text-xl font-black text-destructive">{chartData.filter(d => d.score < 60).length}</span>
                </div>
            </div>
        </div>
    );
}
