"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, AlertTriangle, CalendarDays, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export interface DashboardAlert {
    id: string | number;
    type: 'critical' | 'warning' | 'info' | 'success';
    title: string;
    message: string;
    actionLabel?: string;
    actionUrl?: string;
    meta?: any;
}

interface OperationsRadarProps {
    overallScore?: number;
    status?: "optimal" | "warning" | "critical";
    alerts?: DashboardAlert[];
    staffing?: {
        current: number;
        min: number;
        max: number;
        target: number;
    };
    scheduleHealth?: {
        daysUntilDeadline: number;
        overdue: boolean;
        nextWeekPublished: boolean;
        missingEntities?: string[];
    };
    role?: string;
}

export function OperationsRadar({
    overallScore = 100,
    status = "optimal",
    alerts = [],
    staffing = { current: 0, min: 0, max: 0, target: 0 },
    scheduleHealth = { daysUntilDeadline: 0, overdue: false, nextWeekPublished: false },
    role
}: OperationsRadarProps) {
    const t = useTranslations("Dashboard.widgets.operationsRadar");

    const staffingPct = staffing.target > 0
        ? Math.min(100, Math.max(0, (staffing.current / staffing.target) * 100))
        : 0;

    return (
        <Card className="h-full border-l-4 border-l-purple-500 bg-purple-50/10 flex flex-col overflow-hidden">
            <CardHeader className="pb-3 shrink-0">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="h-5 w-5 text-purple-500" />
                        {t('title')}
                    </CardTitle>
                    <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-100/50 animate-pulse">
                        {t('liveMetrics')}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6 flex-1 overflow-y-auto">
                {/* Schedule Health */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase text-muted-foreground">{t('scheduleHealth')}</span>
                        <div className="flex items-center gap-1.5">
                            {scheduleHealth.nextWeekPublished ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Clock className="h-3 w-3 text-amber-500" />}
                            <span className="text-[10px] font-semibold text-muted-foreground">{t('nextWeek')}</span>
                        </div>
                    </div>
                    <div className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        scheduleHealth.nextWeekPublished ? "bg-emerald-500/10 border-emerald-500/20" :
                            scheduleHealth.overdue ? "bg-destructive/10 border-destructive/20" : "bg-secondary/50 border-border"
                    )}>
                        <div className="flex items-center gap-3">
                            <CalendarDays className={cn("h-5 w-5",
                                scheduleHealth.nextWeekPublished ? "text-emerald-500" :
                                    scheduleHealth.overdue ? "text-destructive" : "text-foreground"
                            )} />
                            <div className="flex flex-col">
                                <span className="text-sm font-bold">Week 42</span>
                                <span className="text-[10px] text-muted-foreground">Oct 14 - Oct 20</span>
                            </div>
                        </div>
                        <span className={cn("text-xs font-bold px-2 py-1 rounded-full",
                            scheduleHealth.nextWeekPublished ? "bg-emerald-500 text-white" :
                                scheduleHealth.overdue ? "bg-destructive text-white" : "bg-amber-500 text-white"
                        )}>
                            {scheduleHealth.nextWeekPublished ? t('published') : scheduleHealth.overdue ? t('overdue') : t('daysLeft', { count: scheduleHealth.daysUntilDeadline })}
                        </span>
                    </div>
                </div>

                {/* Staffing Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-bold uppercase text-muted-foreground">{t('staffingLevels')}</span>
                        <span className="text-xs font-mono">
                            <span className={cn("font-bold", (staffing.min > 0 && staffing.current < staffing.min) ? "text-destructive" : "text-foreground")}>{staffing.current}</span>
                            <span className="text-muted-foreground"> / {staffing.target > 0 ? t('target', { count: staffing.target }) : t('noTarget')}</span>
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
                            <AlertTriangle className="h-3 w-3" /> {t('underMin', { min: staffing.min })}
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
                                <span className="text-xs font-medium">{t('allSystemsGo')}</span>
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
                                                {t('view')} <ArrowRight className="h-3 w-3 ml-1" />
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
