"use client";

import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Alert {
    type: "critical" | "warning" | "risk" | "info";
    title: string;
    value: string;
    details: string;
}

interface BusinessAlertsProps {
    alerts: Alert[];
}

export function BusinessAlerts({ alerts }: BusinessAlertsProps) {
    if (!alerts || alerts.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {alerts.map((alert, index) => (
                <Card key={index} className={cn(
                    "border-l-4 shadow-sm",
                    alert.type === "critical" ? "border-l-red-500 bg-red-50/50 dark:bg-red-900/10" :
                        alert.type === "warning" ? "border-l-orange-500 bg-orange-50/50 dark:bg-orange-900/10" :
                            alert.type === "risk" ? "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10" :
                                "border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10"
                )}>
                    <CardContent className="p-4 flex items-start gap-4">
                        <div className={cn(
                            "p-2 rounded-full",
                            alert.type === "critical" ? "bg-red-100 text-red-600 dark:bg-red-900/20" :
                                alert.type === "warning" ? "bg-orange-100 text-orange-600 dark:bg-orange-900/20" :
                                    alert.type === "risk" ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20" :
                                        "bg-blue-100 text-blue-600 dark:bg-blue-900/20"
                        )}>
                            {alert.type === "critical" ? <AlertCircle className="h-5 w-5" /> :
                                alert.type === "warning" ? <AlertTriangle className="h-5 w-5" /> :
                                    alert.type === "risk" ? <AlertTriangle className="h-5 w-5" /> :
                                        <Info className="h-5 w-5" />}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{alert.title}</p>
                            <div className="flex items-baseline gap-2 mt-0.5">
                                <span className={cn(
                                    "text-2xl font-bold",
                                    alert.type === "critical" && "text-red-700 dark:text-red-400",
                                    alert.type === "warning" && "text-orange-700 dark:text-orange-400",
                                    alert.type === "risk" && "text-yellow-700 dark:text-yellow-400"
                                )}>
                                    {alert.value}
                                </span>
                            </div>
                            <p className="text-sm opacity-80 mt-1">{alert.details}</p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
