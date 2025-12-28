"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Loader2 } from "lucide-react";
import { updateVacationTracker } from "@/lib/actions/vacation.actions";
import { toast } from "sonner";

interface EditVacationDialogProps {
    employeeId: string;
    tracker: {
        defaultDays: number;
        rolloverDays: number;
        usedDays: number;
    };
}

export function EditVacationDialog({ employeeId, tracker }: EditVacationDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [defaultDays, setDefaultDays] = useState(tracker.defaultDays.toString());
    const [rolloverDays, setRolloverDays] = useState(tracker.rolloverDays.toString());
    const [usedDays, setUsedDays] = useState(tracker.usedDays.toString());

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateVacationTracker(employeeId, {
                defaultDays: parseFloat(defaultDays),
                rolloverDays: parseFloat(rolloverDays),
                usedDays: parseFloat(usedDays)
            });
            toast.success("Vacation balance updated");
            setOpen(false);
        } catch (error) {
            toast.error("Failed to update balance");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary">
                    <Edit className="h-3 w-3" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Vacation Balance</DialogTitle>
                    <DialogDescription>
                        Manually adjust the vacation allowance for this employee.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="defaultDays">Base Allowance (Current Year)</Label>
                        <Input
                            id="defaultDays"
                            type="number"
                            step="0.5"
                            value={defaultDays}
                            onChange={(e) => setDefaultDays(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="rolloverDays">Rollover Days (Last Year Balance)</Label>
                        <Input
                            id="rolloverDays"
                            type="number"
                            step="0.5"
                            value={rolloverDays}
                            onChange={(e) => setRolloverDays(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Extra days carried over from previous years.</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="usedDays">Used Days</Label>
                        <Input
                            id="usedDays"
                            type="number"
                            step="0.5"
                            value={usedDays}
                            onChange={(e) => setUsedDays(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
