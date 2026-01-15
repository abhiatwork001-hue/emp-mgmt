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
        { val: 0, label: "Sunday" },
        { val: 1, label: "Monday" },
        { val: 2, label: "Tuesday" },
        { val: 3, label: "Wednesday" },
        { val: 4, label: "Thursday" },
        { val: 5, label: "Friday" },
        { val: 6, label: "Saturday" },
    ];

    const handleUpdateSettings = async (supplierId: string, offset: number, ignored: boolean) => {
        setLoading(prev => ({ ...prev, [supplierId]: true }));
        try {
            await updateStoreSupplierSettings(storeId, supplierId, offset, ignored);
            toast.success("Preferences saved");
        } catch (error) {
            toast.error("Failed to save preferences");
        } finally {
            setLoading(prev => ({ ...prev, [supplierId]: false }));
        }
    };

    const handleUpdateOrderDay = async (supplierId: string, day: number) => {
        setLoading(prev => ({ ...prev, [supplierId]: true }));
        try {
            await updateSupplierStorePreference(supplierId, storeId, day);
            toast.success("Preferred order day updated");
        } catch (error) {
            toast.error("Failed to update order day");
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
                        <CardTitle>Supplier Preferences</CardTitle>
                        <CardDescription>Customize when you receive alerts for each supplier</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Supplier</TableHead>
                            <TableHead>Delivery Days</TableHead>
                            <TableHead className="w-[150px]">Alert Offset (Days)</TableHead>
                            <TableHead className="w-[180px]">Preferred Order Day</TableHead>
                            <TableHead className="w-[100px]">Alerts</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {suppliers.map(supplier => {
                            const isIgnored = getIsIgnored(supplier._id);
                            const currentOffset = getAlertOffset(supplier._id);
                            const currentPrefDay = getPreferredOrderDay(supplier);
                            const schedString = supplier.deliverySchedule?.map((s: any) => days[s.dayOfWeek].label.substring(0, 3)).join(", ");

                            return (
                                <TableRow key={supplier._id} className={isIgnored ? "opacity-50 bg-muted/30" : ""}>
                                    <TableCell className="font-medium">
                                        {supplier.name}
                                        {supplier.category && <Badge variant="outline" className="ml-2 text-[10px]">{supplier.category}</Badge>}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{schedString || "On Demand"}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                defaultValue={currentOffset}
                                                className="h-8 w-16"
                                                min={0}
                                                disabled={!canEdit || isIgnored || loading[supplier._id]}
                                                onBlur={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    if (!isNaN(val) && val !== currentOffset) {
                                                        handleUpdateSettings(supplier._id, val, isIgnored);
                                                    }
                                                }}
                                            />
                                            <span className="text-xs text-muted-foreground">days before</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            disabled={!canEdit || loading[supplier._id]}
                                            value={currentPrefDay !== undefined ? currentPrefDay.toString() : "none"}
                                            onValueChange={(val) => {
                                                if (val) handleUpdateOrderDay(supplier._id, parseInt(val));
                                            }}
                                        >
                                            <SelectTrigger className="h-8">
                                                <SelectValue placeholder="Default" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {supplier.deliverySchedule?.map((s: any) => {
                                                    // Suggest days based on lead time? For now, just show day names + maybe logic
                                                    // Logic: If order cutoff leadDays=1 for delivery Wed, order must be Tue.
                                                    // User might prefer "Monday".
                                                    // Let's just list standard days or only relevant days?
                                                    // The requirement is "StorePreference for order day".
                                                    // Typically this means "I prefer to order on Tuesdays".
                                                    return (
                                                        <SelectItem key={s.dayOfWeek} value={s.dayOfWeek.toString()}>
                                                            {days[s.dayOfWeek].label} (Delivery)
                                                        </SelectItem>
                                                    );
                                                })}
                                                <SelectItem value="none">-- Default --</SelectItem>
                                                {/* Allow any day? Usually constrained by delivery schedule but let's allow flexibility if they negotiate overrides */}
                                                {/* Simply listing all days for max flexibility */}
                                                {days.map(d => (
                                                    <SelectItem key={`all-${d.val}`} value={d.val.toString()}>{d.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={!isIgnored}
                                                disabled={!canEdit || loading[supplier._id]}
                                                onCheckedChange={(checked) => handleUpdateSettings(supplier._id, currentOffset, !checked)}
                                            />
                                            {isIgnored && <BellOff className="h-4 w-4 text-muted-foreground" />}
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
