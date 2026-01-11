"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { getProblems } from "@/lib/actions/problem.actions";

// ... (imports remain)
import { useTranslations } from "next-intl";

interface ProblemStatsWidgetProps {
    userId: string;
    role: string;
    storeId?: string;
    className?: string;
}

export function ProblemStatsWidget({ userId, role, storeId, className }: ProblemStatsWidgetProps) {
    const [stats, setStats] = useState({
        totalOpen: 0,
        highPriority: 0,
        resolvedRecently: 0
    });
    const [loading, setLoading] = useState(true);
    const t = useTranslations("Dashboard.widgets.problemStatsWidget");

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch all relevant problems to calculate stats locally
                // In production, you'd want a dedicated aggregate endpoint
                const problems = await getProblems({ userId, role, storeId, status: 'all' });

                const open = problems.filter((p: any) => p.status === 'open');
                const high = open.filter((p: any) => p.priority === 'high' || p.priority === 'critical');
                const resolved = problems.filter((p: any) => p.status === 'resolved');

                setStats({
                    totalOpen: open.length,
                    highPriority: high.length,
                    resolvedRecently: resolved.length
                });
            } catch (error) {
                console.error("Failed to load problem stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [userId, role, storeId]);

    if (loading) return null; // Or skeleton

    return (
        <Link href="/dashboard/problems" className="block group">
            <Card className={cn("border-l-4 hover:shadow-md transition-all cursor-pointer", className,
                stats.highPriority > 0 ? "border-l-red-500" : "border-l-blue-500"
            )}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                        <span>{t('title')}</span>
                        {stats.highPriority > 0 && <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-2xl font-bold">{stats.totalOpen}</span>
                            <span className="text-xs text-muted-foreground">{t('pending')}</span>
                        </div>
                        <div className="w-px h-8 bg-border" />
                        <div className="flex flex-col">
                            <span className={cn("text-2xl font-bold", stats.highPriority > 0 ? "text-red-500" : "text-foreground")}>
                                {stats.highPriority}
                            </span>
                            <span className="text-xs text-muted-foreground">{t('criticalHigh')}</span>
                        </div>
                        <div className="w-px h-8 bg-border" />
                        <div className="flex flex-col">
                            <span className="text-2xl font-bold text-emerald-600">{stats.resolvedRecently}</span>
                            <span className="text-xs text-muted-foreground">{t('resolved')}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
