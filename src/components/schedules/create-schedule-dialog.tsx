"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CalendarIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStoreDepartments } from "@/lib/actions/store-department.actions";
import { getOrCreateSchedule } from "@/lib/actions/schedule.actions";

interface CreateScheduleDialogProps {
    storeId: string;
    preSelectedDepartmentId?: string;
    trigger?: React.ReactNode;
}

export function CreateScheduleDialog({ storeId, preSelectedDepartmentId, trigger }: CreateScheduleDialogProps) {
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
            router.push(`/dashboard/schedules/${schedule._id}`);
        } catch (error) {
            console.error("Failed to create/get schedule", error);
            alert("Failed to create schedule. Please try again.");
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
                        <Plus className="mr-2 h-4 w-4" /> Create Schedule
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create/Edit Schedule</DialogTitle>
                    <DialogDescription>
                        Select a department and the start date. We'll open the editor for that week.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {!preSelectedDepartmentId && (
                        <div className="grid gap-2">
                            <Label htmlFor="department">Department</Label>
                            <Select value={selectedDepartment} onValueChange={setSelectedDepartment} disabled={loading}>
                                <SelectTrigger id="department">
                                    <SelectValue placeholder="Select department" />
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
                        <Label>Week Of</Label>
                        <Input
                            type="date"
                            value={date ? date.toISOString().split('T')[0] : ""}
                            onChange={handleDateChange}
                        />
                        <p className="text-[0.8rem] text-muted-foreground">
                            Select any day in the desired week.
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleCreate} disabled={loading || !selectedDepartment}>
                        {loading ? "Opening..." : "Open Schedule Editor"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

