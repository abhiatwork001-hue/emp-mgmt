"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Search, ChevronLeft, ChevronRight, User, AlertCircle, CheckCircle2 } from "lucide-react";
import { approveAbsenceRequest, rejectAbsenceRequest } from "@/lib/actions/absence.actions";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AbsenceCalendarViewProps {
    requests: any[];
    year?: number;
    canManage?: boolean;
    stores?: any[];
    departments?: any[];
    vacations?: any[];
}

interface CalendarEvent {
    id: string;
    type: 'vacation' | 'absence';
    status: string;
    employee: {
        firstName: string;
        lastName: string;
        image?: string;
    };
    start: Date;
    end: Date;
    title: string;
    storeName?: string;
    deptName?: string;
    originalRequest?: any;
}

export function AbsenceCalendarView({ requests, year, canManage, stores = [], departments = [], vacations = [] }: AbsenceCalendarViewProps) {
    const { data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        if (year && year !== now.getFullYear()) return new Date(year, 0, 1);
        return now;
    });

    const [filterName, setFilterName] = useState("");
    const [filterStore, setFilterStore] = useState("all");
    const [filterDept, setFilterDept] = useState("all");
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isDayDetailsOpen, setIsDayDetailsOpen] = useState(false);
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

    const handleAction = async (requestId: string, action: 'approve' | 'reject') => {
        if (!session?.user) return;
        setLoadingMap(prev => ({ ...prev, [requestId]: true }));
        try {
            if (action === 'approve') {
                await approveAbsenceRequest(requestId, (session.user as any).id);
                toast.success("Absence Approved");
            } else {
                await rejectAbsenceRequest(requestId, (session.user as any).id);
                toast.success("Absence Rejected");
            }
            setIsDayDetailsOpen(false);
        } catch (error) {
            toast.error("Failed to update status");
        } finally {
            setLoadingMap(prev => ({ ...prev, [requestId]: false }));
        }
    };

    // Unified Event Generation
    const unifiedEvents = useMemo(() => {
        const events: CalendarEvent[] = [];

        // 1. Process Absences (Requests & Records - Requests list usually includes both if handled properly in server)
        requests.forEach(r => {
            const emp = r.employeeId;
            const name = `${emp?.firstName || ''} ${emp?.lastName || ''}`;

            if (filterName && !name.toLowerCase().includes(filterName.toLowerCase())) return;
            if (filterStore !== "all" && String(emp?.storeId?._id || emp?.storeId) !== filterStore) return;
            if (filterDept !== "all" && String(emp?.storeDepartmentId?._id || emp?.storeDepartmentId) !== filterDept) return;

            events.push({
                id: r._id,
                type: 'absence',
                status: r.status,
                employee: { firstName: emp?.firstName || 'Unknown', lastName: emp?.lastName || '', image: emp?.image },
                start: new Date(r.date),
                end: new Date(r.date),
                title: `${name} (Absence)`,
                storeName: emp?.storeId?.name || '',
                deptName: emp?.storeDepartmentId?.name || '',
                originalRequest: r
            });
        });

        // 2. Process Vacations (Contextual)
        vacations.forEach(v => {
            const emp = v.employeeId;
            const name = `${emp?.firstName || ''} ${emp?.lastName || ''}`;

            if (filterName && !name.toLowerCase().includes(filterName.toLowerCase())) return;
            if (filterStore !== "all" && String(emp?.storeId?._id || emp?.storeId) !== filterStore) return;
            if (filterDept !== "all" && String(emp?.storeDepartmentId?._id || emp?.storeDepartmentId) !== filterDept) return;

            events.push({
                id: v._id,
                type: 'vacation',
                status: v.status,
                employee: { firstName: emp?.firstName || 'Unknown', lastName: emp?.lastName || '', image: emp?.image },
                start: new Date(v.requestedFrom),
                end: new Date(v.requestedTo),
                title: `${name} (Vacation)`,
                storeName: emp?.storeId?.name || '',
                deptName: emp?.storeDepartmentId?.name || '',
                originalRequest: v
            });
        });

        return events;
    }, [requests, vacations, filterName, filterStore, filterDept]);

    // Calendar Grid Logic
    const calendarWeeks = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const start = startOfWeek(monthStart, { weekStartsOn: 1 });
        const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
        const weeks = [];
        let day = start;
        while (day <= end) {
            weeks.push(new Date(day));
            day.setDate(day.getDate() + 7);
        }
        return weeks;
    }, [currentMonth]);

    const getEventsForWeek = (weekStart: Date) => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        const start = new Date(weekStart);
        start.setHours(0, 0, 0, 0);

        const weekEvents = unifiedEvents.filter(ev => ev.start <= weekEnd && ev.end >= start).map(ev => {
            const s = ev.start < start ? start : ev.start;
            const e = ev.end > weekEnd ? weekEnd : ev.end;
            const startDayIndex = Math.floor((s.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            const duration = Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            return { ...ev, startDayIndex, duration, slot: 0 };
        });

        weekEvents.sort((a, b) => a.startDayIndex - b.startDayIndex || (b.duration - a.duration));
        const slots: boolean[][] = [];
        weekEvents.forEach(ev => {
            let slot = 0;
            while (true) {
                if (!slots[slot]) slots[slot] = [];
                let collision = false;
                for (let i = ev.startDayIndex; i < ev.startDayIndex + ev.duration; i++) {
                    if (slots[slot][i]) { collision = true; break; }
                }
                if (!collision) {
                    for (let i = ev.startDayIndex; i < ev.startDayIndex + ev.duration; i++) slots[slot][i] = true;
                    ev.slot = slot;
                    break;
                }
                slot++;
            }
        });
        return { events: weekEvents, height: slots.length };
    };

    const handleDayClick = (day: Date) => {
        setSelectedDate(day);
        setIsDayDetailsOpen(true);
    };

    const selectedDayEvents = useMemo(() => {
        if (!selectedDate) return [];
        return unifiedEvents.filter(ev => isSameDay(ev.start, selectedDate) || isSameDay(ev.end, selectedDate) || (ev.start <= selectedDate && ev.end >= selectedDate));
    }, [selectedDate, unifiedEvents]);

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-card p-4 rounded-xl border shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search employee..."
                            className="pl-8 w-[200px] h-9 bg-muted/50 text-xs"
                            value={filterName}
                            onChange={(e) => setFilterName(e.target.value)}
                        />
                    </div>
                    <Select value={filterStore} onValueChange={setFilterStore}>
                        <SelectTrigger className="w-[140px] h-9 bg-muted/50 text-xs">
                            <SelectValue placeholder="All Stores" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Stores</SelectItem>
                            {stores.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={filterDept} onValueChange={setFilterDept}>
                        <SelectTrigger className="w-[140px] h-9 bg-muted/50 text-xs">
                            <SelectValue placeholder="All Depts" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Depts</SelectItem>
                            {departments.map(d => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2">
                    <Select value={currentMonth.getMonth().toString()} onValueChange={(v) => {
                        const d = new Date(currentMonth); d.setMonth(parseInt(v)); setCurrentMonth(d);
                    }}>
                        <SelectTrigger className="w-[120px] h-9 bg-muted/50 text-xs font-semibold">
                            <SelectValue>{format(currentMonth, "MMMM")}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 12 }).map((_, i) => (
                                <SelectItem key={i} value={i.toString()}>{format(new Date(2000, i, 1), "MMMM")}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="flex items-center bg-muted/30 border rounded-md px-1 h-9">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <Card className="border-none shadow-lg bg-card overflow-hidden ring-1 ring-border/50">
                <CardContent className="p-0 overflow-x-auto">
                    <div className="min-w-[900px] bg-background">
                        <div className="grid grid-cols-7 border-b border-border/50 bg-muted/20">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                                <div key={d} className="py-3 text-center text-xs font-bold text-muted-foreground border-r border-border/30 last:border-r-0 uppercase tracking-widest">{d}</div>
                            ))}
                        </div>
                        <div className="divide-y divide-border/30">
                            {calendarWeeks.map((weekStart, i) => {
                                const { events, height } = getEventsForWeek(weekStart);
                                const rowHeight = Math.max(120, height * 45 + 40);
                                return (
                                    <div key={i} className="relative grid grid-cols-7 divide-x divide-border/30" style={{ height: rowHeight }}>
                                        {Array.from({ length: 7 }).map((_, dIndex) => {
                                            const day = new Date(weekStart); day.setDate(day.getDate() + dIndex);
                                            const isCurrStr = isSameMonth(day, currentMonth);
                                            return (
                                                <div key={dIndex} className={cn("p-2 cursor-pointer hover:bg-muted/10 transition-colors", !isCurrStr && "opacity-40")} onClick={() => handleDayClick(day)}>
                                                    <span className={cn("text-sm font-semibold", isSameDay(day, new Date()) && "bg-primary text-white w-7 h-7 flex items-center justify-center rounded-full")}>
                                                        {format(day, 'd')}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        <div className="absolute inset-0 pointer-events-none mt-10 px-1">
                                            {events.map(ev => (
                                                <div
                                                    key={ev.id}
                                                    className={cn(
                                                        "absolute rounded-md px-2 py-1 flex flex-col justify-center shadow-sm pointer-events-auto cursor-pointer border text-white overflow-hidden text-[10px] md:text-xs",
                                                        ev.type === 'absence' ? "bg-red-500/90 border-red-400" : "bg-emerald-500/80 border-emerald-400"
                                                    )}
                                                    style={{
                                                        left: `${(ev.startDayIndex * 100) / 7}%`,
                                                        width: `${(ev.duration * 100) / 7}%`,
                                                        top: `${ev.slot * 45}px`,
                                                        height: '40px'
                                                    }}
                                                >
                                                    <span className="font-bold truncate">{ev.employee.firstName} {ev.employee.lastName}</span>
                                                    <span className="opacity-80 truncate">{ev.type === 'absence' ? 'Absence' : 'Vacation'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
                <div className="p-4 bg-muted/30 border-t border-border/50 flex gap-6 text-[10px] uppercase font-bold text-muted-foreground justify-center">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-500" /> Absence</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-500" /> Vacation</div>
                </div>
            </Card>

            {/* Day Details Dialog */}
            <Dialog open={isDayDetailsOpen} onOpenChange={setIsDayDetailsOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{selectedDate && format(selectedDate, "EEEE, MMMM do, yyyy")}</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] p-1">
                        <div className="space-y-3 py-2">
                            {selectedDayEvents.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground italic">No events for this day.</div>
                            ) : (
                                selectedDayEvents.map(ev => (
                                    <div key={ev.id} className="flex items-center justify-between p-4 rounded-xl border bg-card/50 shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-10 w-10 border shadow-sm">
                                                <AvatarImage src={ev.employee.image} />
                                                <AvatarFallback>{ev.employee.firstName[0]}{ev.employee.lastName[0]}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-bold text-sm">{ev.employee.firstName} {ev.employee.lastName}</p>
                                                <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                                                    <span className={cn("px-1.5 py-0.5 rounded font-bold text-white", ev.type === 'absence' ? "bg-red-500" : "bg-emerald-500")}>
                                                        {ev.type.toUpperCase()}
                                                    </span>
                                                    <span>{ev.storeName} • {ev.deptName}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {ev.type === 'absence' && ev.status === 'pending' && canManage && (
                                                <>
                                                    <Button size="sm" variant="outline" className="h-8 text-xs text-red-600 border-red-200 bg-red-50" onClick={() => handleAction(ev.id, 'reject')} disabled={loadingMap[ev.id]}>Reject</Button>
                                                    <Button size="sm" className="h-8 text-xs bg-emerald-600 text-white" onClick={() => handleAction(ev.id, 'approve')} disabled={loadingMap[ev.id]}>Approve</Button>
                                                </>
                                            )}
                                            {ev.type === 'vacation' && (
                                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">Vacation Data</Badge>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}
