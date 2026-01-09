"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Search, User, Store, Briefcase, ChevronRight, Clock, MapPin, Loader2, FilterX } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { getEmployeeSchedulesInRange } from "@/lib/actions/schedule.actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

interface ViewerClientProps {
    initialEmployees: any[];
    stores: any[];
    departments: any[];
    role: string;
}

export function ViewerClient({ initialEmployees, stores, departments, role }: ViewerClientProps) {
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfWeek(new Date(), { weekStartsOn: 1 }),
        to: endOfWeek(new Date(), { weekStartsOn: 1 })
    });
    const [shifts, setShifts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStore, setFilterStore] = useState("all");
    const [filterDept, setFilterDept] = useState("all");

    const filteredEmployees = initialEmployees.filter(emp => {
        const matchesSearch = `${emp.firstName} ${emp.lastName} ${emp.email}`.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStore = filterStore === "all" || emp.storeId?._id === filterStore;
        const matchesDept = filterDept === "all" || emp.storeDepartmentId?._id === filterDept;
        return matchesSearch && matchesStore && matchesDept;
    });

    const fetchShifts = async () => {
        if (!selectedEmployee || !dateRange?.from || !dateRange?.to) return;
        setLoading(true);
        try {
            const data = await getEmployeeSchedulesInRange(selectedEmployee._id, dateRange.from, dateRange.to);
            console.log("Fetched Shifts Data:", data);
            setShifts(data);
        } catch (error) {
            console.error("Failed to fetch shifts", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShifts();
    }, [selectedEmployee, dateRange]);

    const setPreset = (type: 'week' | 'month') => {
        const now = new Date();
        if (type === 'week') {
            setDateRange({
                from: startOfWeek(now, { weekStartsOn: 1 }),
                to: endOfWeek(now, { weekStartsOn: 1 })
            });
        } else {
            setDateRange({
                from: startOfMonth(now),
                to: endOfMonth(now)
            });
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[600px]">
            {/* Sidebar / Filter Section */}
            <div className="w-full lg:w-80 space-y-6">
                <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="pb-4 border-b border-border/40 bg-muted/20">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                            <Search className="w-4 h-4 text-primary" />
                            Find Employee
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 h-11 bg-background/50 border-border/60 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter ml-1">Store</Label>
                                <Select value={filterStore} onValueChange={setFilterStore}>
                                    <SelectTrigger className="rounded-xl bg-background/50 border-border/60 h-10">
                                        <SelectValue placeholder="All Stores" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Stores</SelectItem>
                                        {stores.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter ml-1">Department</Label>
                                <Select value={filterDept} onValueChange={setFilterDept}>
                                    <SelectTrigger className="rounded-xl bg-background/50 border-border/60 h-10">
                                        <SelectValue placeholder="All Departments" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Departments</SelectItem>
                                        {departments.map(d => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-border/40">
                            <div className="max-h-[300px] overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                                {filteredEmployees.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <FilterX className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                        <p className="text-xs">No employees found</p>
                                    </div>
                                ) : (
                                    filteredEmployees.map(emp => (
                                        <button
                                            key={emp._id}
                                            onClick={() => setSelectedEmployee(emp)}
                                            className={cn(
                                                "w-full flex items-center gap-3 p-2 rounded-xl transition-all group relative overflow-hidden",
                                                selectedEmployee?._id === emp._id
                                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                                    : "hover:bg-muted/50 text-foreground"
                                            )}
                                        >
                                            <Avatar className="h-8 w-8 border border-border/20">
                                                <AvatarImage src={emp.image} />
                                                <AvatarFallback className={cn("text-[10px]", selectedEmployee?._id === emp._id ? "bg-white/20" : "bg-primary/5 text-primary")}>
                                                    {emp.firstName?.[0]}{emp.lastName?.[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="text-left overflow-hidden">
                                                <p className="text-[13px] font-bold truncate leading-none mb-1">{emp.firstName} {emp.lastName}</p>
                                                <p className={cn("text-[10px] truncate opacity-60", selectedEmployee?._id === emp._id ? "text-white" : "text-muted-foreground")}>
                                                    {emp.positionId?.name || "No Position"}
                                                </p>
                                            </div>
                                            {selectedEmployee?._id === emp._id && (
                                                <motion.div layoutId="selection-glow" className="absolute inset-0 bg-white/10" />
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 space-y-6">
                <Card className="border-border/40 bg-card/60 backdrop-blur-md overflow-hidden shadow-2xl shadow-primary/5">
                    <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-border/20 bg-muted/10 p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <CalendarIcon className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-black tracking-tight">Schedule Viewer</CardTitle>
                                <p className="text-sm text-muted-foreground">Select an employee and a date range to begin.</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPreset('week')} className="rounded-full h-8 px-4 text-xs font-bold border-border/60 bg-background/50">
                                Current Week
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setPreset('month')} className="rounded-full h-8 px-4 text-xs font-bold border-border/60 bg-background/50">
                                Current Month
                            </Button>

                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            "rounded-full h-8 px-4 text-xs font-bold border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-all",
                                            !dateRange && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-3 w-3" />
                                        {dateRange?.from ? (
                                            dateRange.to ? (
                                                <>{format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd, y")}</>
                                            ) : (
                                                format(dateRange.from, "LLL dd, y")
                                            )
                                        ) : (
                                            <span>Select Range</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 rounded-2xl border-border/40 shadow-2xl" align="end">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={dateRange?.from}
                                        selected={dateRange}
                                        onSelect={(range) => {
                                            setDateRange(range);
                                            // Only close if we have a complete range (from AND to)
                                            if (range?.from && range?.to) {
                                                setIsCalendarOpen(false);
                                            }
                                        }}
                                        numberOfMonths={2}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <AnimatePresence mode="wait">
                            {!selectedEmployee ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex flex-col items-center justify-center py-32 text-center px-6"
                                >
                                    <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mb-6">
                                        <User className="w-10 h-10 text-muted-foreground opacity-30" />
                                    </div>
                                    <h3 className="text-xl font-bold text-foreground mb-2">Assign an Employee</h3>
                                    <p className="text-muted-foreground max-w-sm">Search and select an employee from the sidebar to view their historical or future schedules.</p>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key={selectedEmployee._id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="divide-y divide-border/20"
                                >
                                    {/* Profile Summary Horizontal Bar */}
                                    <div className="bg-muted/10 p-6 flex flex-col md:flex-row items-center gap-6 border-b border-border/20">
                                        <Avatar className="h-16 w-16 ring-4 ring-primary/10">
                                            <AvatarImage src={selectedEmployee.image} />
                                            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-black">
                                                {selectedEmployee.firstName?.[0]}{selectedEmployee.lastName?.[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="text-center md:text-left flex-1">
                                            <h2 className="text-2xl font-black tracking-tight">{selectedEmployee.firstName} {selectedEmployee.lastName}</h2>
                                            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-1 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> {selectedEmployee.positionId?.name}</span>
                                                <span className="flex items-center gap-1.5"><Store className="w-3.5 h-3.5" /> {selectedEmployee.storeId?.name}</span>
                                                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {selectedEmployee.storeDepartmentId?.name}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Shifts List */}
                                    <div className="p-6">
                                        {loading ? (
                                            <div className="flex flex-col items-center justify-center py-20">
                                                <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Loading Shifts...</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {shifts.length === 0 ? (
                                                    <div className="text-center py-16 bg-muted/10 rounded-3xl border border-dashed border-border/40">
                                                        <Clock className="w-10 h-10 mx-auto mb-4 text-muted-foreground opacity-20" />
                                                        <h4 className="font-bold text-muted-foreground">No shifts found</h4>
                                                        <p className="text-xs text-muted-foreground mt-1">Try selecting a different date range or employee.</p>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col space-y-2">
                                                        {shifts.map((shift, idx) => {
                                                            // Calculate Duration
                                                            let duration = "0h";
                                                            try {
                                                                if (shift.start && shift.end) {
                                                                    const [h1, m1] = shift.start.split(':').map(Number);
                                                                    const [h2, m2] = shift.end.split(':').map(Number);
                                                                    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
                                                                    if (diff < 0) diff += 24 * 60; // Overnight
                                                                    duration = `${Math.floor(diff / 60)}h ${diff % 60 > 0 ? (diff % 60) + 'm' : ''}`;
                                                                }
                                                            } catch (e) { }

                                                            const dateObj = shift.date ? new Date(shift.date) : null;
                                                            const isAbsent = shift.isAbsent;

                                                            return (
                                                                <div key={shift._id} className={cn(
                                                                    "flex items-center gap-4 bg-background/50 border border-border/40 p-3 rounded-2xl transition-all hover:bg-background/80 hover:shadow-sm",
                                                                    isAbsent && "border-red-500/20 bg-red-500/5 hover:bg-red-500/10"
                                                                )}>
                                                                    <div className={cn(
                                                                        "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm shadow-inner",
                                                                        isAbsent ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"
                                                                    )}>
                                                                        {format(new Date(shift.date), "dd")}
                                                                    </div>

                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <Badge variant="outline" className={cn(
                                                                                "font-bold uppercase tracking-tighter text-[10px] h-5",
                                                                                isAbsent ? "border-red-500/30 text-red-500 bg-red-500/5" : "border-primary/20 text-primary bg-primary/5"
                                                                            )}>
                                                                                {format(new Date(shift.date), "EEE")}
                                                                            </Badge>
                                                                            {isAbsent ? (
                                                                                <Badge variant="destructive" className="h-5 text-[10px] font-bold uppercase tracking-widest bg-red-500 hover:bg-red-600">
                                                                                    Absent
                                                                                </Badge>
                                                                            ) : (
                                                                                <Badge variant="secondary" className="h-5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                                                                    {shift.shiftName}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        {isAbsent ? (
                                                                            <div className="flex flex-col">
                                                                                <span className="text-sm font-bold truncate text-red-500/80 leading-none mb-1 capitalize">
                                                                                    {shift.absenceType || "Absent"}
                                                                                </span>
                                                                                <span className="text-xs text-muted-foreground truncate italic">
                                                                                    {shift.shiftName.replace("Absent: ", "")}
                                                                                </span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex flex-col">
                                                                                <span className="text-sm font-bold truncate text-foreground leading-none mb-1">
                                                                                    {shift.start} - {shift.end}
                                                                                    <span className="ml-2 text-xs font-normal text-muted-foreground">({duration})</span>
                                                                                </span>
                                                                                <span className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                                                                                    <Store className="w-3 h-3" /> {shift.store}
                                                                                    <span className="opacity-30">•</span>
                                                                                    <MapPin className="w-3 h-3" /> {shift.department}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

