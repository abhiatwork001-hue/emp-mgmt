"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle2, Clock, Users, ChevronRight, XCircle, ArrowRight } from "lucide-react";
import { showToast } from '@/components/ui/toast';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useEffect } from "react";
import { realtime } from "@/lib/realtime";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/routing";

export interface DashboardAlert {
    id: string;
    type: "critical" | "warning" | "info" | "success";
    title: string;
    message: string;
    actionLabel?: string;
    actionUrl?: string;
    meta?: any;
}

interface StaffingMetric {
    label: string;
    current: number;
    target: number;
    min: number;
    max: number;
}

interface OperationsRadarProps {
    overallScore: number; // 0-100
    status: "optimal" | "warning" | "critical";
    alerts: DashboardAlert[];
    staffing: StaffingMetric;
    scheduleHealth: {
        nextWeekPublished: boolean;
        daysUntilDeadline: number;
        overdue: boolean;
    };
    role: string;
}

export function OperationsRadar({ overallScore, status, alerts, staffing, scheduleHealth, role }: OperationsRadarProps) {
    const router = useRouter();

    useEffect(() => {
        const handleUpdate = () => {
            console.log("Realtime update received");
            // router.refresh(); // Temporarily disabled to prevent infinite refresh loops
            showToast({
                title: "Dashboard Updated",
                description: "New data is available. Please refresh to see changes.",
                variant: "warning"
            });
        };

        realtime.on("dashboard_update", handleUpdate);
        realtime.on("update_dashboard", handleUpdate);
        return () => {
            realtime.off("dashboard_update", handleUpdate);
            realtime.off("update_dashboard", handleUpdate);
        };
    }, []);

    // Calculate staffing percentage relative to target (capped at 100 for bar, but loop for value)
    const targetValue = staffing.target || 1;
    const staffingPct = Math.min(100, Math.max(0, (staffing.current / targetValue) * 100));

    // Status Logic
    const getStatusColor = (s: string) => {
        switch (s) {
            case "optimal": return "text-primary bg-primary/10 border-primary/20";
            case "warning": return "text-warning bg-warning/10 border-warning/20";
            case "critical": return "text-critical bg-critical/10 border-critical/20";
            default: return "text-muted-foreground";
        }
    };

    return (
        <Card className="border-border/50 bg-gradient-to-br from-background/80 to-muted/20 backdrop-blur-xl shadow-xl overflow-hidden relative">
            <div className={`absolute top-0 left-0 w-1 h-full ${status === 'optimal' ? 'bg-primary' : status === 'warning' ? 'bg-warning' : 'bg-critical'}`} />

            <CardHeader className="pb-2 pt-6 pl-6 pr-6">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col space-y-1">
                        <CardTitle className="text-lg font-bold uppercase tracking-widest flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            Operations Radar
                        </CardTitle>
                        <span className="text-xs text-muted-foreground font-medium pl-1">Live System Monitoring</span>
                    </div>

                    <div className={cn("px-4 py-1.5 rounded-full border flex items-center gap-2 animate-in fade-in zoom-in duration-500", getStatusColor(status))}>
                        {status === "optimal" ? <CheckCircle2 className="h-4 w-4" /> : status === "warning" ? <Clock className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        <span className="text-xs font-bold uppercase tracking-wider">{status}</span>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
                {/* Top Metrics Row */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-background/40 rounded-xl p-4 border border-border/50 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="text-3xl font-black tracking-tighter tabular-nums">{overallScore}%</span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Health Score</span>
                    </div>

                    <div className="bg-background/40 rounded-xl p-4 border border-border/50 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className={cn("text-3xl font-black tracking-tighter tabular-nums", alerts.length > 0 ? "text-orange-500" : "text-muted-foreground")}>
                            {alerts.length}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Actions Needed</span>
                    </div>

                    <div className="bg-background/40 rounded-xl p-4 border border-border/50 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {scheduleHealth.nextWeekPublished ? (
                            <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-1" />
                        ) : (
                            <Clock className={cn("h-8 w-8 mb-1", scheduleHealth.overdue ? "text-destructive" : "text-blue-500")} />
                        )}
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                            {scheduleHealth.nextWeekPublished ? "Published" : scheduleHealth.overdue ? "Overdue" : `${scheduleHealth.daysUntilDeadline} Days Left`}
                        </span>
                    </div>
                </div>

                {/* Staffing Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-bold uppercase text-muted-foreground">Staffing Levels</span>
                        <span className="text-xs font-mono">
                            <span className={cn("font-bold", (staffing.min > 0 && staffing.current < staffing.min) ? "text-destructive" : "text-foreground")}>{staffing.current}</span>
                            <span className="text-muted-foreground"> / {staffing.target > 0 ? `${staffing.target} Target` : "No Target Set"}</span>
                        </span>
                    </div>
                    <div className="relative h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <motion.div
                            className={cn("h-full rounded-full shadow-lg",
                                staffing.current < staffing.min ? "bg-destructive" :
                                    staffing.current > staffing.max ? "bg-amber-500" : "bg-emerald-500"
                            )}
                            initial={{ width: 0 }}
                            animate={{ width: `${staffingPct}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                        />
                    </div>
                    {staffing.current < staffing.min && (
                        <p className="text-[10px] text-destructive font-semibold flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Under minimum requirement of {staffing.min}
                        </p>
                    )}
                </div>

                {/* Alerts List */}
                <div className="space-y-3 pt-2">
                    <AnimatePresence>
                        {alerts.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-6 text-muted-foreground space-y-2 opacity-60"
                            >
                                <CheckCircle2 className="h-8 w-8 text-emerald-500/50" />
                                <span className="text-xs font-medium">All systems operational</span>
                            </motion.div>
                        ) : (
                            alerts.slice(0, 3).map((alert) => (
                                <motion.div
                                    key={alert.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className={cn(
                                        "p-3 rounded-lg border text-sm flex items-start gap-3 relative overflow-hidden group",
                                        alert.type === 'critical' ? "bg-destructive/10 border-destructive/20 text-destructive-foreground dark:text-red-400" :
                                            alert.type === 'warning' ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" :
                                                "bg-secondary/50 border-border"
                                    )}
                                >
                                    <div className={cn("mt-0.5 p-1 rounded-full",
                                        alert.type === 'critical' ? "bg-destructive/20" :
                                            alert.type === 'warning' ? "bg-amber-500/20" : "bg-primary/20"
                                    )}>
                                        {alert.type === 'critical' || alert.type === 'warning' ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <p className="font-semibold leading-none">{alert.title}</p>
                                        <p className="text-xs opacity-90 leading-tight">{alert.message}</p>
                                    </div>

                                    {alert.actionUrl && (
                                        <Button asChild size="sm" variant="ghost" className="h-7 px-2 -mr-1 hover:bg-background/20">
                                            <Link href={alert.actionUrl}>
                                                {alert.actionLabel || "View"} <ArrowRight className="h-3 w-3 ml-1" />
                                            </Link>
                                        </Button>
                                    )}
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </CardContent>
        </Card>
    );
}
