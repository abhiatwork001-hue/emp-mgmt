"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { markSupplierOrder } from "@/lib/actions/supplier.actions";
import { updateSupplierStorePreference } from "@/lib/actions/supplier-alerts.actions";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface SupplierAlert {
    supplierId: string;
    supplierName: string;
    deliveryDate: string; // ISO string
    cutoffTime: string;
    leadDays: number;
    isPreferenceBased: boolean;
    preferredDay?: number;
}

interface SupplierAlertWidgetProps {
    alerts: SupplierAlert[];
    storeId: string;
}

export function SupplierAlertWidget({ alerts, storeId }: SupplierAlertWidgetProps) {
    const [loading, setLoading] = useState<string | null>(null);

    const handleAction = async (supplierId: string, deliveryDate: string, status: 'ordered' | 'skipped') => {
        setLoading(supplierId);
        try {
            await markSupplierOrder(storeId, supplierId, status, new Date(deliveryDate));
            toast.success(status === 'ordered' ? "Order marked as done" : "Order skipped");
        } catch (error) {
            toast.error("Failed to update status");
        } finally {
            setLoading(null);
        }
    };

    if (alerts.length === 0) return null;

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                Supplier Orders Due Today
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {alerts.map((alert) => (
                    <SupplierItem
                        key={`${alert.supplierId}-${alert.deliveryDate}`}
                        alert={alert}
                        storeId={storeId}
                        loading={loading === alert.supplierId}
                        onAction={handleAction}
                    />
                ))}
            </div>
        </div>
    );
}

function SupplierItem({ alert, storeId, loading, onAction }: { alert: SupplierAlert, storeId: string, loading: boolean, onAction: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const [prefDay, setPrefDay] = useState<string>(alert.preferredDay?.toString() || "default");

    const handleSavePref = async () => {
        if (prefDay === "default") {
            // How to unset? Logic currently pushes. Maybe special unset method or just rely on overwrite?
            // Current update logic PULLS then PUSHES. If I want to remove, I need a remove method or handle logic.
            // For now assume they set a day.
            toast.info("Unsetting not fully supported in this simplified UI yet.");
            return;
        }
        try {
            await updateSupplierStorePreference(alert.supplierId, storeId, parseInt(prefDay));
            toast.success("Preference updated");
            setIsOpen(false);
        } catch (e) {
            toast.error("Failed to update preference");
        }
    };

    const deliveryDate = new Date(alert.deliveryDate);

    return (
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle className="text-base">{alert.supplierName}</CardTitle>
                        <CardDescription>
                            Delivery: <span className="font-medium text-foreground">{format(deliveryDate, "EEEE, MMM d")}</span>
                        </CardDescription>
                    </div>
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Settings className="w-4 h-4 text-muted-foreground" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Order Day Preference</DialogTitle>
                                <DialogDescription>
                                    When do you prefer to place orders for {alert.supplierName}? We will alert you on this day.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                <Label>Preferred Order Day</Label>
                                <Select value={prefDay} onValueChange={setPrefDay}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a day" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="default">Default / No Preference</SelectItem>
                                        <SelectItem value="1">Monday</SelectItem>
                                        <SelectItem value="2">Tuesday</SelectItem>
                                        <SelectItem value="3">Wednesday</SelectItem>
                                        <SelectItem value="4">Thursday</SelectItem>
                                        <SelectItem value="5">Friday</SelectItem>
                                        <SelectItem value="6">Saturday</SelectItem>
                                        <SelectItem value="0">Sunday</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleSavePref}>Save Preference</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mb-4">
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-200">
                        Order by {alert.cutoffTime}
                    </Badge>
                    {alert.isPreferenceBased && <Badge variant="secondary">Preferred Day</Badge>}
                </div>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => onAction(alert.supplierId, alert.deliveryDate, 'ordered')}
                        disabled={loading}
                    >
                        {loading ? "..." : "Mark Done"}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => onAction(alert.supplierId, alert.deliveryDate, 'skipped')}
                        disabled={loading}
                    >
                        Not Needed
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
