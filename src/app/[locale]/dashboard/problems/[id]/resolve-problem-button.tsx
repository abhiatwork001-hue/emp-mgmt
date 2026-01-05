"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { resolveProblem } from "@/lib/actions/problem.actions";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function ResolveProblemButton({ problemId, currentStatus, userId, isResolved }: any) {
    const [open, setOpen] = useState(false);
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (isResolved) return null;

    const handleResolve = async () => {
        setIsSubmitting(true);
        try {
            const res = await resolveProblem(problemId, userId, notes);
            if (res.success) {
                toast.success("Problem marked as resolved");
                setOpen(false);
            } else {
                toast.error("Failed to resolve problem");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark as Resolved
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Resolve Problem</DialogTitle>
                    <DialogDescription>
                        Mark this problem as resolved. You can add an optional resolution note.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Textarea
                        placeholder="Resolution notes... (optional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleResolve} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Resolution"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
