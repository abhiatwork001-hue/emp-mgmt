"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAvailableSuppliersForToday } from "@/lib/actions/supplier.actions";
import { ShoppingBagIcon, TruckIcon, AlertCircleIcon, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";

// ... (imports remain)
import { useTranslations } from "next-intl";

interface OrderAlert {
    supplierId: string;
    supplierName: string;
    deliveryDate: string; // ISO string
    cutoffTime: string;
    leadDays: number;
}

export function OrderingWidget() {
    const { data: session } = useSession();
    const [alerts, setAlerts] = useState<OrderAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const t = useTranslations("Dashboard.widgets.orderingWidget");

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const storeId = (session?.user as any)?.storeId;
                if (!storeId) return;

                const data = await getAvailableSuppliersForToday(storeId);
                setAlerts(data);
            } catch (error) {
                console.error("Failed to fetch order alerts", error);
            } finally {
                setLoading(false);
            }
        };

        if (session) fetchAlerts();
    }, [session]);

    if (loading) {
        return <Skeleton className="w-full h-[200px] rounded-xl" />;
    }

    if (alerts.length === 0) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <ShoppingBagIcon className="w-4 h-4 text-muted-foreground" />
                        {t('title')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground space-y-2">
                        <ShoppingBagIcon className="w-8 h-8 text-muted-foreground/30" />
                        <p className="text-sm">{t('empty')}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShoppingBagIcon className="w-5 h-5 text-orange-600" />
                        <span>{t('mainTitle')}</span>
                    </div>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                        {t('due', { count: alerts.length })}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {alerts.map((alert) => (
                    <div key={alert.supplierId} className="flex items-start justify-between p-3 bg-muted/40 rounded-lg border border-border hover:bg-muted/60 transition-colors">
                        <div className="space-y-1">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                                {alert.supplierName}
                            </h4>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <TruckIcon className="w-3 h-3" />
                                    <span>{t('delivers', { date: format(new Date(alert.deliveryDate), "EEE, MMM d") })}</span>
                                </div>
                                <div className="flex items-center gap-1 text-orange-600 font-medium">
                                    <AlertCircleIcon className="w-3 h-3" />
                                    <span>{t('cutoff', { time: alert.cutoffTime })}</span>
                                </div>
                            </div>
                        </div>
                        <Link
                            href={`/dashboard/suppliers/${alert.supplierId}`}
                            className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md font-medium hover:bg-primary/90 transition-colors"
                        >
                            {t('orderBtn')}
                        </Link>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
