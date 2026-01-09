"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@/i18n/routing";
import { Separator } from "@/components/ui/separator";

import { ScrollArea } from "@/components/ui/scroll-area";
import { getActionLogs } from "@/lib/actions/log.actions";
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
import { ShiftDetailsDialog } from "@/components/schedules/shift-details-dialog";
import { ReportAbsenceDialog } from "@/components/absences/report-absence-dialog";
import { useRouter } from "next/navigation";
import { getOrCreateSchedule, updateScheduleStatus, updateSchedule, copyPreviousSchedule, findConflictingShifts, deleteSchedule } from "@/lib/actions/schedule.actions";
import { toast } from "sonner";
import {
    ChevronLeft, ChevronRight, Save, User, Users, ArrowLeft, Loader2, Copy, Trash2, X, Plus, Filter, Tag, Check, XCircle, Clock, Calendar, Edit2,
    ArrowRight, Lock, CheckCircle2, MoreVertical, Send, Printer, Settings, AlertTriangle, AlertCircle, FileDown, FileText, Eye, EyeOff
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { useTranslations } from "next-intl";
import { format } from "date-fns";

export function ScheduleEditor({ initialSchedule, userId, canEdit, userRoles = [], userStoreId, userDepartmentId }: { initialSchedule: any, userId: string, canEdit: boolean, userRoles: string[], userStoreId?: string, userDepartmentId?: string }) {
    const router = useRouter();
    const t = useTranslations("Schedule");
    const tc = useTranslations("Common");
    const [schedule, setSchedule] = useState(initialSchedule);
    const [weekDays, setWeekDays] = useState<any[]>(initialSchedule.days || []);
    const [viewMode, setViewMode] = useState<'employees' | 'shifts'>('employees');
    const [actionLoading, setActionLoading] = useState(false);

    // Derived Unique Shifts for Shift View
    const uniqueShiftTimes = Array.from(new Set(
        weekDays.flatMap(day => day.shifts.map((s: any) => `${s.startTime}-${s.endTime}`))
    )).sort();

    // Persistence State
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    const [showLogs, setShowLogs] = useState(false);
    const [logsLoading, setLogsLoading] = useState(false);

    // Derived State
    // Derived State
    const isEditMode = canEdit && (schedule.status === 'draft' || schedule.status === 'rejected');

    // Check if schedule is currently ongoing
    const isOngoingWeek = () => {
        const start = new Date(initialSchedule.dateRange.startDate);
        const end = new Date(initialSchedule.dateRange.endDate);
        const now = new Date();
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return now >= start && now <= end;
    };

    // "ongoing week... only available to hr, owner, admins and then tech"
    // "ongoing week... only available to hr, owner, admins and then tech"
    // AND "storeManager of that store and that storeDepartmentHeads"
    const canEditLockedSchedule = () => {
        // 1. Global Privileged Roles
        const GLOBAL_PRIVILEGED = ["hr", "owner", "admin", "tech", "super_user", "department_head"]; // Added department_head as potential global? Or keep strict.
        // User asked for "storeManager of that store".
        if (userRoles.some(r => GLOBAL_PRIVILEGED.includes(r.toLowerCase()))) return true;

        // 2. Contextual Privileged Roles
        const sId = typeof schedule.storeId === 'object' ? schedule.storeId._id : schedule.storeId;
        const dId = typeof schedule.storeDepartmentId === 'object' ? schedule.storeDepartmentId._id : schedule.storeDepartmentId;

        // Ensure we compare strings
        const currentStoreId = sId?.toString();
        const currentDeptId = dId?.toString();

        if (userRoles.includes('store_manager')) {
            // Must match store
            if (userStoreId && userStoreId === currentStoreId) return true;
        }

        if (userRoles.includes('store_department_head')) {
            // Must match store AND department
            if (userStoreId && userStoreId === currentStoreId &&
                userDepartmentId && userDepartmentId === currentDeptId) return true;
        }

        return false;
    };

    const canApproveSchedule = () => {
        const APPROVERS = ["hr", "owner", "admin", "tech", "super_user", "department_head"];
        return userRoles.some(r => APPROVERS.includes(r.toLowerCase()));
    };



    const canRevertPublished = () => {
        if (!canEdit) return false;
        if (schedule.status !== 'published') return false;

        if (isOngoingWeek()) {
            return canEditLockedSchedule();
        }
        return true;
    };

    // Can edit pending (retract)? Yes, if they are the managers.
    const canEditPending = () => {
        if (!canEdit) return false;
        if (schedule.status !== 'pending' && schedule.status !== 'review') return false;
        return canEditLockedSchedule();
    };



    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [editingShift, setEditingShift] = useState<{ shift: any, dayDate: string, index: number } | null>(null);
    const [preselectedEmployeeId, setPreselectedEmployeeId] = useState<string | null>(null);

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
    const [shiftToDelete, setShiftToDelete] = useState<{ dayDate: string, index: number, employeeId?: string } | null>(null);

    // Filter State
    const [hideUnscheduled, setHideUnscheduled] = useState(false);

    // Swap Dialog State
    const [swapDialogOpen, setSwapDialogOpen] = useState(false);
    const [targetSwapShift, setTargetSwapShift] = useState<any>(null);

    // Overtime Dialog State
    const [overtimeDialogOpen, setOvertimeDialogOpen] = useState(false);
    const [targetOvertimeShift, setTargetOvertimeShift] = useState<any>(null);

    // Shift Details Dialog State
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [targetDetailsShift, setTargetDetailsShift] = useState<any>(null);

    // KEY CHANGE: Absence Request Dialog State
    const [absenceDialogOpen, setAbsenceDialogOpen] = useState(false);
    const [targetAbsenceShift, setTargetAbsenceShift] = useState<{ shiftId: string, date: string, employeeId: string } | null>(null);

    const handleSwapRequest = (shift: any, date: string, employeeId: string) => {
        setTargetSwapShift({
            scheduleId: schedule._id,
            dayDate: date,
            shiftId: shift._id,
            shiftName: shift.shiftName,
            startTime: shift.startTime,
            endTime: shift.endTime,
            employeeId: employeeId,
            employeeName: "Me" // Logic to get name from ID involves finding in employees array, can do if needed but dialog might fetch it or just use "Me"
        });
        setSwapDialogOpen(true);
    };

    const handleAbsenceRequest = (shift: any, date: string, employeeId: string) => {
        setTargetAbsenceShift({
            shiftId: shift._id,
            date: date,
            employeeId: employeeId
        });
        setAbsenceDialogOpen(true);
    };

    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);

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
    const allEmployeesOriginal = getAllEmployees();
    const allEmployees = [...allEmployeesOriginal].sort((a, b) => {
        if (a._id === userId) return -1;
        if (b._id === userId) return 1;
        return 0;
    });

    const uniqueEmployees = hideUnscheduled
        ? allEmployees.filter(emp => {
            // Check if employee has any shifts in this week
            return weekDays.some(day =>
                day.shifts.some((s: any) => s.employees.some((e: any) => e._id === emp._id))
            );
        })
        : allEmployees;

    const handleAddClick = (date: string, employeeId?: string) => {
        if (!isEditMode) return;
        setSelectedDate(new Date(date));
        setEditingShift(null); // Ensure we are in create mode
        setPreselectedEmployeeId(employeeId || null);
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

                // Check for overlapping shifts for assigned employees
                const hasOverlap = (s1: any, start2: string, end2: string) => {
                    if (s1.shiftName === "Day Off" || start2 === "" || end2 === "") return false;

                    const getM = (t: string) => {
                        const [h, m] = t.split(':').map(Number);
                        return h * 60 + (m || 0);
                    };

                    const start1M = getM(s1.startTime);
                    const end1M = getM(s1.endTime);
                    const start2M = getM(start2);
                    const end2M = getM(end2);

                    return (start1M < end2M && end1M > start2M);
                };

                // Filter out current shift if editing
                const otherShifts = day.shifts.filter((_: any, idx: number) => idx !== editingShift?.index);

                for (const emp of shiftData.employees) {
                    const conflictingShift = otherShifts.find((s: any) =>
                        s.employees.some((e: any) => e._id === emp._id) &&
                        hasOverlap(s, shiftData.startTime, shiftData.endTime)
                    );

                    if (conflictingShift) {
                        toast.error(`Cannot assign ${emp.firstName} ${emp.lastName}: Overlaps with existing shift (${conflictingShift.startTime} - ${conflictingShift.endTime})`);
                        return day; // Return unchanged day
                    }
                }

                const updatedShifts = [...day.shifts];

                if (typeof editingShift?.index === 'number') {
                    // Update existing shift
                    updatedShifts[editingShift.index] = {
                        ...updatedShifts[editingShift.index],
                        shiftName: shiftData.shiftName,
                        startTime: shiftData.startTime,
                        endTime: shiftData.endTime,
                        breakMinutes: shiftData.breakMinutes,
                        color: shiftData.color,
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
                        color: shiftData.color,
                        employees: shiftData.employees,
                        notes: shiftData.notes,
                        originalIndex: undefined, // Will be set on render or next map
                        // In real app, generate temp ID
                    });
                }

                // --- Cross-Store Conflict Check ---
                // We perform this check asynchronously and warn if issues found.
                // We do NOT block the local optimistic update, but we show a warning Toast/Alert.
                if (shiftData.employees?.length > 0 && shiftData.shiftName !== "Day Off") {
                    findConflictingShifts(
                        shiftData.employees.map((e: any) => e._id),
                        { start: new Date(day.date).toISOString(), end: new Date(day.date).toISOString() },
                        schedule._id
                    ).then(conflicts => {
                        if (conflicts && conflicts.length > 0) {
                            // Check for overlaps with THIS shift
                            const relevantConflicts = conflicts.filter((c: any) => {
                                // Simple overlap check
                                const getM = (t: string) => {
                                    const [h, m] = t.split(':').map(Number);
                                    return h * 60 + (m || 0);
                                };
                                const s1 = getM(shiftData.startTime);
                                const e1 = getM(shiftData.endTime);
                                const s2 = getM(c.startTime);
                                const e2 = getM(c.endTime);
                                return (s1 < e2 && e1 > s2);
                            });

                            if (relevantConflicts.length > 0) {
                                const msg = relevantConflicts.map((c: any) =>
                                    `${c.employeeIds[0]} at ${c.storeName} (${c.startTime}-${c.endTime})`
                                ).join(', ');
                                // We need names, but conflict returned filtered ID or populated obj?
                                // action returns: employeeIds: affectedEmployees (which are objects if populated in shift, or strings)
                                // checking action: affectedEmployees = shift.employees.filter... 
                                // schedule.find... populate('days.shifts.employees') -> yes they are full objects

                                const names = relevantConflicts.map((c: any) => {
                                    const emp = c.employeeIds[0]; // The conflict logic pushed the matching employee object(s)
                                    return `${emp.firstName} ${emp.lastName} is at ${c.storeName}`;
                                }).join(' & ');

                                toast.error(`Cross-Store Conflict Detected: ${names}`, { duration: 5000 });
                            }
                        }
                    }).catch(err => console.error("Conflict check failed", err));
                }
                // ----------------------------------

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

            router.push(`/dashboard/schedules/${newSchedule.slug || newSchedule._id}`);
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

    const handleDeleteSchedule = async () => {
        setDeleteAlertOpen(false);
        setActionLoading(true);
        try {
            await deleteSchedule(schedule._id, userId);
            toast.success("Schedule deleted successfully");
            router.push("/dashboard/schedules");
        } catch (error) {
            console.error("Delete failed", error);
            toast.error("Failed to delete schedule");
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

    const confirmDeleteShift = (dayDate: string, index: number, employeeId?: string) => {
        setShiftToDelete({ dayDate, index, employeeId });
        setDeleteShiftAlertOpen(true);
    };

    const executeDeleteShift = () => {
        let targetWeekDays = [...weekDays];
        let targetIndex = -1;
        let targetDateStr = "";
        let targetEmployeeId = shiftToDelete?.employeeId;

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
                const shiftToUpdate = updatedShifts[targetIndex];

                if (targetEmployeeId && shiftToUpdate.employees.length > 1) {
                    // Only remove the specific employee
                    updatedShifts[targetIndex] = {
                        ...shiftToUpdate,
                        employees: shiftToUpdate.employees.filter((e: any) => e._id !== targetEmployeeId)
                    };
                } else {
                    // Remove the entire shift
                    updatedShifts.splice(targetIndex, 1);
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

    // --- Export Handlers ---
    const handlePrint = () => {
        window.print();
    };

    const handleExportCSV = () => {
        try {
            // 1. Headers
            const dayHeaders = weekDays.map(d => new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }));
            const headers = ["Employee Name", "Position", ...dayHeaders, "Total Hours", "Total Shifts"];

            // 2. Rows
            const rows = uniqueEmployees.map((emp: any) => {
                let totalMinutes = 0;
                let totalShifts = 0;
                const shiftDetails: string[] = [];

                weekDays.forEach((day: any) => {
                    const shiftsForEmp = day.shifts.filter((s: any) => s.employees.some((e: any) => e._id === emp._id));

                    if (shiftsForEmp.length > 0) {
                        const shiftStrs = shiftsForEmp.map((s: any) => {
                            if (s.shiftName === "Day Off") return "OFF";

                            // Calc Duration
                            const getM = (t: string) => {
                                if (!t) return 0;
                                const [h, m] = t.split(':').map(Number);
                                return h * 60 + (m || 0);
                            };
                            let dur = getM(s.endTime) - getM(s.startTime);
                            if (dur < 0) dur += 24 * 60;
                            if (s.breakMinutes) dur -= s.breakMinutes;

                            totalMinutes += dur;

                            return `${s.startTime}-${s.endTime}`;
                        }).join(" / ");

                        // Don't count "OFF" shifts towards total shifts if strictly counting work
                        if (shiftsForEmp.some((s: any) => s.shiftName !== "Day Off")) {
                            totalShifts += shiftsForEmp.filter((s: any) => s.shiftName !== "Day Off").length;
                        }

                        shiftDetails.push(shiftStrs);
                    } else {
                        shiftDetails.push("");
                    }
                });

                const totalHours = (totalMinutes / 60).toFixed(2);

                // Escape entries for CSV
                const safeEntry = (s: string) => `"${s.replace(/"/g, '""')}"`;

                return [
                    safeEntry(emp.firstName + " " + emp.lastName),
                    safeEntry(emp.positionId?.name || "Staff"),
                    ...shiftDetails.map(s => safeEntry(s)), // Ensure each day is a column
                    safeEntry(totalHours),
                    safeEntry(totalShifts.toString())
                ].join(",");
            });

            const csvContent = [
                headers.join(","),
                ...rows
            ].join("\n");

            // 3. Download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `schedule_${new Date(schedule.dateRange.startDate).toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("Schedule exported to CSV");
        } catch (error) {
            console.error("Export failed", error);
            toast.error("Failed to export CSV");
        }
    };

    return (
        <div className="space-y-6 print-container print-scale">
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" asChild>
                        <Link href="/dashboard/schedules"><ChevronLeft className="h-4 w-4" /></Link>
                    </Button>

                    {/* View Mode Toggle */}
                    <div className="flex items-center p-1 bg-muted/50 rounded-lg border border-border">
                        <Button
                            variant={viewMode === 'employees' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-6 w-6 rounded-md"
                            onClick={() => setViewMode('employees')}
                            title="Employee View"
                        >
                            <Users className="h-3 w-3" />
                        </Button>
                        <Button
                            variant={viewMode === 'shifts' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-6 w-6 rounded-md"
                            onClick={() => setViewMode('shifts')}
                            title="Shift View"
                        >
                            <Clock className="h-3 w-3" />
                        </Button>
                    </div>

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
                            {/*                             <div className="hidden xl:block text-[10px] text-red-500 bg-red-50 p-1 rounded border border-red-200" title="Debug Info">
                                Roles: {userRoles.join(',')} |
                                U_Store: {userStoreId || 'NA'} |
                                S_Store: {typeof schedule.storeId === 'object' ? schedule.storeId._id : schedule.storeId} |
                                LockedEdit: {canEditLockedSchedule() ? 'Y' : 'N'} |
                                canEdit: {canEdit ? 'Y' : 'N'} |
                                Status: {schedule.status} |
                                PEND: {canEditPending() ? 'Y' : 'N'}
                            </div> */}
                            <span className="font-semibold">{schedule.storeDepartmentId?.name}</span>
                            <Badge variant={schedule.status === 'published' ? 'default' : (schedule.status === 'pending' || schedule.status === 'review') ? 'secondary' : 'outline'} className="capitalize">
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

                {/* Cancel Editing / Discard Draft */}
                {isEditMode && schedule.status === 'draft' && canEdit && (
                    <Button
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                        onClick={async () => {
                            if (hasUnsavedChanges) {
                                if (!confirm(t('discardChangesConfirm') || "You have unsaved changes. Discard them?")) return;
                            }
                            setActionLoading(true);
                            try {
                                // We need a specific action that allows managers to revert to published
                                // even if they don't have "publish" permission generally.
                                await updateScheduleStatus(schedule._id, 'published', userId, "Reverted edit mode (no changes)", false);
                                toast.success("Exited edit mode");
                                window.location.reload();
                            } catch (error) {
                                console.error("Cancel failed", error);
                                toast.error(t('cancelEditFailed') || "Failed to cancel edit");
                            } finally {
                                setActionLoading(false);
                            }
                        }}
                        disabled={actionLoading}
                    >
                        <XCircle className="mr-2 h-4 w-4" />
                        {t('cancelEdit') || "Cancel Edit"}
                    </Button>
                )}

                {/* Send for Approval - Prominent */}
                {isEditMode && canEdit && (schedule.status === 'draft' || schedule.status === 'rejected') && (
                    <Button
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={() => handleStatusActionClick('pending')}
                        disabled={actionLoading || !weekDays.every(d => d.isHoliday || d.shifts.length > 0)}
                    >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        {t('sendForApproval')}
                    </Button>
                )}

                {/* Approve/Reject - Prominent for Managers */}
                {(schedule.status === 'pending' || schedule.status === 'review') && canApproveSchedule() && (
                    <>
                        <Button
                            variant="destructive"
                            onClick={() => handleStatusActionClick('rejected')}
                            disabled={actionLoading}
                        >
                            <XCircle className="mr-2 h-4 w-4" /> {tc('reject')}
                        </Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleStatusActionClick('published')}
                            disabled={actionLoading}
                        >
                            <CheckCircle2 className="mr-2 h-4 w-4" /> {t('approve')}
                        </Button>
                    </>
                )}



                {/* Edit Published/Pending - Prominent */
                    (canEditPending() || canRevertPublished()) && (
                        <Button
                            variant="outline"
                            onClick={() => handleStatusActionClick('draft')}
                            disabled={actionLoading}
                            className="border-border hover:bg-muted"
                        >
                            <Edit2 className="mr-2 h-4 w-4" /> {tc('edit')}
                        </Button>
                    )
                }
                {/* Draft Indicator */}
                {schedule.status === 'draft' && canEdit && (
                    <div className="hidden sm:flex items-center px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-md border border-emerald-100">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                        Editing Active
                    </div>
                )}

                <Separator orientation="vertical" className="h-6 mx-2 hidden sm:block" />

                {/* Consolidated Settings Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2 print:hidden bg-background">
                            <Settings className="h-4 w-4" />
                            <span className="hidden sm:inline">{tc('settings') || "Settings"}</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>{t('scheduleActions') || "Schedule Actions"}</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        {/* Copy Previous */}
                        {isEditMode && (schedule.status === 'draft' || schedule.status === 'rejected') && (
                            <DropdownMenuItem onClick={() => setCopyDialogOpen(true)} disabled={actionLoading}>
                                <Copy className="mr-2 h-4 w-4" /> {t('copyPrevious')}
                            </DropdownMenuItem>
                        )}

                        {/* View Audit Logs (New) */}
                        <DropdownMenuItem onClick={async () => {
                            setLogsLoading(true);
                            setShowLogs(true);
                            try {
                                const data = await getActionLogs({ targetId: schedule._id });
                                setLogs(data);
                            } catch (e) {
                                console.error("Failed to fetch logs", e);
                                toast.error("Failed to load history");
                            } finally {
                                setLogsLoading(false);
                            }
                        }}>
                            <div className="flex items-center">
                                <FileText className="mr-2 h-4 w-4" /> View Changes Log
                            </div>
                        </DropdownMenuItem>

                        {/* Toggle Scheduled Only */}
                        <DropdownMenuItem onClick={() => setHideUnscheduled(!hideUnscheduled)}>
                            {hideUnscheduled ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                            {hideUnscheduled ? "Show All Employees" : t('scheduledOnly')}
                        </DropdownMenuItem>



                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Export</DropdownMenuLabel>

                        <DropdownMenuItem onClick={handlePrint} className="gap-2 cursor-pointer">
                            <Printer className="h-4 w-4" /> Print / Save PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportCSV} className="gap-2 cursor-pointer">
                            <FileText className="h-4 w-4" /> Export CSV
                        </DropdownMenuItem>

                        {canApproveSchedule() && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => setDeleteAlertOpen(true)}
                                    className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                >
                                    <Trash2 className="h-4 w-4" /> Delete Schedule
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Validation Warning */}
            {
                !weekDays.every(d => d.isHoliday || d.shifts.length > 0) && (isEditMode && canEdit) && (
                    <div className="flex justify-end -mt-4 mb-2 print:hidden">
                        <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <AlertCircle className="h-3 w-3" />
                            Complete all days to enable submission
                        </p>
                    </div>
                )
            }


            {/* Mobile View */}
            <div className="block md:hidden print:hidden">
                <MobileScheduleView
                    employees={uniqueEmployees}
                    weekDays={weekDays}
                    isEditMode={isEditMode}
                    currentUserId={userId}
                    onEditShift={handleEditClick}
                    onAddShift={handleAddClick}
                    onDeleteShift={confirmDeleteShift}
                    onSwapRequest={handleSwapRequest}
                    onAbsenceRequest={handleAbsenceRequest}
                    onOvertimeRequest={(shift, date, employeeId) => {
                        setTargetOvertimeShift({
                            scheduleId: schedule._id,
                            dayDate: date,
                            shiftId: shift._id,
                            shiftName: shift.shiftName,
                            startTime: shift.startTime,
                            endTime: shift.endTime,
                            employeeId: employeeId
                        });
                        setOvertimeDialogOpen(true);
                    }}
                    isToday={isToday}
                />
            </div>

            {/* Calendar Grid (Desktop) */}
            <div className="hidden md:block">
                <Card className="bg-card border-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground">
                                <tr className="divide-x divide-border">
                                    <th className="p-4 min-w-[200px] font-medium sticky left-0 bg-background/95 backdrop-blur z-10 border-r border-border">
                                        {viewMode === 'employees' ? t('employee') : "Shift Time"}
                                    </th>
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
                                    {(["hr", "owner", "tech", "super_user", "admin"].includes(userRoles[0])) && (
                                        <th className="p-4 min-w-[100px] font-medium text-center text-primary italic">Est. Cost</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className={`divide-y divide-border ${viewMode === 'employees' ? '' : 'hidden'}`}>
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
                                    const isSelfRow = emp._id.toString() === userId.toString();

                                    return (
                                        <tr key={emp._id} className={`hover:bg-muted/30 transition-colors ${isSelfRow ? 'bg-primary/[0.03] border-y border-primary/10' : ''}`}>
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
                                                            <div className={`text-[10px] items-center gap-1 flex ${totalHours > contractHours ? "text-red-500 font-black animate-pulse" : isUnderHours ? "text-amber-500 font-bold" : "text-primary text-muted-foreground/80"}`}>
                                                                <Clock className={`h-3 w-3 ${totalHours > contractHours ? "text-red-500" : ""}`} />
                                                                {totalHours > contractHours
                                                                    ? `Overtime: ${totalHours.toFixed(1)}h / ${contractHours}h`
                                                                    : t('underHours', { hours: totalHours.toFixed(1), contract: contractHours })}
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
                                                const empShiftsWithIndex = day.shifts
                                                    .map((s: any, idx: number) => ({ ...s, originalIndex: idx }))
                                                    .filter((s: any) =>
                                                        s.employees.some((e: any) => e._id === emp._id)
                                                    );
                                                const isCurrentDay = isToday(new Date(day.date));

                                                return (
                                                    <td
                                                        key={i}
                                                        className={`p-2 border-r border-border last:border-r-0 align-top transition-colors ${day.isHoliday ? 'bg-muted/30' : isCurrentDay ? 'bg-primary/5' : (isEditMode ? 'cursor-pointer hover:bg-muted/50' : '')}`}
                                                        onClick={() => !day.isHoliday && handleAddClick(day.date, emp._id)}
                                                        onDragOver={isEditMode && !day.isHoliday ? handleDragOver : undefined}
                                                        onDrop={isEditMode && !day.isHoliday ? (e) => handleDrop(e, day.date, emp._id) : undefined}
                                                    >
                                                        {day.isHoliday ? (
                                                            <div className="h-full min-h-[50px] flex items-center justify-center text-muted-foreground/20 text-xs italic select-none">

                                                            </div>
                                                        ) : empShiftsWithIndex.length > 0 ? (
                                                            <div className="space-y-1">
                                                                {empShiftsWithIndex.map((shift: any, _: number) => {
                                                                    const isDayOff = shift.shiftName === "Day Off";

                                                                    if (isDayOff) {
                                                                        return (
                                                                            <div
                                                                                key={shift.originalIndex}
                                                                                draggable={isEditMode}
                                                                                onDragStart={isEditMode ? (e) => handleDragStart(e, shift) : undefined}
                                                                                className={`bg-muted/50 text-muted-foreground p-2 rounded text-xs border border-dashed border-border transition-colors group relative flex items-center justify-center ${isEditMode ? 'cursor-grab active:cursor-grabbing hover:bg-muted' : ''}`}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    if (isEditMode) {
                                                                                        handleEditClick(shift, day.date, shift.originalIndex);
                                                                                    } else {
                                                                                        // For Day Off, we treat it as a shift that can be swapped (e.g. I give my day off, I take your shift)
                                                                                        // Logic should be similar to regular shift click
                                                                                        const isMyShift = shift.employees.some((e: any) => e.toString() === userId.toString() || (e._id && e._id.toString() === userId.toString()));
                                                                                        const isOwnRow = emp._id.toString() === userId.toString();

                                                                                        if (isOwnRow) {
                                                                                            // If it's my own row and it's a "Day Off", maybe I want to Delete it or Edit it?
                                                                                            // For now, let's just allow standard Details or nothing.
                                                                                            // Since Overtime on a "Day Off" doesn't strictly make sense unless deleting it, we might skip Overtime logic here.
                                                                                            // But user said "sow day off for employee", so allowing swap is key.
                                                                                            // Let's just do nothing for "Overtime" on Day Off for now, as it's separate.
                                                                                            // actually, if I want to "Swap" my Day Off, I need to click on OTHER person's shift.
                                                                                            // So clicking my OWN Day Off might just show details?
                                                                                            return;
                                                                                        }
                                                                                        // If clicking SOMEONE ELSE'S shift (or day off), we fall through to the main logic below?
                                                                                        // This block is SPECIFIC to rendering the "Day Off" UI element.
                                                                                        // If *I* have a Day Off, it renders in MY row.
                                                                                        // If *THEY* have a Day Off, it renders in THEIR row.

                                                                                        // If I click THEIR "Day Off", maybe I want to trade my Shift for their Day Off?
                                                                                        // Yes. So we should allow showing details.

                                                                                        // But wait, the standard logic is DUPLICATED here or this is a separate return path?
                                                                                        // Looking at the code structure:
                                                                                        // if (isDayOff) { return ( ... ) } is an EARLY RETURN.
                                                                                        // So I MUST implement the click logic HERE for Day Off items.

                                                                                        const scheduleStoreId = schedule.storeId?._id || schedule.storeId;
                                                                                        const worksAtStore = userStoreId && scheduleStoreId && userStoreId.toString() === scheduleStoreId.toString();
                                                                                        const dayDate = new Date(day.date);
                                                                                        dayDate.setHours(0, 0, 0, 0);
                                                                                        const today = new Date();
                                                                                        today.setHours(0, 0, 0, 0);

                                                                                        // Check if I have a shift on this day
                                                                                        const userShiftOnDay = day.shifts.find((s: any) => s.employees.some((e: any) => e.toString() === userId.toString() || (e._id && e._id.toString() === userId.toString())));

                                                                                        setTargetDetailsShift({
                                                                                            shift,
                                                                                            date: day.date,
                                                                                            employeeName: `${emp.firstName} ${emp.lastName}`,
                                                                                            storeName: schedule.storeId?.name || "This Store",
                                                                                            canSwap: worksAtStore && !isMyShift && !!userShiftOnDay, // Allow swap if I have a shift/dayoff to give
                                                                                            targetEmployeeId: emp._id
                                                                                        });
                                                                                        setDetailsDialogOpen(true);
                                                                                    }
                                                                                }}
                                                                            >
                                                                                {isEditMode && (
                                                                                    <div
                                                                                        className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground rounded-full p-0.5 cursor-pointer shadow-sm z-20 hover:scale-110"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            confirmDeleteShift(day.date, shift.originalIndex, emp._id);
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
                                                                    // Dynamic Style based on Color
                                                                    const shiftStyle = shift.color ? {
                                                                        backgroundColor: `${shift.color}20`,
                                                                        borderLeft: `4px solid ${shift.color}`,
                                                                        color: 'inherit'
                                                                    } : {};

                                                                    // Absence Check
                                                                    const absence = (schedule.absences || []).find((a: any) => {
                                                                        const absDate = new Date(a.date).toISOString().split('T')[0];
                                                                        const shiftDate = new Date(day.date).toISOString().split('T')[0];
                                                                        return absDate === shiftDate && a.employeeId === emp._id;
                                                                    });

                                                                    // Coverage Check
                                                                    const coverageInfo = shift.meta?.coverages?.find((c: any) => c.coveringEmployeeId === emp._id);
                                                                    const isCovering = !!coverageInfo;

                                                                    // Combined Classes
                                                                    let wrapperClasses = `p-2 rounded text-xs border border-border/50 transition-all group relative `;

                                                                    if (absence) {
                                                                        wrapperClasses += `bg-muted text-muted-foreground border-dashed border-border opacity-60 grayscale `;
                                                                    } else if (isCovering) {
                                                                        wrapperClasses += `bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/50 shadow-sm `;
                                                                    } else if (!shift.color) {
                                                                        wrapperClasses += `bg-primary/10 text-primary border-primary/20 `;
                                                                    } else {
                                                                        wrapperClasses += `text-foreground `;
                                                                    }

                                                                    if (isEditMode) wrapperClasses += `cursor-grab active:cursor-grabbing hover:opacity-90 shadow-sm `;

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
                                                                            key={shift.originalIndex}
                                                                            draggable={isEditMode}
                                                                            onDragStart={isEditMode ? (e) => handleDragStart(e, shift) : undefined}
                                                                            className={wrapperClasses}
                                                                            style={(!absence && !isCovering && shift.color) ? shiftStyle : undefined}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                // ... existing click logic ...
                                                                                const isMyShift = shift.employees.some((e: any) => e.toString() === userId.toString() || (e._id && e._id.toString() === userId.toString()));
                                                                                const isOwnRow = emp._id.toString() === userId.toString();

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

                                                                                if (isOwnRow) {
                                                                                    if (isEditMode) {
                                                                                        handleEditClick(shift, day.date, shift.originalIndex);
                                                                                    } else {
                                                                                        // Overtime Rule: Only if shift ended.
                                                                                        const shiftEndDateTime = new Date(dayDate);
                                                                                        shiftEndDateTime.setHours(eH, eM, 0, 0);

                                                                                        // Handle overnight shifts (end < start) -> add 1 day to end
                                                                                        const shiftStartDateTime = new Date(dayDate);
                                                                                        shiftStartDateTime.setHours(sH, sM, 0, 0);
                                                                                        if (shiftEndDateTime <= shiftStartDateTime && (eH < sH)) {
                                                                                            shiftEndDateTime.setDate(shiftEndDateTime.getDate() + 1);
                                                                                        }

                                                                                        if (now >= shiftEndDateTime) {
                                                                                            setTargetOvertimeShift({
                                                                                                scheduleId: schedule._id,
                                                                                                dayDate: day.date,
                                                                                                shiftId: shift._id,
                                                                                                shiftName: shift.shiftName,
                                                                                                startTime: shift.startTime,
                                                                                                endTime: shift.endTime
                                                                                            });
                                                                                            setOvertimeDialogOpen(true);
                                                                                        } else {
                                                                                            // Show Details
                                                                                            setTargetDetailsShift({
                                                                                                shift,
                                                                                                date: day.date,
                                                                                                employeeName: `${emp.firstName} ${emp.lastName}`,
                                                                                                storeName: schedule.storeId?.name || "This Store",
                                                                                                canSwap: false,
                                                                                                targetEmployeeId: emp._id
                                                                                            });
                                                                                            setDetailsDialogOpen(true);
                                                                                        }
                                                                                    }
                                                                                } else {
                                                                                    const scheduleStoreId = schedule.storeId?._id || schedule.storeId;
                                                                                    const worksAtStore = userStoreId && scheduleStoreId && userStoreId.toString() === scheduleStoreId.toString();
                                                                                    const isPastOrStarted = (dayDate < today) || (dayDate.getTime() === today.getTime() && currentMinutes >= startMinutes);
                                                                                    const userShiftOnDay = day.shifts.find((s: any) => s.employees.some((e: any) => e.toString() === userId.toString() || (e._id && e._id.toString() === userId.toString())));

                                                                                    setTargetDetailsShift({
                                                                                        shift,
                                                                                        date: day.date,
                                                                                        employeeName: `${emp.firstName} ${emp.lastName}`,
                                                                                        storeName: schedule.storeId?.name || "This Store",
                                                                                        canSwap: !isPastOrStarted && worksAtStore && !isMyShift && !!userShiftOnDay && !absence,
                                                                                        targetEmployeeId: emp._id
                                                                                    });
                                                                                    setDetailsDialogOpen(true);
                                                                                }
                                                                            }}
                                                                        >
                                                                            {/* Absence Indicator */}
                                                                            {absence && (
                                                                                <div className="absolute top-1 right-1 text-red-500/80">
                                                                                    <AlertCircle className="h-3 w-3" />
                                                                                </div>
                                                                            )}
                                                                            {/* Cover Indicator */}
                                                                            {isCovering && (
                                                                                <div className="absolute top-1 right-1 text-violet-600 bg-violet-100 rounded-full px-1 py-0.5 text-[8px] font-bold uppercase tracking-tighter">
                                                                                    Cover
                                                                                </div>
                                                                            )}

                                                                            {isEditMode && (
                                                                                <div
                                                                                    className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground rounded-full p-0.5 cursor-pointer shadow-sm z-20 hover:scale-110"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        confirmDeleteShift(day.date, shift.originalIndex, emp._id);
                                                                                    }}
                                                                                >
                                                                                    <X className="h-3 w-3" />
                                                                                </div>
                                                                            )}
                                                                            <div className="font-semibold">{shift.startTime} - {shift.endTime}</div>
                                                                            {shift.shiftName && <div className="opacity-75 text-[10px]">{shift.shiftName}</div>}

                                                                            {/* Absence Details */}
                                                                            {absence && (
                                                                                <div className="mt-1 border-t border-border/50 pt-1">
                                                                                    <span className="block text-[9px] font-bold text-red-600 uppercase">Absent</span>
                                                                                    <span className="block text-[9px] italic leading-tight">{absence.justification || absence.reason}</span>
                                                                                </div>
                                                                            )}

                                                                            {/* Coverage Details */}
                                                                            {isCovering && (
                                                                                <div className="mt-1 border-t border-violet-500/20 pt-1">
                                                                                    <span className="block text-[9px] font-bold text-violet-700 uppercase">
                                                                                        {coverageInfo.compensationType === 'extra_hour' ? 'Extra Paid' : 'Vacation Bonus'}
                                                                                    </span>
                                                                                </div>
                                                                            )}

                                                                            {/* Staffing Indicator */}
                                                                            {!absence && requiredCount > 0 && (
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
                                                                    empShiftsWithIndex.forEach((s: any) => {
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

                            {/* Shift View Body */}
                            <tbody className={`divide-y divide-border ${viewMode === 'shifts' ? '' : 'hidden'}`}>
                                {uniqueShiftTimes.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="p-12 text-center text-muted-foreground italic">No shifts found.</td>
                                    </tr>
                                ) : (
                                    uniqueShiftTimes.map((timeKey) => {
                                        const [start, end] = timeKey.split('-');
                                        return (
                                            <tr key={timeKey} className="hover:bg-muted/30 transition-colors">
                                                {/* Time Header */}
                                                <td className="p-4 sticky left-0 bg-background/95 backdrop-blur z-10 border-r border-border font-medium text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                                        <span>{start} - {end}</span>
                                                    </div>
                                                </td>
                                                {/* Days */}
                                                {weekDays.map((day, i) => {
                                                    const matchingShifts = day.shifts.filter((s: any) => `${s.startTime}-${s.endTime}` === timeKey);
                                                    const isCurrentDay = isToday(new Date(day.date));

                                                    // Flatten employees from all matching shifts (usually just one shift per time slot per day, but could be multiple if same time different role)
                                                    const slotEmployees = matchingShifts.flatMap((s: any) => s.employees.map((e: any) => ({ ...e, shiftId: s._id, color: s.color, shiftName: s.shiftName })));

                                                    return (
                                                        <td
                                                            key={i}
                                                            className={`p-2 border-r border-border last:border-r-0 align-top transition-colors ${day.isHoliday ? 'bg-muted/30' : isCurrentDay ? 'bg-primary/5' : ''}`}
                                                        >
                                                            {!day.isHoliday && (
                                                                <div className="space-y-1.5 min-h-[50px]">
                                                                    {slotEmployees.map((emp: any, idx: number) => (
                                                                        <div
                                                                            key={emp._id + idx}
                                                                            className="flex items-center gap-1.5 p-1.5 rounded border bg-card shadow-sm text-xs hover:border-primary/50 transition-colors cursor-pointer"
                                                                            style={{ borderLeft: `3px solid ${emp.color || '#ccc'}` }}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                // Open details/edit for the specific shift this employee belongs to
                                                                                const originalShift = matchingShifts.find((s: any) => s._id === emp.shiftId);
                                                                                if (originalShift && isEditMode) {
                                                                                    handleEditClick(originalShift, day.date, day.shifts.indexOf(originalShift));
                                                                                } // Else show details (nyi for shift view click on emp)
                                                                            }}
                                                                        >
                                                                            <Avatar className="h-5 w-5 border border-border">
                                                                                <AvatarImage src={emp.image} />
                                                                                <AvatarFallback className="text-[8px]">{emp.firstName?.[0]}{emp.lastName?.[0]}</AvatarFallback>
                                                                            </Avatar>
                                                                            <div className="min-w-0 flex-1">
                                                                                <div className="font-medium truncate leading-none">{emp.firstName} {emp.lastName}</div>
                                                                                {emp.shiftName && <div className="text-[9px] text-muted-foreground truncate leading-tight mt-0.5">{emp.shiftName}</div>}
                                                                            </div>
                                                                        </div>
                                                                    ))}

                                                                    {/* Add Button for this Slot */}
                                                                    {isEditMode && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="w-full h-6 text-[10px] border border-dashed border-transparent hover:border-border text-muted-foreground/50 hover:text-foreground"
                                                                            onClick={() => {
                                                                                // Pre-fill time
                                                                                setSelectedDate(new Date(day.date));
                                                                                // We need a way to pass pre-filled times to the dialog not just employee
                                                                                // Current dialog uses `editingShift` or `preselectedEmployee`.
                                                                                // We might need to enhance `handleAddClick` or set state manually.
                                                                                // For now, normal add. Ideally passing start/end.
                                                                                handleAddClick(day.date);
                                                                            }}
                                                                        >
                                                                            <Plus className="h-3 w-3 mr-1" /> Add
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td className="p-4 text-center text-muted-foreground">-</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table >
                    </div>
                </Card>
            </div >


            <ShiftDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                date={selectedDate}
                storeId={schedule.storeId}
                storeDepartmentId={schedule.storeDepartmentId?._id || schedule.storeDepartmentId}
                initialData={editingShift
                    ? { ...editingShift.shift, color: editingShift.shift.color }
                    : preselectedEmployeeId
                        ? {
                            startTime: "09:00",
                            endTime: "17:00",
                            shiftName: "Custom Shift",
                            breakMinutes: 0,
                            employees: [{ _id: preselectedEmployeeId }]
                        }
                        : undefined
                }
                onSave={handleSaveShift}
                onDelete={handleDeleteFromDialog}
                absences={schedule.absences}
                currentDayShifts={(() => {
                    const day = weekDays.find(d => new Date(d.date).toDateString() === selectedDate.toDateString());
                    if (!day) return [];
                    // Exclude the current shift being edited so employees in it aren't marked as "busy" (which would disable them if deselected)
                    // If creating new, editingShift is null, so we filter nothing (all existing shifts are "busy")
                    return day.shifts.filter((_: any, idx: number) => idx !== editingShift?.index);
                })()}
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

            <ReportAbsenceDialog
                open={absenceDialogOpen}
                onOpenChange={setAbsenceDialogOpen}
                employeeId={targetAbsenceShift?.employeeId}
                preselectedDate={targetAbsenceShift ? new Date(targetAbsenceShift.date) : undefined}
                preselectedShiftId={targetAbsenceShift?.shiftId}
            />

            <ShiftDetailsDialog
                open={detailsDialogOpen}
                onOpenChange={setDetailsDialogOpen}
                shift={targetDetailsShift?.shift}
                date={targetDetailsShift ? new Date(targetDetailsShift.date) : new Date()}
                employeeName={targetDetailsShift?.employeeName || ""}
                storeName={targetDetailsShift?.storeName}
                canSwap={targetDetailsShift?.canSwap}
                onSwapRequest={() => {
                    setDetailsDialogOpen(false);
                    setTargetSwapShift({
                        scheduleId: schedule._id,
                        dayDate: targetDetailsShift.date,
                        shiftId: targetDetailsShift.shift._id,
                        shiftName: targetDetailsShift.shift.shiftName,
                        startTime: targetDetailsShift.shift.startTime,
                        endTime: targetDetailsShift.shift.endTime,
                        employeeId: targetDetailsShift.targetEmployeeId,
                        employeeName: targetDetailsShift.employeeName
                    });
                    setSwapDialogOpen(true);
                }}
            />

            <Dialog open={showLogs} onOpenChange={setShowLogs}>
                <DialogContent className="max-w-2xl bg-card border-border">
                    <DialogHeader>
                        <DialogTitle>Schedule Changes History</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[400px] border rounded-md p-4">
                        {logsLoading ? (
                            <div className="flex justify-center items-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                                No recorded changes for this schedule.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {logs.map((log) => (
                                    <div key={log._id} className="flex flex-col gap-1 pb-4 border-b last:border-0 last:pb-0">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={log.performedBy?.image} />
                                                    <AvatarFallback>{log.performedBy?.firstName?.[0] || "?"}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-semibold text-sm">
                                                    {log.performedBy ? `${log.performedBy.firstName} ${log.performedBy.lastName}` : "System"}
                                                </span>
                                            </div>
                                            <span className="text-xs text-muted-foreground">{format(new Date(log.createdAt), "MMM d, HH:mm")}</span>
                                        </div>
                                        <div className="pl-8 text-sm text-foreground/80">
                                            <Badge variant="outline" className="text-[10px] mr-2 h-5">
                                                {log.action.replace("UPDATE_SCHEDULE", "Update").replace("PUBLISH_SCHEDULE", "Publish").replace("REJECT_SCHEDULE", "Reject").replace("APPROVE_SCHEDULE", "Approve").replace(/_/g, " ")}
                                            </Badge>
                                        </div>
                                        {log.details && (
                                            <div className="pl-8 text-xs text-muted-foreground bg-muted/30 p-2 rounded mt-1">
                                                {log.details.changes ? (
                                                    <ul className="list-disc list-inside">
                                                        {log.details.changes.map((c: string, i: number) => (
                                                            <li key={i}>{c}</li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    log.details.comment || (log.details.status ? `Status changed to ${log.details.status}` : JSON.stringify(log.details))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
            <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                <AlertDialogContent className="bg-popover border-border text-popover-foreground">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the schedule for Week {schedule.weekNumber}, {schedule.year}. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleDeleteSchedule();
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={actionLoading}
                        >
                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                            Confirm Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div >
    );
}
