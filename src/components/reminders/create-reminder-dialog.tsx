"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, BellPlus, Calendar as CalendarIcon, Clock } from "lucide-react";
import { createReminder } from "@/lib/actions/reminder.actions";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

interface CreateReminderDialogProps {
    userId: string;
    onSuccess?: () => void;
}

export function CreateReminderDialog({ userId, onSuccess }: CreateReminderDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const t = useTranslations("Reminders");

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState("general");
    const [priority, setPriority] = useState("medium");
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [time, setTime] = useState("12:00");
    const [targetRole, setTargetRole] = useState("all");

    const handleSubmit = async () => {
        if (!title || !date) return;
        setLoading(true);

        try {
            // Combine date and time
            const combinedDate = new Date(date);
            if (time) {
                const [hours, minutes] = time.split(':').map(Number);
                combinedDate.setHours(hours, minutes);
            }

            const res = await createReminder({
                title,
                description,
                type,
                priority,
                dueDate: combinedDate.toISOString(),
                targetRoles: targetRole === 'all' ? [] : [targetRole],
                createdBy: userId
            });

            if (res.success) {
                toast.success(t('reminderCreated'));
                setOpen(false);
                // Reset form
                setTitle("");
                setDescription("");
                if (onSuccess) onSuccess();
            } else {
                toast.error(t('failedCreate'));
            }
        } catch (error) {
            toast.error(t('errorCreate'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <BellPlus className="h-4 w-4" />
                    {t('newReminder')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('createReminder')}</DialogTitle>
                    <DialogDescription>
                        {t('createDescription')}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">{t('title')}</Label>
                        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('titlePlaceholder')} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="desc">{t('description')}</Label>
                        <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>{t('type')}</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="general">{t('general')}</SelectItem>
                                    <SelectItem value="meeting">{t('meeting')}</SelectItem>
                                    <SelectItem value="order">{t('order')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('priority')}</Label>
                            <Select value={priority} onValueChange={setPriority}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">{t('low')}</SelectItem>
                                    <SelectItem value="medium">{t('medium')}</SelectItem>
                                    <SelectItem value="high">{t('high')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label>{t('dueDate')}</Label>
                        <div className="flex gap-2">
                            <DatePicker
                                date={date}
                                setDate={setDate}
                                className="flex-1"
                                placeholder={t('pickDate')}
                            />
                            <div className="relative group">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="w-[130px] pl-10 h-10 bg-background border-input hover:border-primary/50 transition-all font-medium"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label>{t('targetAudience')}</Label>
                        <Select value={targetRole} onValueChange={setTargetRole}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('everyone')}</SelectItem>
                                <SelectItem value="store_manager">{t('storeManagers')}</SelectItem>
                                <SelectItem value="employee">{t('employees')}</SelectItem>
                                <SelectItem value="admin">{t('admins')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={loading || !title || !date}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('create')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
