"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { format, addDays, startOfWeek, addWeeks, subWeeks, endOfWeek } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getEmployeeScheduleView } from "@/lib/actions/schedule.actions";
import { Loader2, ChevronLeft, ChevronRight, Calculator, Calendar, Plane as PlaneIcon } from "lucide-react";
import { ReportShiftAbsenceDialog } from "./report-shift-absence-dialog";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

import { ShiftOfferList } from "./shift-offer-list";
import { Cake, Clock as ClockIcon } from "lucide-react";


interface EmployeeScheduleTabProps {
    employeeId: string;
    currentUser?: any;
}

export function EmployeeScheduleTab({ employeeId, currentUser }: EmployeeScheduleTabProps) {
    // const { data: session } = useSession(); // Removed to fix provider issue
    const [currentDate, setCurrentDate] = useState(new Date());
    const [scheduleData, setScheduleData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchSchedule = async () => {
        setLoading(true);
        try {
            const data = await getEmployeeScheduleView(employeeId, currentDate);
            setScheduleData(data);
        } catch (error) {
            console.error("Failed to fetch schedule", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedule();
    }, [currentDate, employeeId]);

    const handlePrevWeek = () => setCurrentDate(d => subWeeks(d, 1));
    const handleNextWeek = () => setCurrentDate(d => addWeeks(d, 1));

    // Stats
    let totalMinutes = 0;
    let totalShifts = 0;

    if (scheduleData?.days) {
        scheduleData.days.forEach((day: any) => {
            day.shifts.forEach((s: any) => {
                const getM = (t: string) => {
                    const [h, m] = t.split(':').map(Number);
                    return h * 60 + m;
                };
                let dur = getM(s.endTime) - getM(s.startTime);
                if (dur < 0) dur += 1440;
                if (s.breakMinutes) dur -= s.breakMinutes;
                totalMinutes += dur;
                totalShifts++;
            });
        });
    }

    return (
        <div className="space-y-6">
            <ShiftOfferList employeeId={employeeId} />

            {scheduleData && (scheduleData.isNew || scheduleData.isUpdated) && (
                <div className={cn(
                    "p-4 rounded-lg flex items-start gap-4 animate-in slide-in-from-top-2",
                    scheduleData.isNew ? "bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300" : "bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300"
                )}>
                    {scheduleData.isNew ? (
                        <div className="p-2 bg-blue-500 rounded-full text-white shrink-0">
                            <Calendar className="h-4 w-4" />
                        </div>
                    ) : (
                        <div className="p-2 bg-amber-500 rounded-full text-white shrink-0">
                            <ClockIcon className="h-4 w-4" />
                        </div>
                    )}
                    <div className="flex-1 space-y-1">
                        <p className="font-bold text-sm">
                            {scheduleData.isNew ? "New Schedule Published" : "Schedule Updated"}
                        </p>
                        <div className="text-xs opacity-90">
                            {scheduleData.isNew
                                ? "The schedule for this week has just been published."
                                : "The following changes were made recently:"
                            }
                        </div>
                        {scheduleData.isUpdated && scheduleData.lastChanges && scheduleData.lastChanges.length > 0 && (
                            <ul className="text-xs list-disc pl-4 space-y-0.5 mt-2 opacity-90 font-medium">
                                {scheduleData.lastChanges.map((change: string, i: number) => (
                                    <li key={i}>{change}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            <Card className="bg-card border-border">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 pb-2">
                    <div>
                        <CardTitle className="text-lg">Weekly Schedule</CardTitle>
                        <p className="text-sm text-muted-foreground">View working hours and shifts</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                        {scheduleData?.primaryScheduleSlug && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="mr-0 sm:mr-2 w-full sm:w-auto justify-center"
                                asChild
                            >
                                <Link href={`/dashboard/schedules/${scheduleData.primaryScheduleSlug}`}>
                                    <Calendar className="h-4 w-4 mr-2" />
                                    View Full Schedule
                                </Link>
                            </Button>
                        )}
                        <div className="flex items-center justify-between sm:justify-start gap-2 bg-muted p-1 rounded-md border border-border w-full sm:w-auto">
                            <Button variant="ghost" size="icon" onClick={handlePrevWeek} className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium flex-1 sm:w-48 text-center truncate px-2">
                                {format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} - {format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}
                            </span>
                            <Button variant="ghost" size="icon" onClick={handleNextWeek} className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : !scheduleData ? (
                        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
                            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            No schedule published for this week.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-muted/50 p-4 rounded-lg border border-border flex items-center gap-4">
                                    <div className="p-2 bg-primary/10 rounded-full text-primary">
                                        <ClockIcon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Hours</p>
                                        <p className="text-2xl font-bold">{(totalMinutes / 60).toFixed(1)}h</p>
                                    </div>
                                </div>
                                <div className="bg-muted/50 p-4 rounded-lg border border-border flex items-center gap-4">
                                    <div className="p-2 bg-purple-500/10 rounded-full text-purple-500">
                                        <Calculator className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Shifts</p>
                                        <p className="text-2xl font-bold">{totalShifts}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Shifts List */}
                            <div className="space-y-3">
                                {scheduleData.days.map((day: any, idx: number) => {
                                    const date = new Date(day.date);
                                    const isHoliday = day.isHoliday;
                                    const hasShifts = day.shifts.length > 0;
                                    const isToday = new Date().toDateString() === date.toDateString();

                                    return (
                                        <div key={idx} className={`p-4 rounded-lg border ${isToday ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/30'} flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors`}>
                                            <div className="flex items-center gap-4 w-40 shrink-0">
                                                <div className={`text-center p-2 rounded w-14 ${isToday ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                                    <div className="text-xs font-bold uppercase">{format(date, 'MMM')}</div>
                                                    <div className="text-lg font-bold">{format(date, 'd')}</div>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 font-semibold">
                                                        {format(date, 'EEEE')}
                                                        {day.isBirthday && <span title="Birthday!"><Cake className="h-4 w-4 text-pink-500 animate-pulse" /></span>}
                                                    </div>
                                                    {isToday && <Badge variant="secondary" className="text-[10px] h-5">Today</Badge>}
                                                </div>
                                            </div>

                                            <div className="flex-1">
                                                {isHoliday ? (
                                                    <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-2 rounded w-fit">
                                                        <span className="font-bold text-xs uppercase">Closed</span>
                                                        <span className="text-sm">{day.holidayName}</span>
                                                    </div>
                                                ) : hasShifts ? (
                                                    <div className="flex flex-col gap-3">
                                                        {day.shifts.map((shift: any, sIdx: number) => {
                                                            // Calculate Duration
                                                            let duration = "0h";
                                                            try {
                                                                if (shift.startTime && shift.endTime) {
                                                                    const [h1, m1] = shift.startTime.split(':').map(Number);
                                                                    const [h2, m2] = shift.endTime.split(':').map(Number);
                                                                    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
                                                                    if (diff < 0) diff += 24 * 60;
                                                                    if (shift.breakMinutes) diff -= shift.breakMinutes;
                                                                    duration = `${Math.floor(diff / 60)}h ${diff % 60 > 0 ? (diff % 60) + 'm' : ''}`;
                                                                }
                                                            } catch (e) { }

                                                            const isAbsent = shift.isAbsent;
                                                            const isVacation = shift.isVacation;

                                                            return (
                                                                <div key={sIdx} className={cn(
                                                                    "group flex items-center justify-between p-3 rounded-lg border transition-all",
                                                                    isAbsent
                                                                        ? "bg-red-500/5 border-red-500/20 hover:bg-red-500/10"
                                                                        : isVacation
                                                                            ? "bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10"
                                                                            : "bg-background border-border hover:border-primary/50"
                                                                )}>
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="space-y-1">
                                                                            <div className="flex items-center gap-2">
                                                                                {isAbsent ? (
                                                                                    <Badge variant="destructive" className="text-[10px] h-5 uppercase font-bold tracking-wider">Absent</Badge>
                                                                                ) : isVacation ? (
                                                                                    <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] h-5 uppercase font-bold tracking-wider">Vacation</Badge>
                                                                                ) : (
                                                                                    <span className="text-sm font-bold font-mono text-foreground">{shift.startTime} - {shift.endTime}</span>
                                                                                )}
                                                                                {!isAbsent && !isVacation && <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground bg-muted/50">{duration}</Badge>}
                                                                            </div>
                                                                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                                                                {isAbsent ? (
                                                                                    <span className="text-red-500 font-medium">{shift.shiftName.replace("Absent: ", "")}</span>
                                                                                ) : isVacation ? (
                                                                                    <span className="text-emerald-600 font-bold flex items-center gap-1.5 animate-pulse">
                                                                                        <PlaneIcon className="w-3 h-3" />
                                                                                        Happy Vacation! 🌴
                                                                                    </span>
                                                                                ) : (
                                                                                    <>
                                                                                        {shift.storeName && <span>{shift.storeName}</span>}
                                                                                        {shift.deptName && <span className="flex items-center gap-1">• {shift.deptName}</span>}
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-2">
                                                                        {shift.shiftName && !isAbsent && !isVacation && (
                                                                            <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">{shift.shiftName}</Badge>
                                                                        )}

                                                                        {new Date(day.date) >= new Date(new Date().setHours(0, 0, 0, 0)) &&
                                                                            currentUser && currentUser.id === employeeId && !isAbsent && (
                                                                                <ReportShiftAbsenceDialog
                                                                                    shift={shift}
                                                                                    dayDate={day.date}
                                                                                    scheduleId={shift.scheduleId}
                                                                                    storeId={shift.storeId}
                                                                                    storeDepartmentId={shift.storeDepartmentId}
                                                                                />
                                                                            )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border bg-muted/20 text-muted-foreground">
                                                        {isToday ? (
                                                            <>
                                                                <div className="p-1.5 bg-muted rounded-full">
                                                                    <ClockIcon className="h-4 w-4 opacity-50" />
                                                                </div>
                                                                <span className="font-medium">No Shift Today</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="p-1.5 bg-muted rounded-full">
                                                                    <Calendar className="h-4 w-4 opacity-50" />
                                                                </div>
                                                                <span className="font-medium">Day Off</span>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
