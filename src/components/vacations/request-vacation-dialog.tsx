"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createVacationRequest } from "@/lib/actions/vacation.actions";
import { getEmployeeAbsences } from "@/lib/actions/absence.actions"; // Import this
import { toast } from "sonner";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface RequestVacationDialogProps {
    employeeId: string;
    remainingDays: number;
    trigger?: React.ReactNode;
}

export function RequestVacationDialog({ employeeId, remainingDays, trigger }: RequestVacationDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Dates
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    const [comments, setComments] = useState("");

    const [absentDates, setAbsentDates] = useState<Date[]>([]);

    useEffect(() => {
        if (open && employeeId) {
            getEmployeeAbsences(employeeId).then(data => {
                const dates: Date[] = [];
                // Records
                data.records.forEach((r: any) => dates.push(new Date(r.date)));
                // Requests
                data.requests.forEach((r: any) => dates.push(new Date(r.date)));
                setAbsentDates(dates);
            }).catch(console.error);
        }
    }, [open, employeeId]);

    const calculateWorkingDays = (start: Date, end: Date) => {
        let count = 0;
        const curDate = new Date(start);
        while (curDate <= end) {
            const dayOfWeek = curDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                count++;
            }
            curDate.setDate(curDate.getDate() + 1);
        }
        return count;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!startDate || !endDate) {
            toast.error("Please select both start and end dates");
            return;
        }

        setLoading(true);

        try {
            if (endDate < startDate) {
                toast.error("End date cannot be before start date");
                setLoading(false);
                return;
            }

            // Rule 1: 15 days notice
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const minStartDate = new Date(today);
            minStartDate.setDate(today.getDate() + 15);

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
                toast.error(`Insufficient days. This request requires ${totalDays} working days, but you only have ${remainingDays} days remaining.`);
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
            setStartDate(undefined);
            setEndDate(undefined);
            setComments("");
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("Failed to submit request.");
        } finally {
            setLoading(false);
        }
    };

    // Calculate min date Logic for Picker
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minSelectableDate = new Date(today);
    minSelectableDate.setDate(today.getDate() + 15);

    // Disable Logic
    const isDateDisabled = (date: Date) => {
        // Disable past dates (simple check, though minSelectableDate handles future)
        if (date < today) return true;
        // Disable dates < minSelectableDate (15 day rule)
        // Wait, standard Calendar 'disabled' can accept a Matcher.
        // We want to force user to pick > 15 days.
        if (date < minSelectableDate) return true;

        // Disable absent dates
        // Compare properly (date comparison)
        return absentDates.some(absentDate =>
            absentDate.getDate() === date.getDate() &&
            absentDate.getMonth() === date.getMonth() &&
            absentDate.getFullYear() === date.getFullYear()
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                        <CalendarIcon className="mr-2 h-4 w-4" /> Request Vacation
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="bg-[#1e293b] border-zinc-700 text-white sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Request Vacation</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 flex flex-col">
                            <Label>Start Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full pl-3 text-left font-normal bg-[#0f172a] border-zinc-700 text-white hover:bg-[#1e293b] hover:text-white",
                                            !startDate && "text-muted-foreground"
                                        )}
                                    >
                                        {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-[#1e293b] border-zinc-700 text-white" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={startDate}
                                        onSelect={setStartDate}
                                        disabled={isDateDisabled}
                                        initialFocus
                                        className="text-white"
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2 flex flex-col">
                            <Label>End Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full pl-3 text-left font-normal bg-[#0f172a] border-zinc-700 text-white hover:bg-[#1e293b] hover:text-white",
                                            !endDate && "text-muted-foreground"
                                        )}
                                    >
                                        {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-[#1e293b] border-zinc-700 text-white" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={endDate}
                                        onSelect={setEndDate}
                                        disabled={(date) => isDateDisabled(date) || (startDate ? date < startDate : false)}
                                        initialFocus
                                        className="text-white"
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="comments">Comments</Label>
                        <Textarea
                            id="comments"
                            className="bg-[#0f172a] border-zinc-700 text-white resize-none"
                            placeholder="Reason for vacation..."
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="hover:bg-zinc-800 text-white hover:text-white">Cancel</Button>
                        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {loading ? "Submitting..." : "Submit Request"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
