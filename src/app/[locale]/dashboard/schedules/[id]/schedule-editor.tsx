"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@/i18n/routing";
import { Separator } from "@/components/ui/separator";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

import { ShiftDialog } from "@/components/schedules/shift-dialog";
import { SwapRequestDialog } from "@/components/schedules/swap-request-dialog";
import { OvertimeRequestDialog } from "@/components/schedules/overtime-request-dialog";
import { MobileScheduleView } from "./mobile-view";
import { useRouter } from "next/navigation";
import { getOrCreateSchedule, updateScheduleStatus, updateSchedule, copyPreviousSchedule } from "@/lib/actions/schedule.actions";
import { toast } from "sonner";
import {
    ChevronLeft, ChevronRight, Save, User, Users, ArrowLeft, Loader2, Copy, Trash2, X, Plus, Filter, Tag, Check, XCircle, Clock, Calendar,
    ArrowRight, Lock, CheckCircle2, MoreVertical, Send, Printer, Settings, AlertTriangle, AlertCircle
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { useTranslations } from "next-intl";
import { format } from "date-fns";

export function ScheduleEditor({ initialSchedule, userId, canEdit }: { initialSchedule: any, userId: string, canEdit: boolean }) {
    const router = useRouter();
    const t = useTranslations("Schedule");
    const tc = useTranslations("Common");
    const [schedule, setSchedule] = useState(initialSchedule);
    const [weekDays, setWeekDays] = useState<any[]>(initialSchedule.days || []);
    const [actionLoading, setActionLoading] = useState(false);

    // Persistence State
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Derived State
    const isEditMode = canEdit && (schedule.status === 'draft' || schedule.status === 'rejected');

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [editingShift, setEditingShift] = useState<{ shift: any, dayDate: string, index: number } | null>(null);

    // Alert Dialog States
    const [copyDialogOpen, setCopyDialogOpen] = useState(false);
    const [validationAlertOpen, setValidationAlertOpen] = useState(false);
    const [validationMessage, setValidationMessage] = useState("");

    // Status Confirmation States
    const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
    const [pendingStatus, setPendingStatus] = useState<string | null>(null);

    // Rejection Dialog State
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");

    // Delete Shift State
    const [deleteShiftAlertOpen, setDeleteShiftAlertOpen] = useState(false);
    const [shiftToDelete, setShiftToDelete] = useState<{ dayDate: string, index: number } | null>(null);

    // Filter State
    const [hideUnscheduled, setHideUnscheduled] = useState(false);

    // Swap Dialog State
    const [swapDialogOpen, setSwapDialogOpen] = useState(false);
    const [targetSwapShift, setTargetSwapShift] = useState<any>(null);

    // Overtime Dialog State
    const [overtimeDialogOpen, setOvertimeDialogOpen] = useState(false);
    const [targetOvertimeShift, setTargetOvertimeShift] = useState<any>(null);

    // We need to re-derive employees map client-side or pass it clean
    const getAllEmployees = () => {
        const emps = new Map();
        weekDays.forEach((day: any) => {
            day.shifts.forEach((shift: any) => {
                shift.employees.forEach((emp: any) => {
                    if (!emps.has(emp._id)) emps.set(emp._id, emp);
                });
            });
        });
        return Array.from(emps.values());
    };
    const allEmployees = getAllEmployees();

    const uniqueEmployees = hideUnscheduled
        ? allEmployees.filter(emp => {
            // Check if employee has any shifts in this week
            return weekDays.some(day =>
                day.shifts.some((s: any) => s.employees.some((e: any) => e._id === emp._id))
            );
        })
        : allEmployees;

    const handleAddClick = (date: string) => {
        if (!isEditMode) return;
        setSelectedDate(new Date(date));
        setEditingShift(null); // Ensure we are in create mode
        setIsDialogOpen(true);
    };

    const handleEditClick = (shift: any, date: string, index: number) => {
        setSelectedDate(new Date(date));
        setEditingShift({ shift, dayDate: date, index });
        setIsDialogOpen(true);
    };

    const handleSaveShift = (shiftData: any) => {
        // Logic to update local state
        const targetDate = selectedDate.toISOString().split('T')[0];

        const newWeekDays = weekDays.map(day => {
            const dayDate = new Date(day.date).toISOString().split('T')[0];
            if (dayDate === targetDate) {

                // Logic to toggle Holiday
                if (shiftData.isHoliday !== undefined) {
                    return {
                        ...day,
                        isHoliday: shiftData.isHoliday,
                        holidayName: shiftData.holidayName,
                        shifts: shiftData.isHoliday ? [] : day.shifts
                    };
                }

                const updatedShifts = [...day.shifts];

                if (editingShift) {
                    // Update existing shift
                    updatedShifts[editingShift.index] = {
                        ...updatedShifts[editingShift.index],
                        shiftName: shiftData.shiftName,
                        startTime: shiftData.startTime,
                        endTime: shiftData.endTime,
                        breakMinutes: shiftData.breakMinutes,
                        employees: shiftData.employees,
                        notes: shiftData.notes,
                    };
                } else {
                    // Create new shift
                    updatedShifts.push({
                        shiftName: shiftData.shiftName,
                        startTime: shiftData.startTime,
                        endTime: shiftData.endTime,
                        breakMinutes: shiftData.breakMinutes,
                        employees: shiftData.employees,
                        notes: shiftData.notes,
                        // In real app, generate temp ID
                    });
                }

                return {
                    ...day,
                    shifts: updatedShifts
                };
            }
            return day;
        });

        setWeekDays(newWeekDays);
        setHasUnsavedChanges(true);
        setEditingShift(null); // Reset after save
    };

    const handleManualSave = async () => {
        setIsSaving(true);
        try {
            await updateSchedule(schedule._id, { days: weekDays });
            setLastSaved(new Date());
            setHasUnsavedChanges(false);
            toast.success("Changes saved successfully");
        } catch (error) {
            console.error("Save failed", error);
            toast.error("Failed to save changes");
        } finally {
            setIsSaving(false);
        }
    };

    const handleNavigate = async (direction: 'next' | 'prev') => {
        setActionLoading(true);
        try {
            const currentStart = new Date(schedule.dateRange.startDate);
            const newDate = new Date(currentStart);
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));

            const newSchedule = await getOrCreateSchedule(
                schedule.storeId,
                schedule.storeDepartmentId?._id || schedule.storeDepartmentId,
                newDate
            );

            router.push(`/dashboard/schedules/${newSchedule._id}`);
        } catch (error) {
            console.error("Navigation failed", error);
            setActionLoading(false);
        } finally {
            setActionLoading(false);
        }
    };

    const handleCopyLastWeekConfirm = async () => {
        setCopyDialogOpen(false);
        setActionLoading(true);
        try {
            const updated = await copyPreviousSchedule(schedule._id, userId);
            setSchedule(updated);
            setWeekDays(updated.days); // Sync local state immediately
            // Optionally set last saved since backend update happened
            setLastSaved(new Date());
        } catch (error) {
            console.error("Copy failed", error);
            setValidationMessage("Failed to copy schedule. The previous week might be empty or an error occurred.");
            setValidationAlertOpen(true);
        } finally {
            setActionLoading(false);
        }
    };

    const validateSchedule = () => {
        // Check if every day is either closed (isHoliday) or has at least one shift
        const incompleteDays = weekDays.filter(day => !day.isHoliday && day.shifts.length === 0);

        if (incompleteDays.length > 0) {
            const dayNames = incompleteDays.map(d => new Date(d.date).toLocaleDateString('en-US', { weekday: 'long' })).join(', ');
            setValidationMessage(`Please complete the schedule for the following days or mark them as closed: ${dayNames}`);
            setValidationAlertOpen(true);
            return false;
        }
        return true;
    };

    const handleStatusActionClick = (status: string) => {
        if (status === 'pending') {
            if (!validateSchedule()) return;
        }

        if (status === 'rejected') {
            setRejectDialogOpen(true);
            return;
        }

        setPendingStatus(status);
        setStatusConfirmOpen(true);
    };

    const confirmStatusChange = async () => {
        if (!pendingStatus) return;
        setStatusConfirmOpen(false);

        setActionLoading(true);
        try {
            const updated = await updateScheduleStatus(schedule._id, pendingStatus, userId);
            setSchedule(updated);
        } catch (error) {
            console.error("Status update failed", error);
        } finally {
            setActionLoading(false);
            setPendingStatus(null);
        }
    };

    const handleRejectConfirm = async () => {
        if (!rejectionReason) {
            return; // Should be handled by UI state ideally
        }
        setRejectDialogOpen(false);

        setActionLoading(true);
        try {
            const updated = await updateScheduleStatus(schedule._id, 'rejected', userId, rejectionReason);
            setSchedule(updated);
            setRejectionReason("");
        } catch (error) {
            console.error("Status update failed", error);
        } finally {
            setActionLoading(false);
        }
    };

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, shift: any) => {
        e.dataTransfer.setData("application/json", JSON.stringify(shift));
        e.dataTransfer.effectAllowed = "copy";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    };

    const handleDrop = (e: React.DragEvent, targetDateStr: string, targetEmployeeId: string) => {
        if (!isEditMode) return;
        e.preventDefault();
        const data = e.dataTransfer.getData("application/json");
        if (!data) return;

        try {
            const sourceShift = JSON.parse(data);
            const targetDate = new Date(targetDateStr).toISOString().split('T')[0];

            // Find target employee object
            const targetEmployee = uniqueEmployees.find((e: any) => e._id === targetEmployeeId);
            if (!targetEmployee) return;

            const newWeekDays = weekDays.map(day => {
                const dayDate = new Date(day.date).toISOString().split('T')[0];
                if (dayDate === targetDate) {
                    // Create new shift based on source, but for new target
                    const newShift = {
                        ...sourceShift,
                        _id: undefined, // Clear ID to ensure it's treated as new if passed to backend later
                        employees: [targetEmployee], // Assign to target employee
                    };
                    return {
                        ...day,
                        shifts: [...day.shifts, newShift]
                    };
                }
                return day;
            });

            setWeekDays(newWeekDays);
            setHasUnsavedChanges(true);

        } catch (err) {
            console.error("Failed to parse drop data", err);
        }
    };

    const confirmDeleteShift = (dayDate: string, index: number) => {
        setShiftToDelete({ dayDate, index });
        setDeleteShiftAlertOpen(true);
    };

    const executeDeleteShift = () => {
        let targetWeekDays = [...weekDays];
        let targetIndex = -1;
        let targetDateStr = "";

        if (shiftToDelete) {
            targetDateStr = new Date(shiftToDelete.dayDate).toISOString().split('T')[0];
            targetIndex = shiftToDelete.index;
        } else if (editingShift && isDialogOpen) {
            // Fallback for delete from dialog
            targetDateStr = new Date(editingShift.dayDate).toISOString().split('T')[0];
            targetIndex = editingShift.index;
        } else {
            return;
        }

        const newWeekDays = targetWeekDays.map(day => {
            const dayDate = new Date(day.date).toISOString().split('T')[0];
            if (dayDate === targetDateStr) {
                const updatedShifts = [...day.shifts];
                updatedShifts.splice(targetIndex, 1);
                return {
                    ...day,
                    shifts: updatedShifts
                };
            }
            return day;
        });

        setWeekDays(newWeekDays);
        setHasUnsavedChanges(true);

        // Reset states
        setShiftToDelete(null);
        setDeleteShiftAlertOpen(false);
        if (isDialogOpen) {
            setIsDialogOpen(false);
            setEditingShift(null);
        }
    };

    // Wrapper for ShiftDialog's onDelete prop (which still expects void)
    // We can just trigger the same logic but without re-opening the alert if the dialog controls its own alert OR 
    // we can make ShiftDialog just call this and let this component handle the alert.
    // Given the previous refactor of ShiftDialog, it has its own alert. So we just need to execute logic.
    const handleDeleteFromDialog = () => {
        if (!editingShift) return;
        // ShiftDialog already asked for confirmation via its own internal state, so we just execute.
        executeDeleteShift();
    };

    // Helper to check if date is today
    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" asChild>
                        <Link href="/dashboard/schedules"><ChevronLeft className="h-4 w-4" /></Link>
                    </Button>

                    <div className="flex items-center gap-2 border border-border rounded-md p-1 bg-muted/40">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleNavigate('prev')} disabled={actionLoading}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-center min-w-[140px]">
                            <h2 className="text-lg font-bold tracking-tight text-foreground">
                                Week {schedule.weekNumber}
                            </h2>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">
                                {new Date(schedule.dateRange.startDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} - {new Date(schedule.dateRange.endDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                            </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleNavigate('next')} disabled={actionLoading}>
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="hidden md:block">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">{schedule.storeDepartmentId?.name}</span>
                            <Badge variant={schedule.status === 'published' ? 'default' : schedule.status === 'pending' ? 'secondary' : 'outline'} className="capitalize">
                                {tc(schedule.status)}
                            </Badge>
                            {!isEditMode && <Badge variant="secondary" className="gap-1 bg-muted/50 border-border text-muted-foreground"><Lock className="h-3 w-3" /> {tc('viewOnly') || 'View Only'}</Badge>}

                            {/* Manual Save Button */}
                            {hasUnsavedChanges ? (
                                <Button
                                    size="sm"
                                    onClick={handleManualSave}
                                    disabled={isSaving}
                                    className="gap-2 bg-primary"
                                >
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    {t('saveChanges') || "Save Changes"}
                                </Button>
                            ) : null}

                            {!hasUnsavedChanges && lastSaved && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {t('saved') || "Saved"}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {(schedule.status === 'draft' || schedule.status === 'rejected') && (
                        <>
                            {isEditMode && (
                                <Button
                                    variant="outline"
                                    onClick={() => setCopyDialogOpen(true)}
                                    disabled={actionLoading}
                                    className="mr-2 border-border hover:bg-muted"
                                >
                                    <Copy className="mr-2 h-4 w-4" /> {t('copyPrevious')}
                                </Button>
                            )}
                            <Button
                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                onClick={() => handleStatusActionClick('pending')}
                                disabled={actionLoading || !weekDays.every(d => d.isHoliday || d.shifts.length > 0)}
                                style={{ display: (isEditMode && canEdit) ? 'flex' : 'none' }} // Hide via style to avoid complex conditional wrapping if needed, or just wrap
                            >
                                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                {t('sendForApproval')}
                            </Button>
                            {!weekDays.every(d => d.isHoliday || d.shifts.length > 0) && (isEditMode && canEdit) && (
                                <p className="text-[10px] text-muted-foreground w-full text-right uppercase tracking-tight">Complete all days to enable</p>
                            )}
                        </>
                    )}

                    {/* Manager/Admin Actions */}
                    {schedule.status === 'pending' && (
                        <>
                            <Button
                                variant="destructive"
                                onClick={() => handleStatusActionClick('rejected')}
                                disabled={actionLoading}
                            >
                                <XCircle className="mr-2 h-4 w-4" /> {tc('reject')}
                            </Button>
                            {isEditMode && canEdit && (
                                <Button
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                    onClick={() => handleStatusActionClick('pending')}
                                    disabled={actionLoading}
                                >
                                    <Send className="mr-2 h-4 w-4" /> {t('sendForApproval')}
                                </Button>
                            )}
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => handleStatusActionClick('published')}
                                disabled={actionLoading}
                            >
                                <CheckCircle2 className="mr-2 h-4 w-4" /> {t('approve')}
                            </Button>
                        </>
                    )}

                    {schedule.status === 'published' && canEdit && (
                        <Button
                            variant="outline"
                            onClick={() => handleStatusActionClick('draft')}
                            disabled={actionLoading}
                            className="border-border hover:bg-muted"
                        >
                            <X className="mr-2 h-4 w-4" /> {tc('edit')}
                        </Button>
                    )}

                    <Separator orientation="vertical" className="h-6 mx-2" />

                    <div className="flex items-center space-x-2 mr-2">
                        <Switch
                            id="hide-unscheduled"
                            checked={hideUnscheduled}
                            onCheckedChange={setHideUnscheduled}
                        />
                        <Label htmlFor="hide-unscheduled" className="text-xs">{t('scheduledOnly')}</Label>
                    </div>

                    <Button variant="outline" size="sm"><Printer className="h-4 w-4" /></Button>
                    <Button variant="outline" size="sm"><Settings className="h-4 w-4" /></Button>
                </div>
            </div>



            {/* Mobile View */}
            <MobileScheduleView
                employees={uniqueEmployees}
                weekDays={weekDays}
                isEditMode={isEditMode}
                onEditShift={handleEditClick}
                onAddShift={handleAddClick}
                onDeleteShift={confirmDeleteShift}
                isToday={isToday}
            />

            {/* Calendar Grid (Desktop) */}
            <div className="hidden md:block">
                <Card className="bg-card border-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                    <th className="p-4 min-w-[200px] font-medium sticky left-0 bg-background/95 backdrop-blur z-10 border-r border-border">{t('employee')}</th>
                                    {weekDays.map((day: any, i: number) => {
                                        const isCurrentDay = isToday(new Date(day.date));
                                        return (
                                            <th key={i} className={`p-4 min-w-[150px] font-medium border-r border-border last:border-r-0 text-center group relative transition-colors ${day.isHoliday ? 'bg-muted/50' : isCurrentDay ? 'bg-primary/10' : 'hover:bg-muted/80'}`}>
                                                <div className="flex flex-col items-center">
                                                    <span className={`uppercase text-xs font-bold ${isCurrentDay ? 'text-primary' : ''}`}>{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                                    <div className={`text-xs font-normal w-6 h-6 flex items-center justify-center rounded-full mt-1 ${isCurrentDay ? 'bg-primary text-primary-foreground' : ''}`}>
                                                        {new Date(day.date).getDate()}
                                                    </div>
                                                    {day.isHoliday && <span className="text-[10px] text-red-500 font-bold mt-1 max-w-[100px] truncate">{day.holidayName || "Closed"}</span>}
                                                </div>

                                                {/* Day Actions Popover */}
                                                {isEditMode && (
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="absolute top-1 left-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Settings className="h-3 w-3" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-60 bg-popover border-border text-popover-foreground">
                                                            <div className="space-y-4">
                                                                <h4 className="font-medium leading-none">{t('daySettings')}</h4>
                                                                <div className="flex items-center space-x-2">
                                                                    <Switch
                                                                        id={`closed-${i}`}
                                                                        checked={day.isHoliday}
                                                                        onCheckedChange={(checked) => {
                                                                            const dateStr = new Date(day.date).toISOString().split('T')[0];
                                                                            const updatedDays = weekDays.map(d => {
                                                                                if (new Date(d.date).toISOString().split('T')[0] === dateStr) {
                                                                                    return { ...d, isHoliday: checked, holidayName: checked ? "Closed" : "" };
                                                                                }
                                                                                return d;
                                                                            });
                                                                            setWeekDays(updatedDays);
                                                                            setHasUnsavedChanges(true);
                                                                        }}
                                                                    />
                                                                    <Label htmlFor={`closed-${i}`}>{t('storeClosed')}</Label>
                                                                </div>
                                                                {day.isHoliday && (
                                                                    <div className="grid gap-2">
                                                                        <Label htmlFor={`reason-${i}`}>{tc('description')}</Label>
                                                                        <Input
                                                                            id={`reason-${i}`}
                                                                            value={day.holidayName || ""}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                const dateStr = new Date(day.date).toISOString().split('T')[0];
                                                                                const updatedDays = weekDays.map(d => {
                                                                                    if (new Date(d.date).toISOString().split('T')[0] === dateStr) {
                                                                                        return { ...d, holidayName: val };
                                                                                    }
                                                                                    return d;
                                                                                });
                                                                                setWeekDays(updatedDays);
                                                                                setHasUnsavedChanges(true);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                )}

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={`absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ${(!isEditMode || day.isHoliday) && 'hidden'}`}
                                                    onClick={() => handleAddClick(day.date)}
                                                    disabled={!isEditMode || day.isHoliday}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </th>
                                        );
                                    })}
                                    <th className="p-4 min-w-[100px] font-medium text-center">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {uniqueEmployees.map((emp: any) => {
                                    let totalMinutes = 0;
                                    let totalShifts = 0;

                                    // Calculate totals first
                                    weekDays.forEach((day: any) => {
                                        day.shifts.forEach((s: any) => {
                                            if (s.employees.some((e: any) => e._id === emp._id)) {
                                                if (s.shiftName !== "Day Off") {
                                                    const getM = (t: string) => {
                                                        if (!t) return 0;
                                                        const [h, m] = t.split(':').map(Number);
                                                        return h * 60 + (m || 0);
                                                    };
                                                    let dur = getM(s.endTime) - getM(s.startTime);
                                                    if (dur < 0) dur += 24 * 60;
                                                    if (s.breakMinutes) dur -= s.breakMinutes;
                                                    totalMinutes += dur;
                                                    totalShifts++;
                                                }
                                            }
                                        });
                                    });

                                    const contractHours = emp.contract?.weeklyHours || 40;
                                    const contractDays = emp.contract?.workingDays?.length || 5;
                                    const totalHours = totalMinutes / 60;

                                    const isUnderHours = totalHours < contractHours;
                                    const isUnderDays = totalShifts < contractDays;
                                    return (
                                        <tr key={emp._id} className="hover:bg-muted/30">
                                            <td className="p-4 sticky left-0 bg-background/95 backdrop-blur z-10 border-r border-border">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={emp.image} />
                                                        <AvatarFallback>{emp.firstName[0]}{emp.lastName[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium text-foreground">{emp.firstName} {emp.lastName}</p>
                                                        <p className="text-xs text-muted-foreground">{emp.positionId?.name || "Staff"}</p>

                                                        {/* Schedule Alerts */}
                                                        <div className="flex flex-col gap-0.5 mt-1">
                                                            <div className={`text-[10px] items-center gap-1 flex ${isUnderHours ? "text-amber-500 font-bold" : "text-primary text-muted-foreground/80"}`}>
                                                                <Clock className="h-3 w-3" />
                                                                {t('underHours', { hours: totalHours.toFixed(1), contract: contractHours })}
                                                            </div>
                                                            {isUnderDays && (
                                                                <div className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                                                                    <Calendar className="h-3 w-3" />
                                                                    {t('underDays', { days: totalShifts, contract: contractDays })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            {weekDays.map((day: any, i: number) => {
                                                const empShifts = day.shifts.filter((s: any) =>
                                                    s.employees.some((e: any) => e._id === emp._id)
                                                );
                                                const isCurrentDay = isToday(new Date(day.date));

                                                return (
                                                    <td
                                                        key={i}
                                                        className={`p-2 border-r border-border last:border-r-0 align-top transition-colors ${day.isHoliday ? 'bg-muted/30' : isCurrentDay ? 'bg-primary/5' : (isEditMode ? 'cursor-pointer hover:bg-muted/50' : '')}`}
                                                        onClick={() => !day.isHoliday && handleAddClick(day.date)}
                                                        onDragOver={isEditMode && !day.isHoliday ? handleDragOver : undefined}
                                                        onDrop={isEditMode && !day.isHoliday ? (e) => handleDrop(e, day.date, emp._id) : undefined}
                                                    >
                                                        {day.isHoliday ? (
                                                            <div className="h-full min-h-[50px] flex items-center justify-center text-muted-foreground/20 text-xs italic select-none">

                                                            </div>
                                                        ) : empShifts.length > 0 ? (
                                                            <div className="space-y-1">
                                                                {empShifts.map((shift: any, idx: number) => {
                                                                    const isDayOff = shift.shiftName === "Day Off";

                                                                    if (isDayOff) {
                                                                        return (
                                                                            <div
                                                                                key={idx}
                                                                                draggable={isEditMode}
                                                                                onDragStart={isEditMode ? (e) => handleDragStart(e, shift) : undefined}
                                                                                className={`bg-muted/50 text-muted-foreground p-2 rounded text-xs border border-dashed border-border transition-colors group relative flex items-center justify-center ${isEditMode ? 'cursor-grab active:cursor-grabbing hover:bg-muted' : ''}`}
                                                                                onClick={(e) => {
                                                                                    if (!isEditMode) return;
                                                                                    e.stopPropagation();
                                                                                    handleEditClick(shift, day.date, idx);
                                                                                }}
                                                                            >
                                                                                {isEditMode && (
                                                                                    <div
                                                                                        className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground rounded-full p-0.5 cursor-pointer shadow-sm z-20 hover:scale-110"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            confirmDeleteShift(day.date, idx);
                                                                                        }}
                                                                                    >
                                                                                        <X className="h-3 w-3" />
                                                                                    </div>
                                                                                )}
                                                                                <span className="font-bold uppercase text-[10px]">{t('dayOff')}</span>
                                                                            </div>
                                                                        );
                                                                    }

                                                                    const getMinutes = (t: string) => {
                                                                        if (!t) return 0;
                                                                        const [h, m] = t.split(':').map(Number);
                                                                        return h * 60 + (m || 0);
                                                                    };

                                                                    const startM = getMinutes(shift.startTime);
                                                                    const endM = getMinutes(shift.endTime);
                                                                    let dur = endM - startM;

                                                                    if (dur < 0) dur += 24 * 60;
                                                                    if (shift.breakMinutes) dur -= shift.breakMinutes;
                                                                    totalMinutes += dur;

                                                                    // Dynamic Style based on Color
                                                                    const shiftStyle = shift.color ? {
                                                                        backgroundColor: `${shift.color}20`, // Slightly higher opacity for background
                                                                        borderLeft: `4px solid ${shift.color}`, // Stronger accent border
                                                                        color: 'inherit' // Ensure text remains readable (will use text-foreground)
                                                                    } : {};

                                                                    // Absence Check
                                                                    const absence = (schedule.absences || []).find((a: any) => {
                                                                        const absDate = new Date(a.date).toISOString().split('T')[0];
                                                                        const shiftDate = new Date(day.date).toISOString().split('T')[0];
                                                                        // Check if this absence belongs to ANY of the assigned employees
                                                                        // OR check if specific emp is absent.
                                                                        // We are in 'uniqueEmployees.map' loop, so 'emp' is the current row employee.
                                                                        // We should check if 'emp' is absent on 'day.date'.
                                                                        return absDate === shiftDate && a.employeeId === emp._id;
                                                                    });

                                                                    // Staffing Check
                                                                    const requiredCount = shift.requiredHeadcount || 0;
                                                                    const assignedCount = shift.employees?.length || 0;
                                                                    let staffingColor = "";
                                                                    if (requiredCount > 0) {
                                                                        if (assignedCount < requiredCount) staffingColor = "text-red-500 font-bold";
                                                                        else if (assignedCount === requiredCount) staffingColor = "text-emerald-500";
                                                                        else staffingColor = "text-amber-500"; // Overstaffed
                                                                    }

                                                                    return (
                                                                        <div
                                                                            key={idx}
                                                                            draggable={isEditMode}
                                                                            onDragStart={isEditMode ? (e) => handleDragStart(e, shift) : undefined}
                                                                            className={`p-2 rounded text-xs border border-border/50 transition-colors group relative ${!shift.color ? 'bg-primary/10 text-primary border-primary/20' : 'text-foreground'} ${isEditMode ? 'cursor-grab active:cursor-grabbing hover:opacity-90 shadow-sm' : ''} ${absence ? 'border-destructive/50 bg-destructive/10' : ''}`}
                                                                            style={shift.color ? shiftStyle : undefined}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (isEditMode) {
                                                                                    handleEditClick(shift, day.date, idx);
                                                                                } else {
                                                                                    const isMyShift = shift.employees.some((e: any) => e._id === userId || e === userId);

                                                                                    const dayDate = new Date(day.date);
                                                                                    dayDate.setHours(0, 0, 0, 0);
                                                                                    const today = new Date();
                                                                                    today.setHours(0, 0, 0, 0);

                                                                                    const now = new Date();
                                                                                    const currentMinutes = now.getHours() * 60 + now.getMinutes();
                                                                                    const [sH, sM] = shift.startTime.split(':').map(Number);
                                                                                    const [eH, eM] = shift.endTime.split(':').map(Number);
                                                                                    const startMinutes = sH * 60 + sM;
                                                                                    const endMinutes = eH * 60 + eM;

                                                                                    if (!isMyShift) {
                                                                                        if (dayDate < today) return;

                                                                                        if (dayDate.getTime() === today.getTime() && currentMinutes >= startMinutes) {
                                                                                            toast.error("Cannot swap a shift that has already started");
                                                                                            return;
                                                                                        }

                                                                                        setTargetSwapShift({
                                                                                            scheduleId: schedule._id,
                                                                                            dayDate: day.date,
                                                                                            shiftId: shift._id,
                                                                                            shiftName: shift.shiftName,
                                                                                            startTime: shift.startTime,
                                                                                            endTime: shift.endTime,
                                                                                            employeeId: emp._id,
                                                                                            employeeName: `${emp.firstName} ${emp.lastName}`
                                                                                        });
                                                                                        setSwapDialogOpen(true);
                                                                                    } else {
                                                                                        if (dayDate > today) {
                                                                                            toast.error("Cannot request overtime for future shifts");
                                                                                            return;
                                                                                        }

                                                                                        if (dayDate.getTime() === today.getTime() && currentMinutes < endMinutes) {
                                                                                            toast.error("Can only request overtime after shift ends");
                                                                                            return;
                                                                                        }

                                                                                        setTargetOvertimeShift({
                                                                                            scheduleId: schedule._id,
                                                                                            dayDate: day.date,
                                                                                            shiftId: shift._id,
                                                                                            shiftName: shift.shiftName,
                                                                                            startTime: shift.startTime,
                                                                                            endTime: shift.endTime
                                                                                        });
                                                                                        setOvertimeDialogOpen(true);
                                                                                    }
                                                                                }
                                                                            }}
                                                                        >
                                                                            {absence && (
                                                                                <div className="absolute top-1 right-1 text-red-500" title={`Absent: ${absence.type} - ${absence.reason || 'No reason'}`}>
                                                                                    <AlertCircle className="h-3 w-3" />
                                                                                </div>
                                                                            )}
                                                                            {isEditMode && (
                                                                                <div
                                                                                    className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground rounded-full p-0.5 cursor-pointer shadow-sm z-20 hover:scale-110"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        confirmDeleteShift(day.date, idx);
                                                                                    }}
                                                                                >
                                                                                    <X className="h-3 w-3" />
                                                                                </div>
                                                                            )}
                                                                            <div className="font-semibold">{shift.startTime} - {shift.endTime}</div>
                                                                            {shift.shiftName && <div className="opacity-75 text-[10px]">{shift.shiftName}</div>}

                                                                            {/* Staffing Indicator */}
                                                                            {requiredCount > 0 && (
                                                                                <div className={`mt-0.5 text-[10px] flex items-center gap-0.5 ${staffingColor}`}>
                                                                                    <Users className="h-3 w-3" />
                                                                                    <span>{assignedCount}/{requiredCount}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div className={`h-full min-h-[50px] flex items-center justify-center text-muted-foreground/10 text-xl ${isEditMode ? 'group-hover:text-muted-foreground/30' : ''}`}>
                                                                {isEditMode && '+'}
                                                            </div>
                                                        )}

                                                        {/* Daily Total Hours */}
                                                        {!day.isHoliday && (
                                                            <div className="mt-2 text-[10px] items-center justify-end w-full flex text-muted-foreground/70 font-mono">
                                                                {/* Recalculate daily total */}
                                                                {(() => {
                                                                    let dayMins = 0;
                                                                    empShifts.forEach((s: any) => {
                                                                        if (s.shiftName === "Day Off") return;
                                                                        const getM = (t: string) => {
                                                                            if (!t) return 0;
                                                                            const [h, m] = t.split(':').map(Number);
                                                                            return h * 60 + (m || 0);
                                                                        };
                                                                        let d = getM(s.endTime) - getM(s.startTime);
                                                                        if (d < 0) d += 24 * 60;
                                                                        if (s.breakMinutes) d -= s.breakMinutes;
                                                                        dayMins += d;
                                                                    });
                                                                    return dayMins > 0 ? `${(dayMins / 60).toFixed(1)}h` : '';
                                                                })()}
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="p-4 text-center font-medium">
                                                {(totalMinutes / 60).toFixed(1)}h
                                            </td>
                                        </tr>
                                    );
                                })}

                                {/* Unassigned Shifts Row */}
                                {weekDays.some(d => d.shifts.some((s: any) => s.employees.length === 0)) && (
                                    <tr className="bg-amber-500/10 hover:bg-amber-500/20">
                                        <td className="p-4 sticky left-0 bg-background/95 backdrop-blur z-10 border-r border-border font-bold text-amber-500 flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                                                <AlertTriangle className="h-4 w-4" />
                                            </div>
                                            Unassigned Shifts
                                        </td>
                                        {weekDays.map((day: any, i: number) => {
                                            const unassignedShifts = day.shifts.filter((s: any) => s.employees.length === 0);
                                            const isCurrentDay = isToday(new Date(day.date));

                                            return (
                                                <td key={i} className={`p-2 border-r border-border last:border-r-0 align-top transition-colors ${day.isHoliday ? 'bg-muted/30' : isCurrentDay ? 'bg-amber-500/5' : ''}`}>
                                                    <div className="space-y-1">
                                                        {unassignedShifts.map((shift: any, idx: number) => (
                                                            <div
                                                                key={idx}
                                                                draggable={isEditMode}
                                                                onDragStart={isEditMode ? (e) => handleDragStart(e, shift) : undefined}
                                                                className={`p-2 rounded text-xs border border-amber-500/50 bg-amber-500/10 text-amber-600 transition-colors group relative ${isEditMode ? 'cursor-grab active:cursor-grabbing hover:bg-amber-500/20' : ''}`}
                                                                onClick={(e) => {
                                                                    if (!isEditMode) return;
                                                                    e.stopPropagation();
                                                                    handleEditClick(shift, day.date, day.shifts.indexOf(shift));
                                                                }}
                                                            >
                                                                {isEditMode && (
                                                                    <div
                                                                        className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground rounded-full p-0.5 cursor-pointer shadow-sm z-20 hover:scale-110"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            confirmDeleteShift(day.date, day.shifts.indexOf(shift));
                                                                        }}
                                                                    >
                                                                        <X className="h-3 w-3" />
                                                                    </div>
                                                                )}
                                                                <div className="font-semibold flex items-center gap-1">
                                                                    <AlertTriangle className="h-3 w-3" />
                                                                    {shift.startTime} - {shift.endTime}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                )}
                                {uniqueEmployees.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="p-12 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                                <p className="text-lg font-medium">No Employees Scheduled</p>
                                                <p className="text-sm">Click the <Plus className="w-4 h-4 inline" /> icon on any day to start adding shifts!</p>
                                            </div>
                                        </td>
                                    </tr>
                                )
                                }
                            </tbody >
                        </table >
                    </div>
                </Card>
            </div>


            <ShiftDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                date={selectedDate}
                storeId={schedule.storeId}
                storeDepartmentId={schedule.storeDepartmentId?._id || schedule.storeDepartmentId}
                initialData={editingShift ? { ...editingShift.shift, color: editingShift.shift.color } : undefined}
                onSave={handleSaveShift}
                onDelete={handleDeleteFromDialog}
            />

            {/* Copy Confirmation Dialog */}
            <AlertDialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
                <AlertDialogContent className="bg-popover border-border text-popover-foreground">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('copyScheduleConfirm')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('copyScheduleDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-border">{tc('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCopyLastWeekConfirm}>{tc('continue')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Shift Confirmation Dialog */}
            <AlertDialog open={deleteShiftAlertOpen} onOpenChange={setDeleteShiftAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('deleteShift')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('deleteShiftDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShiftToDelete(null)}>{tc('cancel')}</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={executeDeleteShift}>{tc('delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Validation Alert */}
            <AlertDialog open={validationAlertOpen} onOpenChange={setValidationAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Attention Needed</AlertDialogTitle>
                        <AlertDialogDescription>
                            {validationMessage}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setValidationAlertOpen(false)}>OK</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* General Status Change Confirmation */}
            <AlertDialog open={statusConfirmOpen} onOpenChange={setStatusConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{tc('confirmTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('publishScheduleDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingStatus(null)}>{tc('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmStatusChange}>{tc('continue')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Rejection Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent className="bg-popover border-border text-popover-foreground">
                    <DialogHeader>
                        <DialogTitle>{t('reject')}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="rejection-reason" className="mb-2 block text-sm font-medium">{t('rejectReason')}</Label>
                        <Textarea
                            id="rejection-reason"
                            placeholder={t('rejectPlaceholder')}
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="bg-muted/50 border-border text-foreground"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)} className="border-border">{tc('cancel')}</Button>
                        <Button variant="destructive" onClick={handleRejectConfirm} disabled={!rejectionReason}>{tc('reject')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <SwapRequestDialog
                open={swapDialogOpen}
                onOpenChange={setSwapDialogOpen}
                currentUserId={userId}
                targetShift={targetSwapShift}
                storeId={schedule.storeId?._id || schedule.storeId}
            />

            <OvertimeRequestDialog
                open={overtimeDialogOpen}
                onOpenChange={setOvertimeDialogOpen}
                userId={userId}
                shift={targetOvertimeShift}
            />

        </div >
    );
}
