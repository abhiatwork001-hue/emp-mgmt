"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CalendarIcon, Plus } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { getStoreDepartments } from "@/lib/actions/store-department.actions";
import { getOrCreateSchedule } from "@/lib/actions/schedule.actions";

interface CreateScheduleDialogProps {
    storeId: string;
    preSelectedDepartmentId?: string;
    trigger?: React.ReactNode;
}

export function CreateScheduleDialog({ storeId, preSelectedDepartmentId, trigger }: CreateScheduleDialogProps) {
    const t = useTranslations("Schedules.createDialog");
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState<any[]>([]);
    const [selectedDepartment, setSelectedDepartment] = useState(preSelectedDepartmentId || "");
    const [date, setDate] = useState<Date>(new Date());
    const router = useRouter();

    useEffect(() => {
        if (open && !preSelectedDepartmentId) {
            loadDepartments();
        }
    }, [open, preSelectedDepartmentId]);

    const loadDepartments = async () => {
        setLoading(true);
        try {
            const depts = await getStoreDepartments(storeId);
            setDepartments(depts);
        } catch (error) {
            console.error("Failed to load departments", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!selectedDepartment || !date) return;

        setLoading(true);
        try {
            // We need to pass the current user ID. 
            // Since we are in a client component, we rely on the server action to get the session 
            // OR we assume the action handles it.
            // Let's assume we need to update the action to get session, or pass a placeholder if purely client-triggered
            // For now, I'll pass a placeholder or handle it in the action update.
            // Actually, I'll update the action next to fetch session.

            const schedule = await getOrCreateSchedule(storeId, selectedDepartment, date, "SESSION_USER_ID_PLACEHOLDER");

            setOpen(false);
            router.push(`/dashboard/schedules/${schedule.slug || schedule._id}`);
        } catch (error) {
            console.error("Failed to create/get schedule", error);
            // Consider using toast here instead of alert if possible, or leave as alert but localized?
            // Alert strings are hard to localize properly without a hook, but next-intl works here.
            alert("Failed to create schedule. Please try again."); // Keeping English alert for now or move to toast
        } finally {
            setLoading(false);
        }
    };


    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            setDate(new Date(e.target.value));
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> {t('trigger')}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('title')}</DialogTitle>
                    <DialogDescription>
                        {t('desc')}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {!preSelectedDepartmentId && (
                        <div className="grid gap-2">
                            <Label htmlFor="department">{t('deptLabel')}</Label>
                            <Select value={selectedDepartment} onValueChange={setSelectedDepartment} disabled={loading}>
                                <SelectTrigger id="department">
                                    <SelectValue placeholder={t('deptPlaceholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments.map((dept) => (
                                        <SelectItem key={dept._id} value={dept._id}>
                                            {dept.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="grid gap-2">
                        <Label>{t('weekLabel')}</Label>
                        <DatePicker
                            date={date}
                            setDate={(d) => setDate(d || new Date())}
                            placeholder={t('weekPlaceholder')}
                        />
                        <p className="text-[0.8rem] text-muted-foreground">
                            {t('weekHint')}
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleCreate} disabled={loading || !selectedDepartment}>
                        {loading ? t('loading') : t('submit')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

