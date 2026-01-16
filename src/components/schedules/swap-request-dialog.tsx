"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { getEmployeeUpcomingShifts, createSwapRequest } from "@/lib/actions/shift-swap.actions";
import { toast } from "sonner";

interface SwapRequestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentUserId: string;
    targetShift: {
        scheduleId: string;
        dayDate: string; // ISO string
        shiftId: string;
        shiftName: string;
        startTime: string;
        endTime: string;
        employeeId: string;
        employeeName: string;
    } | null;
    storeId: string; // Restrict swaps to this store
}

export function SwapRequestDialog({ open, onOpenChange, currentUserId, targetShift, storeId }: SwapRequestDialogProps) {
    const t = useTranslations("Schedules.swapDialog");
    const [myShifts, setMyShifts] = useState<any[]>([]);
    const [selectedShiftId, setSelectedShiftId] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open && currentUserId) {
            setLoading(true);
            getEmployeeUpcomingShifts(currentUserId)
                .then(shifts => {
                    // Filter shifts that belong to the SAME store AND SAME DAY
                    const filtered = shifts.filter((s: any) =>
                        s.storeId && s.storeId.toString() === storeId &&
                        new Date(s.dayDate).toDateString() === new Date(targetShift!.dayDate).toDateString()
                    );
                    setMyShifts(filtered);
                    setLoading(false);
                })
                .catch(err => {
                    setLoading(false);
                });
        }
    }, [open, currentUserId, storeId]);

    const handleSubmit = async () => {
        if (!selectedShiftId || !targetShift) return;
        setSubmitting(true);

        const myShift = myShifts.find(s => s.shiftId === selectedShiftId);
        if (!myShift) return;

        try {
            const res = await createSwapRequest({
                requestorId: currentUserId,
                targetUserId: targetShift.employeeId,
                requestorShift: myShift,
                targetShift: {
                    scheduleId: targetShift.scheduleId,
                    dayDate: new Date(targetShift.dayDate),
                    shiftId: targetShift.shiftId,
                    startTime: targetShift.startTime,
                    endTime: targetShift.endTime
                }
            });

            if (res.success) {
                toast(t('requestSent'), { description: t('requestSentDesc') });
                onOpenChange(false);
            } else {
                toast.error("Error", { description: res.error || "Failed to send request." });
            }
        } catch (error) {
            toast.error("Error", { description: "Something went wrong." });
        } finally {
            setSubmitting(false);
        }
    };

    if (!targetShift) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('title')}</DialogTitle>
                    <DialogDescription>
                        {t('description', { name: targetShift.employeeName })}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="rounded-md border p-3 bg-muted/20">
                        <p className="text-sm font-medium mb-1">{t('targetShiftLabel')}</p>
                        <div className="text-sm">
                            {format(new Date(targetShift.dayDate), "EEE, MMM d")} • {targetShift.startTime} - {targetShift.endTime}
                            {targetShift.shiftName && <span className="ml-2 text-muted-foreground">({targetShift.shiftName})</span>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm font-medium">{t('offerShiftLabel')}</p>
                        {loading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" /> {t('loading')}
                            </div>
                        ) : myShifts.length > 0 ? (
                            <Select value={selectedShiftId} onValueChange={setSelectedShiftId}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('selectPlaceholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {myShifts.map(shift => (
                                        <SelectItem key={shift.shiftId} value={shift.shiftId}>
                                            {shift.dateStr} • {shift.startTime} - {shift.endTime} ({shift.shiftName})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <p className="text-sm text-muted-foreground">{t('noShifts')}</p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
                    <Button onClick={handleSubmit} disabled={!selectedShiftId || submitting || loading}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('submit')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
