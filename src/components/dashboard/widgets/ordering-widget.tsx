"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAvailableSuppliersForToday, markSupplierOrder } from "@/lib/actions/supplier.actions";
import { ShoppingBagIcon, TruckIcon, AlertCircleIcon, CalendarIcon, CheckIcon, XIcon, PackageCheckIcon } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface OrderAlert {
    supplierId: string;
    supplierName: string;
    deliveryDate: string; // ISO string
    cutoffTime: string;
    leadDays: number;
    isCustomAlert?: boolean;
    hardDeadline?: string;
}

export function OrderingWidget() {
    const { data: session } = useSession();
    const [alerts, setAlerts] = useState<OrderAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const t = useTranslations("Dashboard.widgets.orderingWidget");

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

    useEffect(() => {
        if (session) fetchAlerts();
    }, [session]);

    const handleAction = async (supplierId: string, status: 'ordered' | 'checked_stock' | 'skipped', date: string) => {
        const storeId = (session?.user as any)?.storeId;
        if (!storeId) return;

        setProcessing(supplierId);
        try {
            await markSupplierOrder(storeId, supplierId, status, new Date(date));
            toast.success(status === 'ordered' ? "Marked as Ordered" : "Updated status");
            // Remove from list immediately for better UX
            setAlerts(prev => prev.filter(a => a.supplierId !== supplierId));
        } catch (error) {
            toast.error("Failed to update status");
        } finally {
            setProcessing(null);
        }
    };

    if (!loading && alerts.length === 0) {
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

    if (loading) {
        return <Skeleton className="w-full h-[200px] rounded-xl" />;
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
                    <div key={alert.supplierId} className="space-y-3 p-3 bg-muted/40 rounded-lg border border-border">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                    {alert.supplierName}
                                    {alert.isCustomAlert && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-blue-200 text-blue-600 bg-blue-50">
                                            Early Alert
                                        </Badge>
                                    )}
                                </h4>
                                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <TruckIcon className="w-3 h-3" />
                                        <span>Delivers: <span className="font-medium text-foreground">{format(new Date(alert.deliveryDate), "EEE, MMM d")}</span></span>
                                    </div>
                                    <div className="flex items-center gap-1 text-orange-600 font-medium">
                                        <AlertCircleIcon className="w-3 h-3" />
                                        <span>Cutoff: {alert.cutoffTime}</span>
                                        {alert.hardDeadline && (
                                            <span className="text-muted-foreground font-normal ml-1">
                                                (Deadline: {format(new Date(alert.hardDeadline), "MMM d")})
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Link
                                href={`/dashboard/suppliers/${alert.supplierId}`}
                                className="text-xs border border-border bg-background px-3 py-1.5 rounded-md font-medium hover:bg-accent transition-colors"
                            >
                                View
                            </Link>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                            <Button
                                size="sm"
                                variant="default"
                                className="text-xs h-7 w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={processing === alert.supplierId}
                                onClick={() => handleAction(alert.supplierId, 'ordered', alert.deliveryDate)}
                            >
                                {processing === alert.supplierId ? "..." : (
                                    <>
                                        <CheckIcon className="w-3 h-3 mr-1" /> Ordered
                                    </>
                                )}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 w-full"
                                disabled={processing === alert.supplierId}
                                onClick={() => handleAction(alert.supplierId, 'checked_stock', alert.deliveryDate)}
                            >
                                <PackageCheckIcon className="w-3 h-3 mr-1" /> Metric Stock
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs h-7 px-2 text-muted-foreground hover:text-red-500"
                                disabled={processing === alert.supplierId}
                                onClick={() => handleAction(alert.supplierId, 'skipped', alert.deliveryDate)}
                            >
                                Skip
                            </Button>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
