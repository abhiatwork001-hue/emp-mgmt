
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Bell, CheckCircle2, ChevronRight } from "lucide-react";
import { notifyScheduleReminders } from "@/lib/actions/schedule.actions";
import { toast } from "sonner";
import { Link } from "@/i18n/routing";

interface ScheduleAlertModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    missingEntities: string[]; // List of names
    // We need IDs to notify. Passing logic:
    // Ideally we pass full objects { id: string, name: string } to this modal.
    // But currently data props are just Strings.
    // We will update the parent to pass objects.
    missingEntityObjects?: { id: string; name: string }[];
    type: 'store' | 'department';
}

export function ScheduleAlertModal({ isOpen, onOpenChange, missingEntities, missingEntityObjects, type }: ScheduleAlertModalProps) {
    const [isNotifying, setIsNotifying] = useState(false);
    const [notified, setNotified] = useState(false);

    const handleNotify = async () => {
        if (!missingEntityObjects || missingEntityObjects.length === 0) return;

        setIsNotifying(true);
        try {
            const ids = missingEntityObjects.map(e => e.id);
            const result = await notifyScheduleReminders(ids, type);
            if (result.success) {
                toast.success(`Sent reminders to ${result.count} managers.`);
                setNotified(true);
            } else {
                toast.error("Failed to send reminders.");
            }
        } catch (error) {
            toast.error("An error occurred.");
        } finally {
            setIsNotifying(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-5 w-5" />
                        Missing Schedules
                    </DialogTitle>
                    <DialogDescription>
                        The following {type === 'store' ? 'stores' : 'departments'} have not published next week's schedule.
                        Deadline has passed.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[300px] w-full rounded-md border p-4 bg-muted/20">
                    <div className="space-y-2">
                        {(missingEntityObjects?.map(e => e.name) || missingEntities).map((name, i) => (
                            <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-background shadow-sm">
                                <span className="font-medium">{name}</span>
                                <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider bg-red-50 px-2 py-0.5 rounded-full">Overdue</span>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                        Close
                    </Button>
                    {missingEntityObjects && missingEntityObjects.length > 0 && !notified && (
                        <Button
                            onClick={handleNotify}
                            disabled={isNotifying}
                            className="w-full sm:w-auto bg-destructive border-destructive/50 hover:bg-destructive/90"
                        >
                            {isNotifying ? (
                                "Sending..."
                            ) : (
                                <>
                                    <Bell className="mr-2 h-4 w-4" />
                                    Alert {type === 'store' ? 'Store Managers' : 'Department Heads'}
                                </>
                            )}
                        </Button>
                    )}
                    {notified && (
                        <Button variant="secondary" disabled className="w-full sm:w-auto text-emerald-600">
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Reminders Sent
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
