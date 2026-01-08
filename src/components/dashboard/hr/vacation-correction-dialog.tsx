"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateVacationTracker } from "@/lib/actions/vacation.actions";
import { toast } from "sonner";
import { Settings2, Loader2 } from "lucide-react";

export function VacationCorrectionDialog({ employeeId, currentTracker, onUpdate, trigger }: { employeeId: string, currentTracker: any, onUpdate?: () => void, trigger?: React.ReactNode }) {
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        defaultDays: currentTracker?.defaultDays || 22,
        rolloverDays: currentTracker?.rolloverDays || 0,
        usedDays: currentTracker?.usedDays || 0
    });

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await updateVacationTracker(employeeId, formData);
            toast.success("Vacation balance corrected successfully");
            setOpen(false);
            if (onUpdate) onUpdate();
        } catch (error: any) {
            toast.error(error.message || "Failed to update balance");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors">
                        <Settings2 className="h-4 w-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5 text-primary" />
                        Correct Vacation Balance
                    </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="defaultDays" className="text-right">Allocation</Label>
                        <Input
                            id="defaultDays"
                            type="number"
                            value={formData.defaultDays}
                            onChange={(e) => setFormData({ ...formData, defaultDays: parseInt(e.target.value) })}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="rolloverDays" className="text-right">Rollover</Label>
                        <Input
                            id="rolloverDays"
                            type="number"
                            value={formData.rolloverDays}
                            onChange={(e) => setFormData({ ...formData, rolloverDays: parseInt(e.target.value) })}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="usedDays" className="text-right">Used</Label>
                        <Input
                            id="usedDays"
                            type="number"
                            value={formData.usedDays}
                            onChange={(e) => setFormData({ ...formData, usedDays: parseInt(e.target.value) })}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
