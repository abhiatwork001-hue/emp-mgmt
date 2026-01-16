"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarIcon, Clock, DollarSign, Calculator, Building2, MapPin, ChevronLeft, ChevronRight, Briefcase, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";
import { getEmployeeWorkHistory } from "@/lib/actions/schedule.actions";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { getEmployeeWorkStatistics } from "@/lib/actions/employee.actions";
import { WorkStatisticsCard } from "@/components/statistics/work-statistics-card";
import { DatePickerWithRange } from "@/components/statistics/date-range-picker";
import { useTranslations, useLocale } from "next-intl";
import { ptBR, enUS } from "date-fns/locale";

interface ProfileWorkTabProps {
    employee: any;
    currentUserRoles?: string[];
}

export function ProfileWorkTab({ employee, currentUserRoles = [] }: ProfileWorkTabProps) {
    const t = useTranslations("Profile.work");
    const locale = useLocale();
    const dateLocale = locale === 'pt' ? ptBR : enUS;
    const [stats, setStats] = useState<any>({ day: 0, week: 0, month: 0, year: 0 });
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Visibility Logic
    // Show calculator to HR, Owner, Tech, Admin, SuperUser OR if employee is Billable (Freelander/Extra)
    const isPrivileged = currentUserRoles.some(role =>
        ['owner', 'hr', 'tech', 'admin', 'super_user'].includes((role || "").toLowerCase())
    );
    const isBillableType = ['freelancer', 'extra'].includes((employee.contract?.employmentType || "").toLowerCase());

    const showCalculator = isPrivileged || isBillableType;

    // Calculator State
    const [calcRange, setCalcRange] = useState<DateRange | undefined>({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Start of month
        to: new Date()
    });
    const [hourlyRate, setHourlyRate] = useState<number>(0);
    const [calculatedHours, setCalculatedHours] = useState(0);
    const [billableAmount, setBillableAmount] = useState(0);

    const [detailedStats, setDetailedStats] = useState<any>(null);

    // Fetch Detailed Stats when range changes
    useEffect(() => {
        const fetchDetailedStats = async () => {
            if (!calcRange?.from || !calcRange?.to) return;
            try {
                const stats = await getEmployeeWorkStatistics(employee._id, calcRange.from, calcRange.to);
                setDetailedStats(stats);
            } catch (error) {
                console.error("Failed to fetch detailed stats", error);
            }
        };
        fetchDetailedStats();
    }, [employee._id, calcRange]);


    // Initial Fetch (Stats + Full History Cache)
    useEffect(() => {
        fetchData();
    }, [employee._id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getEmployeeWorkHistory(employee._id);
            setStats(data.stats);
            setHistory(data.history);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Calculator Logic
    const handleCalculate = async () => {
        if (!calcRange?.from || !calcRange?.to) return;

        try {
            const data = await getEmployeeWorkHistory(employee._id, { start: calcRange.from, end: calcRange.to });
            const totalH = data.rangeTotal;
            setCalculatedHours(totalH);
            setBillableAmount(totalH * (hourlyRate || 0));
        } catch (e) {
            console.error("Calculation failed", e);
        }
    };

    // --- Schedule View State ---
    const [viewMode, setViewMode] = useState<'week' | 'range'>('week');
    const [viewDate, setViewDate] = useState(new Date());
    const [rangeView, setRangeView] = useState<DateRange | undefined>({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date()
    });

    // --- Weekly Logic ---
    const startOfCurrentWeek = startOfWeek(viewDate, { weekStartsOn: 1 }); // Monday start
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfCurrentWeek, i));

    // Filter history for currently viewed week
    const currentWeekShifts = history.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startOfCurrentWeek && itemDate < addDays(startOfCurrentWeek, 7);
    });

    const weeklyTotal = currentWeekShifts.reduce((acc, curr) => acc + (curr.hours || 0), 0);

    const handlePrevWeek = () => setViewDate(d => subWeeks(d, 1));
    const handleNextWeek = () => setViewDate(d => addWeeks(d, 1));
    const handleResetWeek = () => setViewDate(new Date());

    // --- Range Logic ---
    const rangeShifts = history.filter(item => {
        if (!rangeView?.from || !rangeView?.to) return false;
        const d = new Date(item.date);
        // Normalize time for inclusive comparison
        const from = new Date(rangeView.from); from.setHours(0, 0, 0, 0);
        const to = new Date(rangeView.to); to.setHours(23, 59, 59, 999);
        return d >= from && d <= to;
    });

    const rangeTotal = rangeShifts.reduce((acc, curr) => acc + (curr.hours || 0), 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* 1. Stats Overview - Sleek Dashboard Look */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard title={t('today')} value={stats.day} unit="h" icon={Clock} color="text-emerald-500" bg="bg-emerald-500/10" />
                <StatsCard title={t('thisWeek')} value={stats.week} unit="h" icon={CalendarIcon} color="text-blue-500" bg="bg-blue-500/10" />
                <StatsCard title={t('thisMonth')} value={stats.month} unit="h" icon={CalendarIcon} color="text-purple-500" bg="bg-purple-500/10" />
                <StatsCard title={t('thisYear')} value={stats.year} unit="h" icon={CalendarIcon} color="text-amber-500" bg="bg-amber-500/10" />
            </div>

            {/* Detailed Statistics Card */}
            {detailedStats && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold tracking-tight">{t('periodAnalysis')}</h3>
                        <div className="w-auto">
                            <DatePickerWithRange date={calcRange} setDate={setCalcRange} />
                        </div>
                    </div>
                    <WorkStatisticsCard stats={detailedStats} />
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

                {/* 2. Billable Calculator (Left Column - Smaller) */}
                {showCalculator && (
                    <div className="xl:col-span-4 space-y-6">
                        <Card className="bg-gradient-to-br from-card to-muted/20 border-border overflow-hidden sticky top-6 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-lg font-medium">
                                    <div className="p-2 bg-primary/10 rounded-md text-primary">
                                        <Calculator className="w-4 h-4" />
                                    </div>
                                    {t('billableCalculator')}
                                </CardTitle>
                                <CardDescription>{t('billableDesc')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-4">
                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('period')}</Label>
                                        <div className="text-sm text-muted-foreground px-3 py-2 border rounded-md bg-muted/50 font-medium">
                                            {t('seeAnalysis')}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('hourlyRate')}</Label>
                                        <div className="relative">
                                            <div className="absolute left-3 top-2.5 text-muted-foreground font-medium">
                                                {employee.country === "US" ? "$" : "€"}
                                            </div>
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                className="pl-8 font-mono text-lg font-medium bg-background/50"
                                                value={hourlyRate || ""}
                                                onChange={(e) => setHourlyRate(parseFloat(e.target.value))}
                                            />
                                        </div>
                                    </div>

                                    <Button onClick={handleCalculate} className="w-full shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
                                        {t('calculate')}
                                    </Button>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5 border border-border/50 space-y-4 backdrop-blur-sm">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground font-medium">{t('totalHours')}</span>
                                        <span className="font-mono font-bold">{calculatedHours.toFixed(2)}h</span>
                                    </div>
                                    <Separator className="bg-border/60" />
                                    <div className="flex justify-between items-end">
                                        <span className="font-semibold text-muted-foreground pb-1">{t('totalPay')}</span>
                                        <span className="text-3xl font-bold text-primary tracking-tight leading-none">
                                            {new Intl.NumberFormat(employee.country === 'US' ? 'en-US' : 'de-DE', {
                                                style: 'currency',
                                                currency: employee.country === 'US' ? 'USD' : 'EUR'
                                            }).format(billableAmount)}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* 3. Work Schedule Timeline (Right Column - Wider or Full) */}
                <div className={cn(showCalculator ? "xl:col-span-8" : "xl:col-span-12")}>
                    <Card className="bg-card border-border h-full shadow-sm">
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/40">
                            <div>
                                <CardTitle className="text-lg font-medium flex items-center gap-3">
                                    {t('workActivity')}
                                    <div className="flex p-0.5 bg-muted rounded-lg border border-border">
                                        <Button
                                            variant={viewMode === 'week' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className="h-6 text-xs px-2"
                                            onClick={() => setViewMode('week')}
                                        >
                                            {t('weekly')}
                                        </Button>
                                        <Button
                                            variant={viewMode === 'range' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className="h-6 text-xs px-2"
                                            onClick={() => setViewMode('range')}
                                        >
                                            {t('range')}
                                        </Button>
                                    </div>
                                </CardTitle>
                                <CardDescription>
                                    {viewMode === 'week'
                                        ? t('weeklyTimeline', { hours: weeklyTotal.toFixed(1) })
                                        : t('historyRange', { hours: rangeTotal.toFixed(1) })}
                                </CardDescription>
                            </div>

                            {viewMode === 'week' ? (
                                <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/50">
                                    <Button variant="ghost" size="icon" onClick={handlePrevWeek} className="h-7 w-7 hover:bg-background rounded-md">
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="px-3 text-sm font-medium w-36 text-center cursor-pointer hover:text-primary transition-colors select-none" onClick={handleResetWeek}>
                                        {format(startOfCurrentWeek, "MMM dd", { locale: dateLocale })} - {format(addDays(startOfCurrentWeek, 6), "MM dd", { locale: dateLocale })}
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={handleNextWeek} className="h-7 w-7 hover:bg-background rounded-md">
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="w-full sm:w-auto min-w-[240px]">
                                    <DatePickerWithRange date={rangeView} setDate={setRangeView} />
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="pt-6">
                            {loading ? (
                                <div className="h-64 flex items-center justify-center text-muted-foreground animate-pulse">{t('loading')}</div>
                            ) : (
                                viewMode === 'week' ? (
                                    <div className="relative space-y-8 pl-2">
                                        {/* Vertical Timeline Line */}
                                        <div className="absolute left-[3.25rem] top-2 bottom-2 w-px bg-border/60 md:block hidden" />

                                        {weekDays.map((dayDate, i) => {
                                            const isToday = isSameDay(dayDate, new Date());
                                            const dayShifts = currentWeekShifts.filter(s => isSameDay(new Date(s.date), dayDate));

                                            return (
                                                <div key={i} className={cn("relative z-10 grid grid-cols-1 md:grid-cols-[4rem_1fr] gap-4 md:gap-8 group", dayShifts.length === 0 && "opacity-60 hover:opacity-100 transition-opacity")}>

                                                    {/* Date Column */}
                                                    <div className="flex flex-row md:flex-col items-center md:items-center gap-3 md:gap-1 pt-2 md:pt-0">
                                                        <div className={cn("text-xs font-bold uppercase tracking-wider", isToday ? "text-primary" : "text-muted-foreground", !isToday && dayShifts.length > 0 && "text-foreground")}>
                                                            {format(dayDate, "EEE", { locale: dateLocale })}
                                                        </div>
                                                        <div className={cn(
                                                            "text-xl md:text-2xl font-bold flex items-center justify-center w-10 h-10 rounded-full transition-all",
                                                            isToday ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110" : "bg-card text-muted-foreground border border-border group-hover:border-primary/50 group-hover:text-foreground"
                                                        )}>
                                                            {format(dayDate, "d")}
                                                        </div>
                                                    </div>

                                                    {/* Content Column */}
                                                    <div className="min-h-[3rem] py-1">
                                                        {dayShifts.length > 0 ? (
                                                            <div className="grid grid-cols-1 gap-3">
                                                                {dayShifts.map((shift, idx) => (
                                                                    <ShiftCard key={idx} shift={shift} employee={employee} />
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="h-full flex items-center">
                                                                <div className="h-px w-8 bg-border/60 mr-3 hidden md:block"></div>
                                                                <span className="text-muted-foreground/30 text-xs italic font-medium">{t('offDuty')}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {rangeShifts.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-3">
                                                {rangeShifts.map((shift, idx) => (
                                                    <div key={idx} className="flex gap-4 items-start">
                                                        <div className="w-24 pt-3 text-right text-xs text-muted-foreground font-medium shrink-0">
                                                            {format(new Date(shift.date), "EEE, MMM d", { locale: dateLocale })}
                                                        </div>
                                                        <div className="flex-1">
                                                            <ShiftCard shift={shift} employee={employee} showStoreAlways />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-12 text-center text-muted-foreground border border-dashed rounded-xl">
                                                {t('noShifts')}
                                            </div>
                                        )}
                                    </div>
                                )
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function ShiftCard({ shift, employee, showStoreAlways }: any) {
    const isBorrowed = shift.storeName && employee.storeId?.name && shift.storeName !== employee.storeId.name;
    const isExtra = shift.type === 'extra';
    const t = useTranslations("Profile.work");

    return (
        <div className={cn(
            "flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 p-3 rounded-xl border transition-all hover:shadow-md",
            isExtra ? "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40" : "bg-card border-border/60 hover:border-primary/30 hover:bg-muted/10"
        )}>
            {/* Time & Hours Pill */}
            <div className="flex items-center justify-between sm:justify-start gap-3 min-w-[140px]">
                <div className={cn("px-2.5 py-1 rounded-md text-xs font-bold font-mono border", isExtra ? "bg-amber-500/10 border-amber-500/20 text-amber-600" : "bg-primary/5 border-primary/10 text-primary")}>
                    {shift.hours}h
                </div>
                {shift.startTime !== "-" && (
                    <div className="text-sm font-medium text-muted-foreground tabular-nums">
                        {shift.startTime} <span className="text-muted-foreground/40 px-1">→</span> {shift.endTime}
                    </div>
                )}
            </div>

            {/* Shift Details */}
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 border-t sm:border-t-0 border-border/50 pt-2 sm:pt-0">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className={cn("font-semibold text-sm", isExtra ? "text-amber-700 dark:text-amber-500" : "text-foreground")}>
                            {shift.shiftName}
                        </span>
                        {isExtra && <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-amber-500/30 text-amber-600 bg-amber-500/5">{t('ot')}</Badge>}
                        {isBorrowed && <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-blue-500/30 text-blue-600 bg-blue-500/5">{t('borrowed')}</Badge>}
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground/80">
                        {shift.deptName && (
                            <span className="flex items-center gap-1">
                                <Briefcase className="w-3 h-3 opacity-70" /> {shift.deptName}
                            </span>
                        )}
                        {(showStoreAlways || isBorrowed) && shift.storeName && (
                            <span className="flex items-center gap-1 text-blue-600/80">
                                <MapPin className="w-3 h-3" /> {shift.storeName}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatsCard({ title, value, unit, icon: Icon, color, bg }: any) {
    return (
        <Card className="bg-card border-border/60 shadow-sm overflow-hidden relative group">
            <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
                <Icon className="w-16 h-16" />
            </div>
            <CardContent className="p-5 flex items-start justify-between relative z-10">
                <div>
                    <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">{title}</div>
                    <div className="text-3xl font-bold tracking-tight">
                        {value}<span className="text-base text-muted-foreground font-medium ml-1">{unit}</span>
                    </div>
                </div>
                <div className={cn("p-2.5 rounded-xl", bg, color)}>
                    <Icon className="w-5 h-5" />
                </div>
            </CardContent>
        </Card>
    );
}


