"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Clock, Calendar, MoreVertical, X, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface MobileScheduleViewProps {
    employees: any[];
    weekDays: any[];
    isEditMode: boolean;
    onEditShift: (shift: any, date: string, index: number) => void;
    onAddShift: (date: string) => void;
    onDeleteShift: (date: string, index: number) => void;
    isToday: (date: Date) => boolean;
}

export function MobileScheduleView({
    employees,
    weekDays,
    isEditMode,
    onEditShift,
    onAddShift,
    onDeleteShift,
    isToday
}: MobileScheduleViewProps) {
    const t = useTranslations("Schedule");

    return (
        <div className="md:hidden space-y-6">
            {employees.map((emp) => {
                // Calculate Stats per employee
                let totalMinutes = 0;
                let totalShifts = 0;

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

                const totalHours = totalMinutes / 60;
                const contractHours = emp.contract?.weeklyHours || 40;
                const contractDays = emp.contract?.workingDays?.length || 5;
                const isUnderHours = totalHours < contractHours;

                return (
                    <Card key={emp._id} className="overflow-hidden border-border/60 shadow-sm">
                        <CardHeader className="p-4 bg-muted/20 border-b border-border/40">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border border-border">
                                        <AvatarImage src={emp.image} />
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                            {emp.firstName[0]}{emp.lastName[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-bold text-sm text-foreground">{emp.firstName} {emp.lastName}</h3>
                                        <p className="text-xs text-muted-foreground">{emp.positionId?.name || "Employee"}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={cn("text-lg font-bold leading-none", isUnderHours ? "text-amber-500" : "text-emerald-600")}>
                                        {totalHours.toFixed(1)}<span className="text-[10px] text-muted-foreground font-normal ml-0.5">hrs</span>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground mt-1">
                                        / {contractHours} hrs target
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 divide-y divide-border/40">
                            {weekDays.map((day, i) => {
                                const date = new Date(day.date);
                                const isCurrentDay = isToday(date);
                                const empShifts = day.shifts.filter((s: any) =>
                                    s.employees.some((e: any) => e._id === emp._id)
                                );

                                return (
                                    <div
                                        key={i}
                                        className={cn(
                                            "flex items-stretch min-h-[70px]",
                                            isCurrentDay ? "bg-primary/5" : "bg-card"
                                        )}
                                    >
                                        {/* Date Column */}
                                        <div className={cn(
                                            "w-16 flex flex-col items-center justify-center p-2 border-r border-border/40 shrink-0",
                                            day.isHoliday ? "bg-muted/40" : ""
                                        )}>
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground">
                                                {format(date, "EEE")}
                                            </span>
                                            <span className={cn(
                                                "text-lg font-bold leading-none mt-0.5",
                                                isCurrentDay ? "text-primary" : "text-foreground"
                                            )}>
                                                {format(date, "d")}
                                            </span>
                                        </div>

                                        {/* Shift Content */}
                                        <div className="flex-1 p-2 relative">
                                            {day.isHoliday ? (
                                                <div className="h-full flex items-center gap-2 text-muted-foreground">
                                                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-transparent text-[10px]">CLOSED</Badge>
                                                    <span className="text-xs">{day.holidayName}</span>
                                                </div>
                                            ) : empShifts.length > 0 ? (
                                                <div className="space-y-2">
                                                    {empShifts.map((shift: any, idx: number) => {
                                                        const isDayOff = shift.shiftName === "Day Off";
                                                        return (
                                                            <div
                                                                key={idx}
                                                                onClick={() => isEditMode && onEditShift(shift, day.date, idx)}
                                                                className={cn(
                                                                    "relative rounded-md p-2 border transition-all",
                                                                    isDayOff
                                                                        ? "bg-muted/50 border-dashed border-border text-muted-foreground flex justify-center py-3"
                                                                        : "bg-background border-border shadow-sm",
                                                                    isEditMode ? "active:scale-[0.98]" : "",
                                                                    shift.color ? `border-l-4` : "border-l-4 border-l-primary"
                                                                )}
                                                                style={shift.color && !isDayOff ? { borderLeftColor: shift.color } : {}}
                                                            >
                                                                {isDayOff ? (
                                                                    <span className="text-xs font-bold uppercase tracking-widest">Day Off</span>
                                                                ) : (
                                                                    <div className="flex justify-between items-start">
                                                                        <div>
                                                                            <div className="text-xs font-bold flex items-center gap-1.5">
                                                                                <Clock className="h-3 w-3 text-muted-foreground" />
                                                                                {shift.startTime} - {shift.endTime}
                                                                            </div>
                                                                            {shift.notes && (
                                                                                <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{shift.notes}</p>
                                                                            )}
                                                                        </div>
                                                                        {shift.breakMinutes > 0 && (
                                                                            <Badge variant="secondary" className="text-[9px] h-4 px-1">{shift.breakMinutes}m break</Badge>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {isEditMode && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onDeleteShift(day.date, idx);
                                                                        }}
                                                                        className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100"
                                                                    >
                                                                        <X className="h-3 w-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div
                                                    onClick={() => !day.isHoliday && isEditMode && onAddShift(day.date)}
                                                    className="h-full min-h-[40px] flex items-center justify-center rounded-md border-2 border-dashed border-border/40 text-muted-foreground/40 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer"
                                                >
                                                    {isEditMode ? <Plus className="h-5 w-5" /> : <span className="text-[10px] italic">No Shift</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
