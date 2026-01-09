"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Clock, Calendar, MoreVertical, X, AlertCircle, ChevronLeft, ChevronRight, User, Users } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeftRight, CalendarOff } from "lucide-react";

interface MobileScheduleViewProps {
    employees: any[];
    weekDays: any[];
    isEditMode: boolean;
    onEditShift: (shift: any, date: string, index: number) => void;
    onAddShift: (date: string, employeeId?: string) => void;
    onDeleteShift: (date: string, index: number, employeeId?: string) => void;
    onSwapRequest?: (shift: any, date: string, employeeId: string) => void;
    onAbsenceRequest?: (shift: any, date: string, employeeId: string) => void;
    onOvertimeRequest?: (shift: any, date: string, employeeId: string) => void;
    isToday: (date: Date) => boolean;
    currentUserId?: string;
}

export function MobileScheduleView({
    employees,
    weekDays,
    isEditMode,
    onEditShift,
    onAddShift,
    onDeleteShift,
    onSwapRequest,
    onAbsenceRequest,
    onOvertimeRequest,
    isToday,
    currentUserId
}: MobileScheduleViewProps) {
    const t = useTranslations("Schedule");
    const [activeDayIndex, setActiveDayIndex] = useState(() => {
        // Default to today if in range, otherwise 0
        const todayIndex = weekDays.findIndex(d => isToday(new Date(d.date)));
        return todayIndex !== -1 ? todayIndex : 0;
    });

    // Default to showing only my schedule if regular user, but show all for managers editing
    const [showMyScheduleOnly, setShowMyScheduleOnly] = useState(!!currentUserId && !isEditMode);

    const currentDay = weekDays[activeDayIndex];
    if (!currentDay) return null;

    const currentDate = new Date(currentDay.date);
    const isDayClosed = currentDay.isHoliday;

    // Filter unassigned shifts for this day
    const unassignedShifts = currentDay.shifts.filter((s: any) => s.employees.length === 0);

    const displayedEmployees = showMyScheduleOnly && currentUserId
        ? employees.filter(e => e._id === currentUserId)
        : employees;

    return (
        <div className="md:hidden flex flex-col h-[calc(100vh-200px)]">
            {/* Day Navigation Tabs */}
            <div className="flex items-center justify-between mb-4 gap-2">
                <div className="flex items-center overflow-x-auto pb-2 -mx-4 px-4 gap-2 no-scrollbar flex-1">
                    {weekDays.map((day, i) => {
                        const date = new Date(day.date);
                        const isActive = i === activeDayIndex;
                        const isCurrent = isToday(date);

                        return (
                            <button
                                key={i}
                                onClick={() => setActiveDayIndex(i)}
                                className={cn(
                                    "flex flex-col items-center justify-center min-w-[60px] h-[70px] rounded-xl border transition-all shrink-0",
                                    isActive
                                        ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                                        : "bg-card border-border text-muted-foreground hover:bg-muted/50",
                                    isCurrent && !isActive && "border-primary/50 bg-primary/5 text-primary"
                                )}
                            >
                                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                                    {format(date, "EEE")}
                                </span>
                                <span className="text-xl font-black leading-none">
                                    {format(date, "d")}
                                </span>
                                {day.isHoliday && (
                                    <span className="text-[8px] bg-red-500/20 text-red-500 px-1 rounded-full mt-1 font-bold">Closed</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Day Content Area */}
            <div className="flex-1 overflow-y-auto pr-1 pb-20 space-y-6">

                {/* 1. Day Header Stats & Toggle */}
                <div className="flex items-center justify-between px-1">
                    <div>
                        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                            {format(currentDate, "MMMM d, yyyy")}
                            {isDayClosed && <Badge variant="destructive" className="h-5 text-[10px]">CLOSED</Badge>}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            {isDayClosed ? currentDay.holidayName : `${currentDay.shifts.length} shifts scheduled`}
                        </p>
                    </div>

                    {currentUserId && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowMyScheduleOnly(!showMyScheduleOnly)}
                            className={cn("h-8 text-xs gap-2", showMyScheduleOnly ? "bg-primary/10 text-primary border-primary/20" : "")}
                        >
                            {showMyScheduleOnly ? <User className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                            {showMyScheduleOnly ? "My View" : "Team View"}
                        </Button>
                    )}
                </div>

                {/* 2. Unassigned Shifts (Queue) */}
                {!showMyScheduleOnly && unassignedShifts.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase text-amber-500 flex items-center gap-2">
                            <AlertCircle className="h-3 w-3" /> Unassigned Shifts
                        </h4>
                        {unassignedShifts.map((shift: any, idx: number) => (
                            <div
                                key={idx}
                                onClick={() => isEditMode && onEditShift(shift, currentDay.date, currentDay.shifts.indexOf(shift))}
                                className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="bg-amber-500/20 p-1.5 rounded-md text-amber-600">
                                        <Clock className="h-4 w-4" />
                                    </div>
                                    <span className="font-bold text-amber-700">{shift.startTime} - {shift.endTime}</span>
                                </div>
                                <span className="text-xs text-amber-600 italic">Tap to assign</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* 3. Employee List for this Day */}
                <div className="space-y-3">
                    {displayedEmployees.map((emp) => {
                        // Find shifts for this employee on this day
                        const empShifts = currentDay.shifts
                            .map((s: any, idx: number) => ({ ...s, originalIndex: idx }))
                            .filter((s: any) => s.employees.some((e: any) => e._id === emp._id));

                        const hasShift = empShifts.length > 0;
                        const isOff = hasShift && empShifts[0].shiftName === "Day Off";

                        if (isDayClosed) return null;

                        return (
                            <div key={emp._id} className={cn(
                                "flex items-center gap-3 p-3 rounded-2xl border transition-all",
                                hasShift
                                    ? (isOff ? "bg-muted/30 border-dashed border-border" : "bg-card border-border shadow-sm")
                                    : "bg-muted/5 border-transparent opacity-80 hover:opacity-100"
                            )}>
                                {/* Avatar */}
                                <Avatar className="h-10 w-10 border border-border shrink-0">
                                    <AvatarImage src={emp.image} />
                                    <AvatarFallback className="bg-muted text-muted-foreground font-bold text-xs">
                                        {emp.firstName[0]}{emp.lastName[0]}
                                    </AvatarFallback>
                                </Avatar>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-sm truncate">{emp.firstName} {emp.lastName}</span>
                                        <span className="text-[10px] text-muted-foreground uppercase">{emp.positionId?.name?.substring(0, 12) || "Staff"}</span>
                                    </div>

                                    {/* Slot */}
                                    {hasShift ? (
                                        <div className="space-y-2">
                                            {empShifts.map((shift: any) => {
                                                const isCurrentUser = currentUserId && emp._id === currentUserId;

                                                // Actions Logic
                                                const shiftStartDateTime = new Date(currentDay.date);
                                                const [startHours, startMinutes] = shift.startTime.split(':').map(Number);
                                                shiftStartDateTime.setHours(startHours, startMinutes, 0, 0);
                                                const hasStarted = new Date() > shiftStartDateTime;

                                                // Calculate Has Ended for Overtime
                                                const shiftEndDateTime = new Date(currentDay.date);
                                                const [endHours, endMinutes] = shift.endTime.split(':').map(Number);
                                                shiftEndDateTime.setHours(endHours, endMinutes, 0, 0);
                                                // Handle overnight (if end < start, or if we want to be safe, if end < start in same day numbers, add 1 day)
                                                // Comparing hours directly is safest if we assume valid shift times
                                                if (endHours < startHours) {
                                                    shiftEndDateTime.setDate(shiftEndDateTime.getDate() + 1);
                                                }
                                                const hasEnded = new Date() > shiftEndDateTime;

                                                const canSwap = !isCurrentUser && !isEditMode && !isOff && !!onSwapRequest && !hasStarted;
                                                const canAbsence = isCurrentUser && !isEditMode && !isOff && !!onAbsenceRequest;
                                                const canOvertime = isCurrentUser && !isEditMode && !isOff && !!onOvertimeRequest && hasEnded;
                                                const canPerformActions = canSwap || canAbsence || canOvertime;

                                                const ShiftCard = (
                                                    <div
                                                        className={cn(
                                                            "w-full text-left text-xs p-2 rounded-lg border flex items-center justify-between group relative transition-colors",
                                                            isOff
                                                                ? "bg-transparent border-transparent text-muted-foreground font-medium uppercase tracking-widest"
                                                                : "bg-primary/5 border-primary/20 text-foreground font-medium",
                                                            canPerformActions && "hover:bg-primary/10 cursor-pointer active:scale-[0.98]"
                                                        )}
                                                        style={shift.color && !isOff ? { borderLeft: `3px solid ${shift.color}` } : {}}
                                                        onClick={() => isEditMode && onEditShift(shift, currentDay.date, shift.originalIndex)}
                                                    >
                                                        {isOff ? (
                                                            <span>Day Off</span>
                                                        ) : (
                                                            <>
                                                                <div className="flex items-center gap-2">
                                                                    <span>{shift.startTime} - {shift.endTime}</span>
                                                                    {canPerformActions && <MoreVertical className="h-3 w-3 text-muted-foreground" />}
                                                                </div>
                                                                {shift.breakMinutes > 0 && <span className="opacity-50 text-[9px]">{shift.breakMinutes}m break</span>}
                                                            </>
                                                        )}

                                                        {/* Delete Button (Visible on Touch/Hover if Edit Mode) */}
                                                        {isEditMode && (
                                                            <div
                                                                className="ml-2 p-1 bg-destructive/10 text-destructive rounded-full"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onDeleteShift(currentDay.date, shift.originalIndex, emp._id);
                                                                }}
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </div>
                                                        )}
                                                    </div>
                                                );

                                                if (canPerformActions) {
                                                    return (
                                                        <DropdownMenu key={shift.originalIndex}>
                                                            <DropdownMenuTrigger asChild>
                                                                {ShiftCard}
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-48">
                                                                <DropdownMenuLabel>Shift Actions</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                {canSwap && (
                                                                    <DropdownMenuItem onClick={() => onSwapRequest(shift, currentDay.date, emp._id)}>
                                                                        <ArrowLeftRight className="mr-2 h-4 w-4" />
                                                                        <span>Swap Shift</span>
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {canAbsence && (
                                                                    <DropdownMenuItem onClick={() => onAbsenceRequest(shift, currentDay.date, emp._id)}>
                                                                        <CalendarOff className="mr-2 h-4 w-4" />
                                                                        <span>Request Absence</span>
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {canOvertime && (
                                                                    <DropdownMenuItem onClick={() => onOvertimeRequest && onOvertimeRequest(shift, currentDay.date, emp._id)}>
                                                                        <Clock className="mr-2 h-4 w-4" />
                                                                        <span>Request Overtime</span>
                                                                    </DropdownMenuItem>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    );
                                                }

                                                return <div key={shift.originalIndex}>{ShiftCard}</div>;
                                            })}
                                        </div>
                                    ) : (
                                        // Empty Slot -> Add Button
                                        isEditMode && (
                                            <button
                                                onClick={() => onAddShift(currentDay.date, emp._id)}
                                                className="w-full py-1.5 rounded-lg border border-dashed border-muted-foreground/30 text-muted-foreground/50 text-[10px] uppercase font-bold hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-colors flex items-center justify-center gap-1"
                                            >
                                                <Plus className="h-3 w-3" /> Add Shift
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {isDayClosed && (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50">
                        <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                            <Calendar className="h-8 w-8" />
                        </div>
                        <p className="font-medium">Store Closed</p>
                    </div>
                )}
            </div>
        </div>
    );
}
