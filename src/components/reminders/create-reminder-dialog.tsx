"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, BellPlus } from "lucide-react";
import { createReminder } from "@/lib/actions/reminder.actions";
import { toast } from "sonner";

interface CreateReminderDialogProps {
    userId: string;
    onSuccess?: () => void;
}

export function CreateReminderDialog({ userId, onSuccess }: CreateReminderDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState("general");
    const [priority, setPriority] = useState("medium");
    const [dueDate, setDueDate] = useState("");
    const [targetRole, setTargetRole] = useState("all");

    const handleSubmit = async () => {
        if (!title || !dueDate) return;
        setLoading(true);

        try {
            const res = await createReminder({
                title,
                description,
                type,
                priority,
                dueDate,
                targetRoles: targetRole === 'all' ? [] : [targetRole], // Simplified single selection
                createdBy: userId
            });

            if (res.success) {
                toast.success("Reminder Created");
                setOpen(false);
                // Reset form
                setTitle("");
                setDescription("");
                if (onSuccess) onSuccess();
            } else {
                toast.error("Failed to create reminder");
            }
        } catch (error) {
            toast.error("Error creating reminder");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <BellPlus className="h-4 w-4" />
                    New Reminder
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create Reminder</DialogTitle>
                    <DialogDescription>
                        Send an alert or meeting reminder to staff.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Staff Meeting" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="desc">Description</Label>
                        <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Type</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="general">General</SelectItem>
                                    <SelectItem value="meeting">Meeting</SelectItem>
                                    <SelectItem value="order">Order Check</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Priority</Label>
                            <Select value={priority} onValueChange={setPriority}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="date">Due Date</Label>
                        <Input id="date" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Target Audience</Label>
                        <Select value={targetRole} onValueChange={setTargetRole}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Everyone</SelectItem>
                                <SelectItem value="store_manager">Store Managers</SelectItem>
                                <SelectItem value="employee">Employees</SelectItem>
                                <SelectItem value="admin">Admins</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={loading || !title || !dueDate}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
