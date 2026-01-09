"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, getDaysInMonth, startOfMonth, endOfMonth, isSameDay, isWithinInterval, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Calendar as CalendarIcon, User, Search, Filter, LayoutGrid, List as ListIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { approveVacationRequest, rejectVacationRequest } from "@/lib/actions/vacation.actions";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface VacationRequestListProps {
    initialRequests: any[];
    stores?: any[];
    departments?: any[];
    initialAbsences?: any[];
}

interface CalendarEvent {
    id: string;
    type: 'vacation' | 'absence';
    status: string; // 'approved', 'pending', 'rejected', 'absence'
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
}

export function VacationRequestList({ initialRequests, stores = [], departments = [], initialAbsences = [] }: VacationRequestListProps) {
    const { data: session } = useSession();
    const [requests, setRequests] = useState(initialRequests);
    const [absences, setAbsences] = useState(initialAbsences);
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
    const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");

    // Filters
    const [filterName, setFilterName] = useState("");
    const [filterStore, setFilterStore] = useState("all");
    const [filterDept, setFilterDept] = useState("all");
    const [filterPosition, setFilterPosition] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const t = useTranslations("Vacation");
    const tc = useTranslations("Common");

    // Derive unique positions
    const uniquePositions = useMemo(() => {
        const positions = new Set<string>();
        requests.forEach((r: any) => {
            if (r.employeeId?.position) positions.add(r.employeeId.position);
        });
        return Array.from(positions).sort();
    }, [requests]);

    const findStoreName = (id: string | any) => {
        if (!id) return "";
        const idStr = (id._id || id).toString();
        const store = stores.find(s => s._id.toString() === idStr);
        return store ? store.name : (id.name || "");
    };

    const findDeptName = (id: string | any) => {
        if (!id) return "";
        const idStr = (id._id || id).toString();
        const dept = departments.find(d => d._id.toString() === idStr);
        return dept ? dept.name : (id.name || "");
    };

    const updateStatus = async (requestId: string, action: 'approve' | 'reject') => {
        if (!session?.user) return;
        setLoadingMap(prev => ({ ...prev, [requestId]: true }));
        try {
            let updatedRequest;
            if (action === 'approve') {
                updatedRequest = await approveVacationRequest(requestId, session.user.id);
                toast.success("Vacation Approved");
            } else {
                updatedRequest = await rejectVacationRequest(requestId, session.user.id);
                toast.success("Vacation Rejected");
            }
            setRequests(prev => prev.map(r => r._id === requestId ? updatedRequest : r));
        } catch (error) {
            toast.error("Failed to update request");
        } finally {
            setLoadingMap(prev => ({ ...prev, [requestId]: false }));
        }
    };

    // Unified Event Generation
    const unifiedEvents = useMemo(() => {
        const events: CalendarEvent[] = [];

        // 1. Process Vacations
        requests.forEach((r: any) => {
            const name = `${r.employeeId?.firstName || ''} ${r.employeeId?.lastName || ''}`;

            // Apply Filters
            if (filterName && !name.toLowerCase().includes(filterName.toLowerCase())) return;
            if (filterStore !== "all" && r.storeId !== filterStore && r.employeeId?.storeId !== filterStore && String(r.employeeId?.storeId?._id || r.employeeId?.storeId) !== filterStore) return;

            const deptData = r.employeeId?.storeDepartmentId;
            const deptId = typeof deptData === 'object' ? (deptData?.globalDepartmentId || deptData?._id) : deptData;

            if (filterDept !== "all" && String(deptId || "") !== filterDept) return;

            if (filterPosition !== "all" && r.employeeId?.position !== filterPosition) return;
            if (filterStatus !== "all" && r.status !== filterStatus) return;

            // if (r.status === 'rejected') return; // Show rejected items in calendar as per user request

            const store = findStoreName(r.storeId || r.employeeId?.storeId);
            const dept = findDeptName(r.employeeId?.storeDepartmentId);

            events.push({
                id: r._id,
                type: 'vacation',
                status: r.status,
                employee: {
                    firstName: r.employeeId?.firstName || 'Unknown',
                    lastName: r.employeeId?.lastName || '',
                    image: r.employeeId?.image
                },
                start: new Date(r.requestedFrom),
                end: new Date(r.requestedTo),
                title: `${name} (Vacation)`,
                storeName: store,
                deptName: dept
            });
        });

        // 2. Process Absences
        absences.forEach((a: any) => {
            const name = `${a.employeeId?.firstName || ''} ${a.employeeId?.lastName || ''}`;

            // Apply Filters
            if (filterName && !name.toLowerCase().includes(filterName.toLowerCase())) return;
            if (filterStore !== "all" && a.employeeId?.storeId !== filterStore && String(a.employeeId?.storeId?._id || a.employeeId?.storeId) !== filterStore) return;
            if (filterDept !== "all" && String(a.employeeId?.departmentId?._id || a.employeeId?.departmentId || "") !== filterDept) return;
            if (filterPosition !== "all" && a.employeeId?.position !== filterPosition) return;
            if (filterStatus !== "all" && filterStatus !== 'absence') return; // Absences only show if filter is All or Absence

            // Absence "date" is usually single day, but model might have range?
            // Checking VerifySeed, absence has `date`. Assuming single day for simplicity or check model.
            // Model: date: Date.
            const start = new Date(a.date);
            const end = new Date(a.date); // Single day

            events.push({
                id: a._id,
                type: 'absence',
                status: 'absence',
                employee: {
                    firstName: a.employeeId?.firstName || 'Unknown',
                    lastName: a.employeeId?.lastName || '',
                    image: a.employeeId?.image
                },
                start: start,
                end: end,
                title: `${name} (Absence)`
            });
        });

        return events;
    }, [requests, absences, filterName, filterStore, filterDept, filterPosition, filterStatus, stores, departments]);


    // Filter Lists for List View
    const filteredRequestsList = useMemo(() => {
        // Re-use logic or just filter unified events? 
        // List view expects specific structure involving 'totalDays' etc. Sticking to filtering 'requests' array.
        return requests.filter((r: any) => {
            const name = `${r.employeeId?.firstName || ''} ${r.employeeId?.lastName || ''}`.toLowerCase();
            const matchesName = name.includes(filterName.toLowerCase());
            const matchesStore = filterStore === "all" || r.storeId === filterStore || String(r.employeeId?.storeId?._id || r.employeeId?.storeId) === filterStore;

            const deptData = r.employeeId?.storeDepartmentId;
            const deptId = typeof deptData === 'object' ? (deptData?.globalDepartmentId || deptData?._id) : deptData;
            const matchesDept = filterDept === "all" || String(deptId || "") === filterDept;

            const matchesPosition = filterPosition === "all" || r.employeeId?.position === filterPosition;
            const matchesStatus = filterStatus === "all" || r.status === filterStatus;

            return matchesName && matchesStore && matchesDept && matchesPosition && matchesStatus;
        });
    }, [requests, filterName, filterStore, filterDept, filterPosition, filterStatus]);

    const pendingRequests = filteredRequestsList.filter((r: any) => r.status === 'pending');
    const upcomingRequests = filteredRequestsList.filter((r: any) => {
        const toDate = new Date(r.requestedTo);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return r.status === 'approved' && toDate >= today;
    });
    const historicalRequests = filteredRequestsList.filter((r: any) => {
        const toDate = new Date(r.requestedTo);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return (r.status === 'approved' && toDate < today) || r.status === 'rejected';
    });


    // --- CALENDAR RENDER HELPERS ---
    const calendarWeeks = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const start = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
        const end = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const weeks = [];
        let day = start;

        while (day <= end) {
            weeks.push(day);
            day = addMonths(day, 0); // copy
            const nextWeek = new Date(day);
            nextWeek.setDate(day.getDate() + 7);
            day = nextWeek;
        }
        return weeks;
    }, [currentMonth]);

    const getEventsForWeek = (weekStart: Date) => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        weekStart.setHours(0, 0, 0, 0);

        // Find intersecting events
        const weekEvents = unifiedEvents.filter(ev => {
            return (ev.start <= weekEnd && ev.end >= weekStart);
        }).map(ev => {
            // Clip to this week
            const start = ev.start < weekStart ? weekStart : ev.start;
            const end = ev.end > weekEnd ? weekEnd : ev.end;

            const startDayIndex = Math.floor((start.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
            const duration = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

            return {
                ...ev,
                startDayIndex, // 0-6
                duration, // 1-7
                slot: 0 // to be assigned
            };
        });

        // Smart Stacking (Sort by start date first)
        weekEvents.sort((a, b) => a.startDayIndex - b.startDayIndex || (b.duration - a.duration)); // Longest events first if same start

        const slots: boolean[][] = []; // [slotIndex][dayIndex] -> occupied?

        weekEvents.forEach(ev => {
            let slot = 0;
            while (true) {
                if (!slots[slot]) slots[slot] = [];
                // Check collision
                let collision = false;
                for (let i = ev.startDayIndex; i < ev.startDayIndex + ev.duration; i++) {
                    if (slots[slot][i]) {
                        collision = true;
                        break;
                    }
                }
                if (!collision) {
                    // Reserve
                    for (let i = ev.startDayIndex; i < ev.startDayIndex + ev.duration; i++) {
                        slots[slot][i] = true;
                    }
                    ev.slot = slot;
                    break;
                }
                slot++;
            }
        });

        return { events: weekEvents, height: slots.length };
    };

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-card p-4 rounded-lg border shadow-sm">
                <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                    <div className="flex bg-muted/50 p-1 rounded-md border mr-2">
                        <Button
                            variant={viewMode === "list" ? "secondary" : "ghost"}
                            size="sm" onClick={() => setViewMode("list")} className="text-xs h-8 px-3">
                            {tc('pending')} ({pendingRequests.length})
                        </Button>
                        <Button
                            variant={viewMode === "calendar" ? "secondary" : "ghost"}
                            size="sm" onClick={() => setViewMode("calendar")} className="text-xs h-8 px-3 gap-2">
                            <CalendarIcon className="h-3 w-3" /> Calendar
                        </Button>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder={tc('searchEmployee')}
                            className="pl-8 w-[180px] h-9 bg-muted/50 text-xs"
                            value={filterName}
                            onChange={(e) => setFilterName(e.target.value)}
                        />
                    </div>

                    {stores.length > 0 && (
                        <Select value={filterStore} onValueChange={setFilterStore}>
                            <SelectTrigger className="w-[140px] h-9 bg-muted/50 text-xs">
                                <SelectValue placeholder="All Stores" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Stores</SelectItem>
                                {stores.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}

                    {departments.length > 0 && (
                        <Select value={filterDept} onValueChange={setFilterDept}>
                            <SelectTrigger className="w-[140px] h-9 bg-muted/50 text-xs">
                                <SelectValue placeholder="All Departments" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Departments</SelectItem>
                                {departments.map(d => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}

                    {uniquePositions.length > 0 && (
                        <Select value={filterPosition} onValueChange={setFilterPosition}>
                            <SelectTrigger className="w-[140px] h-9 bg-muted/50 text-xs">
                                <SelectValue placeholder="All Positions" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Positions</SelectItem>
                                {uniquePositions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}

                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[140px] h-9 bg-muted/50 text-xs">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="absence">Absence</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-muted/30 border rounded-md px-2 h-9">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium w-32 text-center">{format(currentMonth, "MMMM yyyy")}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button size="sm" className="h-9">
                        + New Request
                    </Button>
                </div>
            </div>

            {viewMode === "list" ? (
                <Tabs defaultValue="pending" className="w-full">
                    <TabsList className="bg-muted/50 border border-border h-11 w-full sm:w-auto justify-start overflow-x-auto">
                        <TabsTrigger value="pending" className="px-6 gap-2">
                            <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                            {tc('pending')}
                            <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1">{pendingRequests.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="upcoming" className="px-6 gap-2">
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                            Upcoming
                            <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1">{upcomingRequests.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="history" className="px-6 gap-2">
                            <span className="h-2 w-2 rounded-full bg-gray-400" />
                            {tc('history')}
                            <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1">{historicalRequests.length}</Badge>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="pending" className="mt-6 space-y-4">
                        {pendingRequests.length === 0 ? (
                            <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl bg-card/50">
                                <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                    <Search className="h-6 w-6 opacity-20" />
                                </div>
                                <p className="font-medium">{t('noPending')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {pendingRequests.map((req: any) => (
                                    <VacationRequestCard key={req._id} req={req} onAction={updateStatus} loading={loadingMap[req._id]} />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                    <TabsContent value="upcoming" className="mt-6 space-y-4">
                        {upcomingRequests.length === 0 ? (
                            <EmptyState message="No upcoming approved vacations." />
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {upcomingRequests.map((req: any) => (
                                    <VacationRequestCard key={req._id} req={req} onAction={updateStatus} loading={loadingMap[req._id]} isHistory />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                    <TabsContent value="history" className="mt-6 space-y-4">
                        {historicalRequests.length === 0 ? (
                            <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl bg-card/50">
                                <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                    <Search className="h-6 w-6 opacity-20" />
                                </div>
                                <p className="font-medium">{t('noHistory')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {historicalRequests.map((req: any) => (
                                    <VacationRequestCard key={req._id} req={req} onAction={updateStatus} loading={loadingMap[req._id]} isHistory />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            ) : (
                <Card className="border-none shadow-lg bg-card overflow-hidden ring-1 ring-border/50">
                    <CardContent className="p-0 overflow-x-auto">
                        <div className="min-w-[900px] bg-background">
                            {/* Header Row */}
                            <div className="grid grid-cols-7 border-b border-border/50 bg-muted/20">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                                    <div key={d} className="py-4 text-center text-sm font-semibold text-muted-foreground border-r border-border/30 last:border-r-0">
                                        {d}
                                    </div>
                                ))}
                            </div>

                            {/* Weeks */}
                            <div className="divide-y divide-border/30">
                                {calendarWeeks.map((weekStart, i) => {
                                    const { events, height } = getEventsForWeek(weekStart);
                                    // More height per slot for Name + Store/Dept
                                    const SLOT_HEIGHT = 45;
                                    const HEADER_HEIGHT = 30; // Date number space
                                    const rowHeight = Math.max(140, height * SLOT_HEIGHT + HEADER_HEIGHT + 20);

                                    return (
                                        <div key={i} className="relative grid grid-cols-7 divide-x divide-border/30" style={{ height: rowHeight }}>
                                            {/* Day Cells Background */}
                                            {Array.from({ length: 7 }).map((_, dIndex) => {
                                                const day = new Date(weekStart);
                                                day.setDate(day.getDate() + dIndex);
                                                const isCurrentMonth = isSameMonth(day, currentMonth);
                                                return (
                                                    <div key={dIndex} className={cn("p-2 transition-colors",
                                                        !isCurrentMonth ? "bg-muted/5 opacity-50" : "bg-card/50"
                                                    )}>
                                                        <span className={cn(
                                                            "text-sm font-medium block",
                                                            isSameDay(day, new Date()) && "text-primary font-bold bg-primary/10 w-fit px-2 py-0.5 rounded-full"
                                                        )}>
                                                            {format(day, 'd')}
                                                        </span>
                                                    </div>
                                                );
                                            })}

                                            {/* Event Bars Overlay/Container */}
                                            <div className="absolute inset-0 pointer-events-none mt-[32px] px-[1px]">
                                                <div className="relative w-full h-full">
                                                    {events.map(ev => (
                                                        <div
                                                            key={`${ev.id}-${ev.startDayIndex}`}
                                                            className={cn(
                                                                "absolute rounded-md px-2.5 py-1 flex flex-col justify-center shadow-sm pointer-events-auto cursor-pointer hover:brightness-110 transition-all overflow-hidden border",
                                                                ev.status === 'approved' && "bg-emerald-600/90 text-white border-emerald-500/30 dark:bg-emerald-600/80",
                                                                ev.status === 'pending' && "bg-amber-500/90 text-white border-amber-500/30 dark:bg-amber-600/80",
                                                                ev.status === 'rejection' && "bg-slate-500/80 text-white/90 border-slate-600/30 line-through decoration-white/50", // Check status enum. Usually 'rejected'.
                                                                ev.status === 'rejected' && "bg-slate-500/80 text-white/90 border-slate-600/30 line-through decoration-white/50",
                                                                ev.status === 'absence' && "bg-red-500/90 text-white border-red-500/30 dark:bg-red-600/80"
                                                            )}
                                                            style={{
                                                                left: `${(ev.startDayIndex * 100) / 7}%`,
                                                                width: `${(ev.duration * 100) / 7}%`,
                                                                top: `${ev.slot * SLOT_HEIGHT}px`,
                                                                height: `${SLOT_HEIGHT - 6}px`, // Gap
                                                                marginRight: '4px',
                                                                marginLeft: '1px'
                                                            }}
                                                            title={`${ev.employee.firstName} ${ev.employee.lastName} | ${ev.storeName} - ${ev.deptName}`}
                                                        >
                                                            <div className="font-bold text-xs md:text-sm truncate leading-tight">
                                                                {ev.employee.firstName} {ev.employee.lastName}
                                                            </div>
                                                            <div className="text-[10px] opacity-90 truncate flex items-center gap-1.5 leading-tight mt-0.5 font-medium text-white/80">
                                                                <span className="truncate">{ev.storeName}</span>
                                                                {ev.deptName && (
                                                                    <>
                                                                        <span className="opacity-60">•</span>
                                                                        <span className="truncate">{ev.deptName}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                    <div className="bg-muted/30 p-4 border-t border-border/50 flex gap-8 text-xs justify-center font-medium text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded bg-emerald-500 shadow-sm"></span> Approved Vacation
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded bg-amber-500 shadow-sm"></span> Pending Request
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded bg-red-500 shadow-sm"></span> Absence Record
                        </div>
                    </div>
                </Card>
            )}

            {/* Day Details Dialog */}
            {/* <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}</DialogTitle>
                        <DialogDescription>
                            Vacation activity for this date.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                        {selectedDateRequests.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                                No vacations scheduled for this day.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {selectedDateRequests.map(req => (
                                    <div key={req._id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/10">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 border">
                                                <AvatarImage src={req.employeeId?.image} />
                                                <AvatarFallback>{req.employeeId?.firstName?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium text-sm">{req.employeeId?.firstName} {req.employeeId?.lastName}</div>
                                                <div className="text-xs text-muted-foreground">{req.employeeId?.position}</div>
                                            </div>
                                        </div>
                                        <Badge className={cn(
                                            "capitalize",
                                            req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200 shadow-none' : 'bg-yellow-500/10 text-yellow-600 border-yellow-200 shadow-none'
                                        )}>
                                            {req.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog> */}
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl bg-card/50">
            <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Search className="h-6 w-6 opacity-20" />
            </div>
            <p className="font-medium">{message}</p>
        </div>
    );
}

function VacationRequestCard({ req, onAction, loading, isHistory }: { req: any, onAction: any, loading: boolean, isHistory?: boolean }) {
    const t = useTranslations("Vacation");
    const tc = useTranslations("Common");

    return (
        <Card className="bg-card border-border hover:shadow-md transition-shadow">
            <CardContent className="p-5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 border shadow-sm">
                            <AvatarImage src={req.employeeId?.image} />
                            <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">{req.employeeId?.firstName?.[0]}{req.employeeId?.lastName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h4 className="font-bold text-base text-foreground">{req.employeeId?.firstName} {req.employeeId?.lastName}</h4>
                            <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm mt-1">
                                <Badge variant="outline" className="text-xs h-5 bg-muted/50 font-normal">
                                    <CalendarIcon className="h-3 w-3 mr-1" />
                                    {format(new Date(req.requestedFrom), "MMM d")} - {format(new Date(req.requestedTo), "MMM d, yyyy")}
                                </Badge>
                                <span className={cn("text-xs font-bold", req.totalDays > 5 ? "text-amber-500" : "text-emerald-500")}>
                                    {req.totalDays} Days
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1.5 opacity-80 font-medium">
                                <span className="flex items-center gap-1 bg-muted/30 px-1.5 py-0.5 rounded-md border border-border/30">
                                    <span className="opacity-70">Store:</span>
                                    <span className="text-foreground/80">{req.storeId?.name || (typeof req.storeId === 'string' ? "Store " + req.storeId.substring(0, 4) : "Unknown")}</span>
                                </span>
                                {(req.employeeId?.storeDepartmentId || req.employeeId?.departmentId) && (
                                    <span className="flex items-center gap-1 bg-muted/30 px-1.5 py-0.5 rounded-md border border-border/30">
                                        <span className="opacity-70">Dept:</span>
                                        <span className="text-foreground/80">
                                            {req.employeeId?.storeDepartmentId?.name || req.employeeId?.departmentId?.name || "Unknown"}
                                        </span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        {isHistory ? (
                            <Badge className={cn("px-3 py-1 capitalize", req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-none' : 'bg-destructive/10 text-destructive border-destructive/20 shadow-none')}>
                                {req.status === 'approved' && <CheckCircle2 className="h-3 w-3 mr-1.5" />}
                                {req.status === 'rejected' && <XCircle className="h-3 w-3 mr-1.5" />}
                                {tc(req.status)}
                            </Badge>
                        ) : (
                            <div className="flex gap-2 w-full md:w-auto">
                                <Button
                                    size="sm"
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1 md:flex-none shadow-sm"
                                    onClick={() => onAction(req._id, 'approve')}
                                    disabled={loading}
                                >
                                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                    {tc('approve')}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 flex-1 md:flex-none"
                                    onClick={() => onAction(req._id, 'reject')}
                                    disabled={loading}
                                >
                                    <XCircle className="h-4 w-4 mr-1.5" />
                                    {tc('reject')}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
                {req.comments && (
                    <div className="mt-4 bg-muted/40 p-3 rounded-md text-sm text-foreground/80 border border-border/50 italic flex gap-2 items-start">
                        <span className="font-bold text-muted-foreground not-italic text-xs uppercase tracking-wider mt-0.5">Note</span>
                        {req.comments}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
