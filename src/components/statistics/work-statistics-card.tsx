
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Clock, Percent, AlertCircle } from "lucide-react";

interface WorkStatisticsProps {
    stats: {
        period: { from: Date; to: Date; totalCalendarDays: number };
        work: { totalMinutes: number; totalHours: number; totalWorkingDays: number };
        holidays: { daysWorked: number; hoursWorked: number; names: string[] };
        absences: { totalDays: number; breakdown: Record<string, number>; justified: number; unjustified: number };
        daysOff: number;
    };
}

export function WorkStatisticsCard({ stats }: WorkStatisticsProps) {
    const { period, work, holidays, absences, daysOff } = stats;

    // Calculate percentage of working days
    const workingPercentage = period.totalCalendarDays > 0
        ? Math.round((work.totalWorkingDays / period.totalCalendarDays) * 100)
        : 0;

    return (
        <Card className="w-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Work Statistics</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

                {/* Total Hours */}
                <div className="flex flex-col space-y-2 p-4 border rounded-lg bg-secondary/10">
                    <div className="flex items-center text-muted-foreground text-sm">
                        <Clock className="mr-2 h-4 w-4" />
                        Total Hours
                    </div>
                    <div className="text-2xl font-bold">{work.totalHours}h</div>
                    <div className="text-xs text-muted-foreground">
                        Over {work.totalWorkingDays} working days
                    </div>
                </div>

                {/* Public Holidays */}
                <div className="flex flex-col space-y-2 p-4 border rounded-lg bg-orange-50/50 dark:bg-orange-950/20">
                    <div className="flex items-center text-orange-600 dark:text-orange-400 text-sm font-medium">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        Public Holidays
                    </div>
                    <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                        {holidays.daysWorked} Days
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {holidays.hoursWorked} hours worked
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {holidays.names.slice(0, 3).map((name, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] h-4 px-1">{name}</Badge>
                        ))}
                        {holidays.names.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{holidays.names.length - 3} more</span>
                        )}
                    </div>
                </div>

                {/* Absences */}
                <div className="flex flex-col space-y-2 p-4 border rounded-lg bg-red-50/50 dark:bg-red-950/20">
                    <div className="flex items-center text-red-600 dark:text-red-400 text-sm font-medium">
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Absences
                    </div>
                    <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                        {absences.totalDays} Days
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-2">
                        <span className="text-green-600 dark:text-green-500">{absences.justified} Justified</span>
                        <span className="text-red-600 dark:text-red-500">{absences.unjustified} Unjustified</span>
                    </div>
                </div>

                {/* Working Efficiency */}
                <div className="flex flex-col space-y-2 p-4 border rounded-lg">
                    <div className="flex items-center text-muted-foreground text-sm">
                        <Percent className="mr-2 h-4 w-4" />
                        Work Ratio
                    </div>
                    <div className="text-2xl font-bold">{workingPercentage}%</div>
                    <div className="text-xs text-muted-foreground">
                        {work.totalWorkingDays} days worked / {period.totalCalendarDays} total
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {daysOff} Days Off
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}
