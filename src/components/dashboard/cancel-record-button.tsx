"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cancelVacationRecord } from "@/lib/actions/vacation.actions";
import { cancelAbsenceRecord } from "@/lib/actions/absence.actions";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CancelRecordButtonProps {
    recordId: string;
    actorId: string;
    type: "vacation" | "absence";
}

export function CancelRecordButton({ recordId, actorId, type }: CancelRecordButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const handleCancel = async () => {
        setIsLoading(true);
        try {
            if (type === "vacation") {
                await cancelVacationRecord(recordId, actorId);
            } else {
                await cancelAbsenceRecord(recordId, actorId);
            }
            toast.success(`${type === "vacation" ? "Vacation" : "Absence"} record cancelled successfully`);
            setOpen(false);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || `Failed to cancel ${type}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8">
                    <XCircle className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete this approved {type} record.
                        {type === "vacation" && " The employee's vacation balance will be reverted."}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleCancel();
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                        Confirm Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
