"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createVacationRequest, getVacationBlockedDates } from "@/lib/actions/vacation.actions";
import { getEmployeeAbsences } from "@/lib/actions/absence.actions";
import { toast } from "sonner";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { DateRange } from "react-day-picker";

import { calculateWorkingDays, isPortugalHoliday, isWeekend } from "@/lib/holidays";

interface RequestVacationDialogProps {
    employeeId: string;
    remainingDays: number;
    trigger?: React.ReactNode;
}

export function RequestVacationDialog({ employeeId, remainingDays, trigger }: RequestVacationDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const t = useTranslations("Vacation");
    const tc = useTranslations("Common");

    // Unified Range State
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [comments, setComments] = useState("");
    const [blockedRanges, setBlockedRanges] = useState<{ from: Date; to: Date }[]>([]);

    useEffect(() => {
        if (open && employeeId) {
            getVacationBlockedDates(employeeId).then(ranges => {
                setBlockedRanges(ranges.map((r: any) => ({
                    from: new Date(r.from),
                    to: new Date(r.to)
                })));
            }).catch(console.error);
        }
    }, [open, employeeId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!dateRange?.from || !dateRange?.to) {
            toast.error("Please select a date range (Start and End)");
            return;
        }

        setLoading(true);

        try {
            const startDate = dateRange.from;
            const endDate = dateRange.to;

            // Rule 1: 15 days notice
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const minStartDate = addDays(today, 15);

            if (startDate < minStartDate) {
                toast.error("Vacation requests must be submitted at least 15 days in advance.");
                setLoading(false);
                return;
            }

            // Rule 2: Exclude weekends
            const totalDays = calculateWorkingDays(startDate, endDate);

            if (totalDays === 0) {
                toast.error("Selected range has no working days.");
                setLoading(false);
                return;
            }

            if (totalDays > remainingDays) {
                toast.error(`Insufficient days. Request needs ${totalDays} working days.`);
                setLoading(false);
                return;
            }

            await createVacationRequest({
                employeeId,
                requestedFrom: startDate,
                requestedTo: endDate,
                totalDays,
                comments
            });

            toast.success("Vacation request submitted");
            setOpen(false);
            setDateRange(undefined);
            setComments("");
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("Failed to submit request.");
        } finally {
            setLoading(false);
        }
    };

    // Min Date Logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minSelectableDate = addDays(today, 15);

    // Dynamic Max Date based on Start selection
    const getMaxSelectableDate = (start: Date, limit: number) => {
        let workingDaysFound = 0;
        let current = new Date(start);

        // Check start day itself first
        if (!isWeekend(current) && !isPortugalHoliday(current)) {
            workingDaysFound++;
        }

        // If start day already exceeds limit (e.g. limit 0), return start
        if (workingDaysFound > limit) return start;

        // Iterate to find the Nth working day
        while (workingDaysFound < limit) {
            current = addDays(current, 1);
            if (!isWeekend(current) && !isPortugalHoliday(current)) {
                workingDaysFound++;
            }
            if (workingDaysFound > 365) break;
        }

        // Now current is the Nth working day.
        // We can extend to include subsequent non-working days (e.g. weekend)
        // Check next day
        let nextDay = addDays(current, 1);
        while (isWeekend(nextDay) || isPortugalHoliday(nextDay)) {
            current = nextDay;
            nextDay = addDays(nextDay, 1);
        }

        return current;
    };

    const isDateDisabled = (date: Date) => {
        // 1. Min Notice
        if (date < minSelectableDate) return true;

        // 2. Disable blocked dates (Capacity/Conflict/Own already booked)
        const isBlocked = blockedRanges.some(range =>
            date >= range.from && date <= range.to
        );
        if (isBlocked) return true;

        // 3. Smart restriction based on 'from' selection
        if (dateRange?.from) {
            // If 'to' is undefined, 'from' is our anchor.
            if (!dateRange.to) {
                // IMPORTANT: Calculate max allowed date from 'from'
                const maxDate = getMaxSelectableDate(dateRange.from, remainingDays);
                if (date > maxDate) return true;

                // Prevent selecting before start to keep it simple and forward-only
                if (date < dateRange.from) return true;
            }
        }

        return false;
    };

    const currentWorkingDays = (dateRange?.from && dateRange?.to)
        ? calculateWorkingDays(dateRange.from, dateRange.to)
        : 0;

    const isOverLimit = currentWorkingDays > remainingDays;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                        <CalendarIcon className="mr-2 h-4 w-4" /> {t('request')}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="bg-popover border-border text-popover-foreground sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('request')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2 flex flex-col">
                        <Label>Select Period</Label>
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal bg-background border-input hover:bg-accent hover:text-accent-foreground",
                                        !dateRange && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>
                                                {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                                            </>
                                        ) : (
                                            format(dateRange.from, "MMM d, yyyy")
                                        )
                                    ) : (
                                        <span>Pick dates (Max {remainingDays} working days)</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-popover border-border text-popover-foreground" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from || minSelectableDate}
                                    selected={dateRange}
                                    onSelect={(range) => {
                                        setDateRange(range);
                                        // Only close when both from and to are selected and they are different (a full range)
                                        if (range?.from && range?.to && range.from.getTime() !== range.to.getTime()) {
                                            setTimeout(() => setIsCalendarOpen(false), 200);
                                        }
                                    }}
                                    numberOfMonths={1}
                                    disabled={isDateDisabled}
                                    className="text-foreground"
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {dateRange?.from && dateRange?.to && (
                        <div className={cn("p-3 rounded-md border", isOverLimit ? "bg-red-50 border-red-200" : "bg-muted/50 border-border")}>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Selected Working Days:</span>
                                <span className={cn("font-bold", isOverLimit ? "text-red-500" : "text-foreground")}>
                                    {currentWorkingDays} days
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm mt-1">
                                <span className="text-muted-foreground">Remaining After:</span>
                                <span className={cn(
                                    "font-bold",
                                    isOverLimit ? "text-red-500" : "text-emerald-500"
                                )}>
                                    {remainingDays - currentWorkingDays} days
                                </span>
                            </div>
                            {isOverLimit && <p className="text-xs text-red-500 mt-2 font-medium">Exceeds remaining balance!</p>}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="comments">{t('comments')}</Label>
                        <Textarea
                            id="comments"
                            className="bg-background border-input resize-none"
                            placeholder={t('reasonPlaceholder')}
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{tc('cancel')}</Button>
                        <Button type="submit" disabled={loading || isOverLimit || !dateRange?.from || !dateRange?.to}>
                            {loading ? t('submitting') : t('submit')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

