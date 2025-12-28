"use client";

import { useState, useEffect } from "react";
import { format, addDays, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getEmployeeScheduleView } from "@/lib/actions/schedule.actions";
import { Loader2, ChevronLeft, ChevronRight, Calculator, Calendar } from "lucide-react";

interface EmployeeScheduleTabProps {
    employeeId: string;
}

export function EmployeeScheduleTab({ employeeId }: EmployeeScheduleTabProps) {
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
        <Card className="bg-[#1e293b] border-none text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-lg">Weekly Schedule</CardTitle>
                    <p className="text-sm text-zinc-400">View working hours and shifts</p>
                </div>
                <div className="flex items-center gap-2 bg-[#0f172a] p-1 rounded-md border border-zinc-800">
                    <Button variant="ghost" size="icon" onClick={handlePrevWeek} className="h-8 w-8 text-zinc-400 hover:text-white">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium w-32 text-center">
                        Week {format(currentDate, 'w')} ({format(currentDate, 'MMM yyyy')})
                    </span>
                    <Button variant="ghost" size="icon" onClick={handleNextWeek} className="h-8 w-8 text-zinc-400 hover:text-white">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                    </div>
                ) : !scheduleData ? (
                    <div className="text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        No schedule published for this week.
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#0f172a] p-4 rounded-lg border border-zinc-800 flex items-center gap-4">
                                <div className="p-2 bg-blue-500/10 rounded-full text-blue-500">
                                    <ClockIcon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm text-zinc-400">Total Hours</p>
                                    <p className="text-2xl font-bold">{(totalMinutes / 60).toFixed(1)}h</p>
                                </div>
                            </div>
                            <div className="bg-[#0f172a] p-4 rounded-lg border border-zinc-800 flex items-center gap-4">
                                <div className="p-2 bg-purple-500/10 rounded-full text-purple-500">
                                    <Calculator className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm text-zinc-400">Total Shifts</p>
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
                                    <div key={idx} className={`p-4 rounded-lg border ${isToday ? 'border-primary/50 bg-primary/5' : 'border-zinc-800 bg-[#0f172a]'} flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors`}>
                                        <div className="flex items-center gap-4 w-40 shrink-0">
                                            <div className={`text-center p-2 rounded w-14 ${isToday ? 'bg-primary text-primary-foreground' : 'bg-zinc-800 text-zinc-400'}`}>
                                                <div className="text-xs font-bold uppercase">{format(date, 'MMM')}</div>
                                                <div className="text-lg font-bold">{format(date, 'd')}</div>
                                            </div>
                                            <div>
                                                <div className="font-semibold">{format(date, 'EEEE')}</div>
                                                {isToday && <Badge variant="secondary" className="text-[10px] h-5">Today</Badge>}
                                            </div>
                                        </div>

                                        <div className="flex-1">
                                            {isHoliday ? (
                                                <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-2 rounded w-fit">
                                                    <span className="font-bold text-xs uppercase">Closed</span>
                                                    <span className="text-sm">{day.holidayName}</span>
                                                </div>
                                            ) : hasShifts ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {day.shifts.map((shift: any, sIdx: number) => (
                                                        <div key={sIdx} className="flex flex-col gap-1 bg-zinc-800/50 p-2 rounded border border-zinc-700/50 min-w-[200px]">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <Badge variant="outline" className="text-[10px] h-4 border-zinc-600 text-zinc-400">
                                                                    {shift.storeName}
                                                                </Badge>
                                                                <span className="text-[10px] text-zinc-500">•</span>
                                                                <span className="text-[10px] text-zinc-400 font-medium">
                                                                    {shift.deptName}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <div className="text-sm font-semibold font-mono text-blue-300">
                                                                    {shift.startTime} - {shift.endTime}
                                                                </div>
                                                                {shift.shiftName && <Badge variant="secondary" className="text-xs bg-zinc-700 text-zinc-300 hover:bg-zinc-600">{shift.shiftName}</Badge>}
                                                            </div>
                                                            {shift.breakMinutes > 0 && <span className="text-[10px] text-zinc-500 mt-1">Has {shift.breakMinutes}m break</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-zinc-500 italic text-sm">No shifts scheduled</div>
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
    );
}

function ClockIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    )
}
