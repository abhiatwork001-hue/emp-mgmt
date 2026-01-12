"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Info, Activity } from "lucide-react";
import { getTodaysUsage } from "@/lib/actions/api-usage.actions";
import { useTranslations } from "next-intl";

export function ApiUsageWidget() {
    const t = useTranslations("ApiUsage");
    const [usage, setUsage] = useState<any[]>([]);

    useEffect(() => {
        getTodaysUsage().then(res => {
            if (res.success) setUsage(res.usage);
        });
    }, []);

    const getLimit = (service: string) => {
        if (service === "google-places") return 250;
        if (service === "openweather") return 1000;
        return 1000;
    };

    return (
        <Card className="h-full">
            <CardHeader className="pb-3 bg-muted/5">
                <CardTitle className="text-md font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-600" />
                    {t("title")}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
                {usage.filter(u => u.count > 0).length === 0 ? (
                    <div className="text-center py-4">
                        <p className="text-xs text-muted-foreground italic">{t("noCalls")}</p>
                    </div>
                ) : (
                    usage.filter(u => u.count > 0).map((u, i) => {
                        const limit = getLimit(u.service);
                        const percentage = Math.min(100, (u.count / limit) * 100);
                        const isHigh = percentage > 80;

                        return (
                            <div key={i} className="space-y-1.5">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-semibold capitalize flex items-center gap-1.5">
                                        {u.service === 'google-places' ? t("googlePlaces") : (u.service === 'openweather' ? t("openWeather") : u.service)}
                                    </span>
                                    <span className={isHigh ? "text-red-600 font-bold" : "text-muted-foreground"}>
                                        {u.count} <span className="text-muted-foreground/60">/ {limit}</span>
                                    </span>
                                </div>
                                <Progress value={percentage} className={isHigh ? "[&>div]:bg-red-500" : "[&>div]:bg-blue-500"} />
                                {u.costEstimate > 0 && (
                                    <div className="flex justify-end">
                                        <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-mono">
                                            ${u.costEstimate.toFixed(3)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </CardContent>
        </Card>
    );
}
