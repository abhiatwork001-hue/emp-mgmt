"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashboardAlert {
    id: string;
    title: string;
    type: "critical" | "warning" | "info";
    message: string;
}

interface OperationsRadarProps {
    overallScore: number;
    status: "optimal" | "warning" | "critical";
    alerts: DashboardAlert[];
    staffing: any;
    scheduleHealth: any;
    role: string;
}

export function OperationsRadar({
    overallScore,
    status,
    alerts,
    staffing,
    scheduleHealth,
    role
}: OperationsRadarProps) {
    return (
        <Card className="border shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center justify-between">
                    <span>Operations Health</span>
                    <Badge variant={status === "optimal" ? "default" : status === "warning" ? "secondary" : "destructive"}>
                        {status.toUpperCase()}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Overall Score</span>
                        <span className="text-2xl font-bold">{overallScore}%</span>
                    </div>

                    {alerts && alerts.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold uppercase text-muted-foreground">Alerts</h4>
                            {alerts.map((alert) => (
                                <div key={alert.id} className={cn(
                                    "p-3 rounded-lg border flex items-start gap-3",
                                    alert.type === "critical" ? "bg-red-50 border-red-200 text-red-800" :
                                        alert.type === "warning" ? "bg-amber-50 border-amber-200 text-amber-800" :
                                            "bg-blue-50 border-blue-200 text-blue-800"
                                )}>
                                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <div>
                                        <div className="text-sm font-bold">{alert.title}</div>
                                        <div className="text-xs opacity-90">{alert.message}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
