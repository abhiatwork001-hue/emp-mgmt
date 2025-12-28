"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, Clock, AlertTriangle, Truck } from "lucide-react";
import { getRemindersForUser, markReminderRead } from "@/lib/actions/reminder.actions";
import { getOrderReminders } from "@/lib/actions/supplier.actions";
import { toast } from "sonner";
import { format } from "date-fns";

interface ReminderWidgetProps {
    userId: string;
    role: string;
}

export function ReminderWidget({ userId, role }: ReminderWidgetProps) {
    const [reminders, setReminders] = useState<any[]>([]);
    const [orderAlerts, setOrderAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [rems, orders] = await Promise.all([
                getRemindersForUser(userId),
                // Only managers/admins need order alerts usually, but for now fetching for all relevant roles could be handled
                (role === 'store_manager' || role === 'admin' || role === 'owner') ? getOrderReminders() : Promise.resolve([])
            ]);
            setReminders(rems);
            setOrderAlerts(orders);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, [userId, role]);

    const handleDismiss = async (id: string) => {
        const res = await markReminderRead(id, userId);
        if (res.success) {
            toast.success("Reminder dismissed");
            setReminders(prev => prev.filter(r => r._id !== id));
        }
    };

    const totalCount = reminders.length + orderAlerts.length;

    if (loading) return (
        <Card className="h-full">
            <CardHeader className="pb-3"><CardTitle>Reminders</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">Loading...</CardContent>
        </Card>
    );

    if (totalCount === 0) return (
        <Card className="h-full border-dashed">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                    <Bell className="h-5 w-5" /> No New Reminders
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">You are all caught up!</p>
            </CardContent>
        </Card>
    );

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        Reminders
                        <Badge variant="secondary" className="rounded-full ml-1">{totalCount}</Badge>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-3 pr-2">
                {/* Order Alerts */}
                {orderAlerts.map((alert, idx) => (
                    <div key={`order-${idx}`} className={`p-3 rounded-lg border flex flex-col gap-2 ${alert.isOverdue ? 'bg-destructive/10 border-destructive/20' : (alert.isUrgent ? 'bg-amber-500/10 border-amber-500/20' : 'bg-muted/30')}`}>
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                                <Truck className={`h-4 w-4 ${alert.isOverdue ? 'text-destructive' : 'text-blue-500'}`} />
                                <span className="font-semibold text-sm">{alert.title}</span>
                            </div>
                            {alert.isUrgent && <Badge variant="outline" className="border-amber-500 text-amber-500 text-[10px]">Urgent</Badge>}
                            {alert.isOverdue && <Badge variant="destructive" className="text-[10px]">Overdue</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{alert.description}</p>
                        {/* Action buttons could go here (e.g. "Place Order") */}
                    </div>
                ))}

                {/* General Reminders */}
                {reminders.map((rem) => (
                    <div key={rem._id} className="p-3 rounded-lg border bg-card hover:bg-muted/20 transition-colors flex flex-col gap-2 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div className="flex flex-col gap-0.5">
                                <span className={`font-medium text-sm ${rem.priority === 'high' ? 'text-destructive' : ''}`}>
                                    {rem.type === 'meeting' && "📅 "}
                                    {rem.title}
                                </span>
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(rem.dueDate), "EEE, MMM d • h:mm a")}
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 -mr-2 -mt-2 text-muted-foreground hover:text-primary"
                                onClick={() => handleDismiss(rem._id)}
                            >
                                <Check className="h-4 w-4" />
                            </Button>
                        </div>
                        {rem.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{rem.description}</p>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
