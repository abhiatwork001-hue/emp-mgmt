"use client";

import { useState } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { updateStoreSupplierSettings } from "@/lib/actions/store.actions";
import { updateSupplierStorePreference } from "@/lib/actions/supplier.actions";
import { toast } from "sonner";
import { Truck, AlertTriangle, Save, BellOff } from "lucide-react";
import { useTranslations } from "next-intl";

interface SupplierPreferenceProps {
    storeId: string;
    suppliers: any[];
    storeSettings: any;
    canEdit: boolean;
}

export function StoreSupplierPreferences({ storeId, suppliers, storeSettings, canEdit }: SupplierPreferenceProps) {
    const t = useTranslations("Stores.suppliers");
    const tCommon = useTranslations("Common");
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    // Local state to track changes before save? Or save on change?
    // Let's do save on change for switches with debounce/optimistic for inputs?
    // For simplicity: Save buttons for rows or auto-save on blur/change. I'll do individual row save or auto-save.
    // Let's do auto-save on change for switches/selects, and onBlur/Enter for inputs to keep it snappy.

    // We need to parse initial values
    // Alert Offset & Ignore comes from `storeSettings.supplierAlertPreferences`
    // Preferred Order Day comes from `supplier.storePreferences` (array)

    const initialSettings = storeSettings?.supplierAlertPreferences?.exceptions || [];

    const getAlertOffset = (supplierId: string) => {
        const exception = initialSettings.find((e: any) => e.supplierId === supplierId);
        return exception ? exception.alertOffset : (storeSettings?.supplierAlertPreferences?.defaultAlertOffset || 1);
    };

    const getIsIgnored = (supplierId: string) => {
        const exception = initialSettings.find((e: any) => e.supplierId === supplierId);
        return exception ? !!exception.ignored : false;
    };

    const getPreferredOrderDay = (supplier: any) => {
        const pref = supplier.storePreferences?.find((p: any) => p.storeId === storeId);
        return pref ? pref.preferredOrderDay : undefined;
    };

    const days = [
        { val: 0, label: tCommon('days.sunday') },
        { val: 1, label: tCommon('days.monday') },
        { val: 2, label: tCommon('days.tuesday') },
        { val: 3, label: tCommon('days.wednesday') },
        { val: 4, label: tCommon('days.thursday') },
        { val: 5, label: tCommon('days.friday') },
        { val: 6, label: tCommon('days.saturday') },
    ];

    const handleUpdateSettings = async (supplierId: string, offset: number, ignored: boolean) => {
        setLoading(prev => ({ ...prev, [supplierId]: true }));
        try {
            await updateStoreSupplierSettings(storeId, supplierId, offset, ignored);
            toast.success(t('toasts.saved'));
        } catch (error) {
            toast.error(t('toasts.saveError'));
        } finally {
            setLoading(prev => ({ ...prev, [supplierId]: false }));
        }
    };

    const handleUpdateOrderDay = async (supplierId: string, day: number) => {
        setLoading(prev => ({ ...prev, [supplierId]: true }));
        try {
            await updateSupplierStorePreference(supplierId, storeId, day);
            toast.success(t('toasts.orderDayUpdated'));
        } catch (error) {
            toast.error(t('toasts.orderDayError'));
        } finally {
            setLoading(prev => ({ ...prev, [supplierId]: false }));
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                        <Truck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <CardTitle>{t('title')}</CardTitle>
                        <CardDescription>{t('desc')}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('table.supplier')}</TableHead>
                            <TableHead>{t('table.deliveryDays')}</TableHead>
                            <TableHead>{t('table.alertOffset')}</TableHead>
                            <TableHead>{t('table.preferredDay')}</TableHead>
                            <TableHead>{t('table.alerts')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {suppliers.map(supplier => {
                            const ignored = getIsIgnored(supplier._id);
                            const offset = getAlertOffset(supplier._id);
                            const preferredDay = getPreferredOrderDay(supplier);

                            return (
                                <TableRow key={supplier._id} className={ignored ? "opacity-50 bg-muted/30" : ""}>
                                    <TableCell className="font-medium">
                                        {supplier.name}
                                        {supplier.category && <Badge variant="outline" className="ml-2 text-[10px]">{supplier.category}</Badge>}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {supplier.deliverySchedule?.map((s: any) => (
                                                <Badge key={s.dayOfWeek} variant="outline" className="text-xs">
                                                    {days.find(day => day.val === s.dayOfWeek)?.label.substring(0, 3)}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                className="w-20"
                                                value={offset}
                                                min={0}
                                                max={14}
                                                disabled={!canEdit || ignored || loading[supplier._id]}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    if (!isNaN(val) && val !== offset) {
                                                        handleUpdateSettings(supplier._id, val, ignored);
                                                    }
                                                }}
                                            />
                                            <span className="text-xs text-muted-foreground whitespace-nowrap">{t('daysBefore')}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            disabled={!canEdit || loading[supplier._id]}
                                            value={preferredDay !== undefined ? String(preferredDay) : "default"}
                                            onValueChange={(val) => {
                                                handleUpdateOrderDay(supplier._id, val === 'default' ? -1 : parseInt(val));
                                            }}
                                        >
                                            <SelectTrigger className="w-[140px]">
                                                <SelectValue placeholder={t('default')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="default">{t('default')}</SelectItem>
                                                {days.map(day => (
                                                    <SelectItem key={day.val} value={String(day.val)}>{day.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={!ignored}
                                                disabled={!canEdit || loading[supplier._id]}
                                                onCheckedChange={(checked) => handleUpdateSettings(supplier._id, offset, !checked)}
                                            />
                                            {ignored && <BellOff className="h-4 w-4 text-muted-foreground" />}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
