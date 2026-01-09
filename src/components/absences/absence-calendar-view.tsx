"use client";

import { useState, useMemo } from "react";
import { format, isSameDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, User, CheckCircle2 } from "lucide-react";

interface AbsenceCalendarViewProps {
    requests: any[];
}

export function AbsenceCalendarView({ requests }: AbsenceCalendarViewProps) {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [selectedDateRecords, setSelectedDateRecords] = useState<any[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Map dates to status for highlighting
    const modifiers = useMemo(() => {
        const pendingDates: Date[] = [];
        const approvedDates: Date[] = [];

        requests.forEach(req => {
            const d = new Date(req.date);
            if (req.status === 'pending') pendingDates.push(d);
            else if (req.status === 'approved') approvedDates.push(d);
        });

        return {
            pending: pendingDates,
            approved: approvedDates
        };
    }, [requests]);

    const modifiersStyles = {
        pending: { color: 'orange', fontWeight: 'bold' },
        approved: { color: 'red', fontWeight: 'bold' }
    };

    const handleSelect = (selectedDate: Date | undefined) => {
        setDate(selectedDate);
        if (selectedDate) {
            const records = requests.filter(req => isSameDay(new Date(req.date), selectedDate));
            setSelectedDateRecords(records);
            if (records.length > 0) {
                setIsDialogOpen(true);
            }
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-8">
            <div className="p-4 border rounded-xl bg-card shadow-sm w-fit mx-auto md:mx-0">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleSelect}
                    className="rounded-md border p-4"
                    modifiers={modifiers}
                    modifiersClassNames={{
                        pending: "bg-amber-100 text-amber-700 font-bold rounded-md",
                        approved: "bg-red-100 text-red-700 font-bold rounded-md"
                    }}
                />
                <div className="mt-4 flex gap-4 text-xs justify-center">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-100 border border-amber-200" />
                        <span>Pending</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-100 border border-red-200" />
                        <span>Approved</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 space-y-4">
                <div className="hidden md:block">
                    <h3 className="text-lg font-semibold mb-4">
                        {date ? format(date, "EEEE, MMMM do, yyyy") : "Select a date"}
                    </h3>

                    {selectedDateRecords.length === 0 ? (
                        <div className="text-muted-foreground text-sm italic">
                            No absences recorded for this date.
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {selectedDateRecords.map(req => (
                                <AbsenceCard key={req._id} req={req} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Mobile Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{date && format(date, "MMMM do, yyyy")}</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="max-h-[60vh]">
                            <div className="space-y-4 py-4">
                                {selectedDateRecords.map(req => (
                                    <AbsenceCard key={req._id} req={req} />
                                ))}
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}

function AbsenceCard({ req }: { req: any }) {
    const isApproved = req.status === 'approved';
    const isPending = req.status === 'pending';

    return (
        <div className="flex items-start gap-4 p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors">
            <Avatar>
                <AvatarImage src={req.employeeId?.avatarUrl} />
                <AvatarFallback className="bg-primary/10 text-primary">
                    {req.employeeId?.firstName?.[0]}{req.employeeId?.lastName?.[0]}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">
                        {req.employeeId?.firstName} {req.employeeId?.lastName}
                    </p>
                    <Badge variant={isApproved ? "destructive" : "secondary"} className="capitalize">
                        {req.status}
                    </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize font-medium text-foreground">{req.type || "General"}</span>
                    <span>•</span>
                    <span>{req.reason || "No reason provided"}</span>
                </div>
                {req.justification && (
                    <div className="mt-2 text-xs flex items-center gap-1.5">
                        {req.justification === 'Justified' ? (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Justified</Badge>
                        ) : (
                            <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">Unjustified</Badge>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
