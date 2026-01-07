"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { format, addDays, startOfWeek, addWeeks, subWeeks, endOfWeek } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getEmployeeScheduleView } from "@/lib/actions/schedule.actions";
import { Loader2, ChevronLeft, ChevronRight, Calculator, Calendar } from "lucide-react";
import { ReportShiftAbsenceDialog } from "./report-shift-absence-dialog";
import { Link } from "@/i18n/routing";

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

            <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                        <CardTitle className="text-lg">Weekly Schedule</CardTitle>
                        <p className="text-sm text-muted-foreground">View working hours and shifts</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {scheduleData?.primaryScheduleSlug && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="mr-2"
                                asChild
                            >
                                <Link href={`/dashboard/schedules/${scheduleData.primaryScheduleSlug}`}>
                                    <Calendar className="h-4 w-4 mr-2" />
                                    View Full Schedule
                                </Link>
                            </Button>
                        )}
                        <div className="flex items-center gap-2 bg-muted p-1 rounded-md border border-border">
                            <Button variant="ghost" size="icon" onClick={handlePrevWeek} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium w-48 text-center">
                                {format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} - {format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}
                            </span>
                            <Button variant="ghost" size="icon" onClick={handleNextWeek} className="h-8 w-8 text-muted-foreground hover:text-foreground">
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
                                                    <div className="flex flex-wrap gap-2">
                                                        {day.shifts.map((shift: any, sIdx: number) => (
                                                            <div key={sIdx} className="flex flex-col gap-1 bg-muted/50 p-2 rounded border border-border/50 min-w-[200px]">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <Badge variant="outline" className="text-[10px] h-4 border-border text-muted-foreground">
                                                                        {shift.storeName}
                                                                    </Badge>
                                                                    <span className="text-[10px] text-muted-foreground">•</span>
                                                                    <span className="text-[10px] text-muted-foreground font-medium">
                                                                        {shift.deptName}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="text-sm font-semibold font-mono text-primary">
                                                                        {shift.startTime} - {shift.endTime}
                                                                    </div>
                                                                    {shift.shiftName && <Badge variant="secondary" className="text-xs">{shift.shiftName}</Badge>}
                                                                </div>
                                                                {shift.breakMinutes > 0 && <span className="text-[10px] text-muted-foreground mt-1">Has {shift.breakMinutes}m break</span>}

                                                                {new Date(day.date) >= new Date(new Date().setHours(0, 0, 0, 0)) &&
                                                                    currentUser && currentUser.id === employeeId && (
                                                                        <ReportShiftAbsenceDialog
                                                                            shift={shift}
                                                                            dayDate={day.date}
                                                                            scheduleId={shift.scheduleId}
                                                                            storeId={shift.storeId}
                                                                            storeDepartmentId={shift.storeDepartmentId}
                                                                        />
                                                                    )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-muted-foreground italic text-sm">No shifts scheduled</div>
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
