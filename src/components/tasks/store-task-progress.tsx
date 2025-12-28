"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getStoreTaskProgress } from "@/lib/actions/task-analytics.actions";
import { Building2, Trophy, AlertTriangle, CheckCircle2, TrendingUp, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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

    const excellence = data.filter(d => d.percentage === 100);
    const onTrack = data.filter(d => d.percentage >= 60 && d.percentage < 100);
    const needsAttention = data.filter(d => d.percentage < 60);

    const globalAverage = data.length > 0
        ? Math.round(data.reduce((acc, curr) => acc + curr.percentage, 0) / data.length)
        : 0;

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Global Analytics Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-muted/30 p-8 rounded-[2rem] border border-border/40 backdrop-blur-sm"
            >
                <div className="space-y-1">
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                        <TrendingUp className="h-6 w-6 text-primary" />
                        Network Performance
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">Aggregate Task Completion across all nodes</p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Global Average</p>
                        <p className="text-4xl font-black text-primary tracking-tighter">{globalAverage}%</p>
                    </div>
                    <div className="h-12 w-px bg-border/60" />
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Active Clusters</p>
                        <p className="text-4xl font-black text-foreground tracking-tighter">{data.length}</p>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 gap-8">
                {/* Excellence Tier */}
                {excellence.length > 0 && (
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 px-2">
                            <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 font-black uppercase tracking-widest py-1">Excellence Tier</Badge>
                            <div className="h-px flex-1 bg-gradient-to-r from-yellow-500/20 to-transparent" />
                        </div>
                        <div className="flex flex-wrap gap-6 justify-center md:justify-start">
                            {excellence.map((store, idx) => (
                                <CircularPerformanceCard
                                    key={store.storeId}
                                    store={store}
                                    variant="excellence"
                                    delay={idx * 0.1}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* On Track Tier */}
                {onTrack.length > 0 && (
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 px-2">
                            <Badge className="bg-primary/10 text-primary border-primary/20 font-black uppercase tracking-widest py-1">On Track</Badge>
                            <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                        </div>
                        <div className="flex flex-wrap gap-6 justify-center md:justify-start">
                            {onTrack.map((store, idx) => (
                                <CircularPerformanceCard
                                    key={store.storeId}
                                    store={store}
                                    variant="on-track"
                                    delay={idx * 0.05}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Needs Attention Tier */}
                {needsAttention.length > 0 && (
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 px-2">
                            <Badge className="bg-destructive/10 text-destructive border-destructive/20 font-black uppercase tracking-widest py-1">Critical Priority</Badge>
                            <div className="h-px flex-1 bg-gradient-to-r from-destructive/20 to-transparent" />
                        </div>
                        <div className="flex flex-wrap gap-6 justify-center md:justify-start">
                            {needsAttention.map((store, idx) => (
                                <CircularPerformanceCard
                                    key={store.storeId}
                                    store={store}
                                    variant="critical"
                                    delay={idx * 0.05}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {data.length === 0 && (
                    <div className="text-center p-20 border-2 border-dashed border-border/40 rounded-[3rem] bg-muted/5">
                        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
                        <h3 className="text-lg font-bold">No Operational Data</h3>
                        <p className="text-muted-foreground text-sm">Deployment logs indicate no active task schedules for monitoring nodes.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function CircularPerformanceCard({ store, variant, delay }: { store: any, variant: 'excellence' | 'on-track' | 'critical', delay: number }) {
    const iconMap = {
        excellence: { color: 'text-yellow-500', stroke: '#eab308', bg: 'bg-yellow-500/5', border: 'border-yellow-500/20' },
        'on-track': { color: 'text-primary', stroke: 'hsl(var(--primary))', bg: 'bg-primary/5', border: 'border-primary/10' },
        critical: { color: 'text-destructive', stroke: 'hsl(var(--destructive))', bg: 'bg-destructive/5', border: 'border-destructive/10' }
    };

    const style = iconMap[variant];
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (store.percentage / 100) * circumference;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, duration: 0.5, type: 'spring', stiffness: 100 }}
            className={cn(
                "relative flex flex-col items-center gap-3 p-6 rounded-3xl border bg-card/40 backdrop-blur-sm transition-all duration-300 hover:bg-card hover:bg-muted/10 w-44",
                style.border
            )}
        >
            <div className="relative flex items-center justify-center w-24 h-24">
                {/* Background Circle */}
                <svg className="absolute w-full h-full -rotate-90">
                    <circle
                        cx="48"
                        cy="48"
                        r={radius}
                        className="stroke-muted/20 fill-none"
                        strokeWidth="6"
                    />
                    {/* Progress Circle Icons/Visual */}
                    <motion.circle
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ delay: delay + 0.3, duration: 1.5, ease: "anticipate" }}
                        cx="48"
                        cy="48"
                        r={radius}
                        className={cn("fill-none transition-colors", style.color)}
                        stroke={style.stroke}
                        strokeWidth="6"
                        strokeDasharray={circumference}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="flex flex-col items-center justify-center z-10">
                    <span className={cn("text-2xl font-black tracking-tighter", style.color)}>
                        {store.percentage}<span className="text-xs opacity-60">%</span>
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Done</span>
                </div>
            </div>

            <div className="text-center space-y-1">
                <h3 className="font-bold text-sm text-foreground truncate max-w-[140px]">{store.storeName}</h3>
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-black text-muted-foreground/60 uppercase tracking-wider">
                    <span>{store.completed}</span>
                    <span className="opacity-30">/</span>
                    <span>{store.total}</span>
                    <span className="ml-1 opacity-40">TASKS</span>
                </div>
            </div>

            {/* Subtle Node ID */}
            <div className="absolute top-3 right-3 opacity-20 text-[8px] font-mono">
                #{store.storeId.slice(-4).toUpperCase()}
            </div>
        </motion.div>
    );
}
