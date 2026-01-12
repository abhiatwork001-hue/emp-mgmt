"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { assignEvaluationToStore, getEvaluationTemplates } from "@/lib/actions/evaluation.actions";
import { getAllStores } from "@/lib/actions/store.actions";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function EvaluationAssignmentDialog({ onSuccess }: { onSuccess?: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Data
    const [templates, setTemplates] = useState<any[]>([]);
    const [stores, setStores] = useState<any[]>([]);

    // Form
    const [selectedTemplate, setSelectedTemplate] = useState("");
    const [selectedStore, setSelectedStore] = useState("");
    const [dueDate, setDueDate] = useState<Date>();

    useEffect(() => {
        if (open) {
            Promise.all([
                getEvaluationTemplates(),
                getAllStores()
            ]).then(([t, s]) => {
                setTemplates(t);
                setStores(s);
            });
        }
    }, [open]);

    const handleAssign = async () => {
        if (!selectedTemplate || !selectedStore || !dueDate) {
            toast.error("Error", { description: "All fields are required" });
            return;
        }

        const store = stores.find(s => s._id === selectedStore);
        if (!store || !store.managers || store.managers.length === 0) {
            toast.error("Error", { description: "Selected store has no manager assigned." });
            return;
        }

        // Pick first manager for now
        // In future, let HR choose which manager
        const managerId = store.managers[0];

        setLoading(true);
        try {
            await assignEvaluationToStore(selectedTemplate, selectedStore, managerId, dueDate);
            toast.success("Success", { description: "Evaluation assigned successfully" });
            setOpen(false);
            onSuccess?.();
        } catch (error) {
            toast.error("Error", { description: "Failed to assign" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Assign Evaluation</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assign Evaluation to Store</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Template</Label>
                        <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select template..." />
                            </SelectTrigger>
                            <SelectContent>
                                {templates.map(t => (
                                    <SelectItem key={t._id} value={t._id}>{t.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Store</Label>
                        <Select value={selectedStore} onValueChange={setSelectedStore}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select store..." />
                            </SelectTrigger>
                            <SelectContent>
                                {stores.map(s => (
                                    <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 flex flex-col">
                        <Label>Due Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !dueDate && "text-muted-foreground"
                                    )}
                                >
                                    {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={dueDate}
                                    onSelect={setDueDate}
                                    disabled={(date) =>
                                        date < new Date()
                                    }
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={handleAssign} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Assign
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
