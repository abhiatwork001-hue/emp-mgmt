"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { createOvertimeRequest } from "@/lib/actions/overtime.actions";
import { toast } from "sonner";
import { format } from "date-fns";

interface OvertimeRequestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId: string;
    shift: {
        scheduleId: string;
        dayDate: string;
        shiftId: string;
        shiftName: string;
        startTime: string;
        endTime: string;
    } | null;
}

export function OvertimeRequestDialog({ open, onOpenChange, userId, shift }: OvertimeRequestDialogProps) {
    const [hours, setHours] = useState("");
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!shift || !hours || !reason) return;
        setSubmitting(true);

        try {
            const res = await createOvertimeRequest({
                employeeId: userId,
                scheduleId: shift.scheduleId,
                dayDate: shift.dayDate,
                shiftId: shift.shiftId,
                shiftDetails: {
                    startTime: shift.startTime,
                    endTime: shift.endTime,
                    shiftName: shift.shiftName
                },
                hoursRequested: parseFloat(hours),
                reason: reason
            });

            if (res.success) {
                toast("Request Sent", { description: "Your overtime request has been sent for approval." });
                onOpenChange(false);
                setHours("");
                setReason("");
            } else {
                toast.error("Error", { description: "Failed to send request." });
            }
        } catch (error) {
            toast.error("Error", { description: "Something went wrong." });
        } finally {
            setSubmitting(false);
        }
    };

    if (!shift) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Request Overtime Confirmation</DialogTitle>
                    <DialogDescription>
                        Confirm extra hours worked for the shift on {format(new Date(shift.dayDate), "MMM d, yyyy")}.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="rounded-md border p-3 bg-muted/20 text-sm">
                        <span className="font-medium">Shift:</span> {shift.startTime} - {shift.endTime} {shift.shiftName && `(${shift.shiftName})`}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="hours">Extra Hours Worked</Label>
                        <Input
                            id="hours"
                            type="number"
                            step="0.5"
                            placeholder="e.g. 1.5"
                            value={hours}
                            onChange={(e) => setHours(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason / Details</Label>
                        <Textarea
                            id="reason"
                            placeholder="Why was overtime needed?"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!hours || !reason || submitting}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Request
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
