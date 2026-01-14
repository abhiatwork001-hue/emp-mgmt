"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DatePicker } from "@/components/ui/date-picker";
import { calculateTipsDistribution, saveTipsDistribution, getStoreDepartmentsForTips, getTipsHistory } from "@/lib/actions/tips.actions";
import { toast } from "sonner";
import { Loader2, Calculator, Save, Plus, Trash2, Filter, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";



interface Period {
    id: number;
    startDate: string; // ISO Date String
    endDate: string;
    amount: string;
}

interface Department {
    _id: string;
    name: string;
}

interface CalculationRecord {
    employeeId: string;
    employeeName: string;
    shiftsWorked: number;
    calculatedShares: number;
    adjustedShares: number;
    finalAmount: number;
    status?: 'pending' | 'paid';
    periodDetails: {
        periodIndex: number;
        shares: number;
        amount: number;
    }[];
}

interface TipsCalculatorProps {
    storeId: string;
    userId: string;
    onSuccess?: () => void;
    initialData?: any; // ITipsDistribution
    onCancel?: () => void;
}


export function TipsCalculator({ storeId, userId, onSuccess, initialData, onCancel }: TipsCalculatorProps) {
    // State
    const [periods, setPeriods] = useState<Period[]>([
        { id: 1, startDate: "", endDate: "", amount: "" }
    ]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
    const [roundingEnabled, setRoundingEnabled] = useState(true);
    const [historyRanges, setHistoryRanges] = useState<{ start: number, end: number }[]>([]);

    // Calculation State
    const [records, setRecords] = useState<CalculationRecord[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Initial Load
    useEffect(() => {
        const load = async () => {
            const [depts, history] = await Promise.all([
                getStoreDepartmentsForTips(storeId),
                getTipsHistory(storeId)
            ]);
            setDepartments(depts);

            // If initialData provided, load it
            if (initialData) {
                // Map periods
                if (initialData.periods) {
                    setPeriods(initialData.periods.map((p: any, i: number) => ({
                        id: i,
                        startDate: new Date(p.startDate).toISOString().split('T')[0],
                        endDate: new Date(p.endDate).toISOString().split('T')[0],
                        amount: p.amount.toString()
                    })));
                } else {
                    setPeriods([{
                        id: 1,
                        startDate: new Date(initialData.weekStartDate).toISOString().split('T')[0],
                        endDate: new Date(initialData.weekEndDate).toISOString().split('T')[0],
                        amount: initialData.totalAmount.toString()
                    }]);
                }
                setRecords(initialData.records);
            }

            // Process history to blocked ranges
            // Check both legacy root range AND periods array
            const blocked: { start: number, end: number }[] = [];
            history.forEach((h: any) => {
                // Don't block our own dates if editing
                if (initialData && h._id === initialData._id) return;

                if (h.periods && h.periods.length > 0) {
                    h.periods.forEach((p: any) => {
                        blocked.push({
                            start: new Date(p.startDate).setHours(0, 0, 0, 0),
                            end: new Date(p.endDate).setHours(23, 59, 59, 999)
                        });
                    });
                } else {
                    // Legacy fallback
                    blocked.push({
                        start: new Date(h.weekStartDate).setHours(0, 0, 0, 0),
                        end: new Date(h.weekEndDate).setHours(23, 59, 59, 999)
                    });
                }
            });
            setHistoryRanges(blocked);
        };
        load();
    }, [storeId, initialData]);

    // Check if a date is unavailable
    const isDateDisabled = (date: Date, currentPeriodId?: number) => {
        const time = date.getTime();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Check Future
        if (date > today) return true;

        // 2. Check History
        const inHistory = historyRanges.some(r => time >= r.start && time <= r.end);
        if (inHistory) return true;

        // 3. Check overlap with other CURRENT periods
        // Each period is implicitly 7 days (Start -> Start + 6)
        return periods.some(p => {
            if (currentPeriodId !== undefined && p.id === currentPeriodId) return false; // Ignore self
            if (!p.startDate) return false;

            const pStart = new Date(p.startDate);
            pStart.setHours(0, 0, 0, 0);

            // Calculate implicit end date (Start + 6 days)
            const pEnd = new Date(pStart);
            pEnd.setDate(pEnd.getDate() + 6);
            pEnd.setHours(23, 59, 59, 999);

            return time >= pStart.getTime() && time <= pEnd.getTime();
        });
    };

    // Handlers
    const addPeriod = () => {
        const lastPeriod = periods[periods.length - 1];
        let nextStart: Date | null = null;

        // Smart Default: Day after last period ends
        if (lastPeriod && lastPeriod.startDate) {
            const d = new Date(lastPeriod.startDate);
            d.setDate(d.getDate() + 7); // Start + 7 days = Day after implicit end
            nextStart = d;
        }

        // Verify nextStart is valid (not blocked)
        // If blocked, just leave empty
        let startStr = "";
        if (nextStart && !isDateDisabled(nextStart)) {
            startStr = nextStart.toISOString().split('T')[0];
        }

        setPeriods([...periods, {
            id: Date.now(),
            startDate: startStr,
            endDate: "", // Calculated automatically
            amount: ""
        }]);
    };

    const removePeriod = (id: number) => {
        setPeriods(periods.filter(p => p.id !== id));
    };

    const updatePeriod = (id: number, field: keyof Period, value: string) => {
        setPeriods(periods.map(p => {
            if (p.id !== id) return p;

            // Auto-set end date if start date is picked (Start + 6 days = 1 week)
            if (field === 'startDate' && value) {
                const start = new Date(value);
                const end = new Date(start);
                end.setDate(end.getDate() + 6);
                return { ...p, [field]: value, endDate: end.toISOString().split('T')[0] };
            }
            return { ...p, [field]: value };
        }));
    };

    const toggleDept = (id: string) => {
        setSelectedDeptIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleCalculate = async () => {
        // Validation
        const validPeriods = periods.filter(p => p.startDate && p.endDate && p.amount);
        if (validPeriods.length === 0) {
            toast.error("Please configure at least one valid period.");
            return;
        }

        setLoading(true);
        const res = await calculateTipsDistribution(
            storeId,
            validPeriods.map(p => ({
                startDate: p.startDate,
                endDate: p.endDate,
                amount: parseFloat(p.amount)
            })),
            selectedDeptIds, // Empty = All 
            { enabled: roundingEnabled, step: 0.5 }
        );
        setLoading(false);

        if (res.success && res.records) {
            setRecords(res.records as CalculationRecord[]);
            toast.success("Calculation complete");
        } else {
            toast.error(res.error || "Calculation failed");
        }
    };

    // Recalculate final amounts client-side when shares are manually adjusted
    const handleAdjustShare = (index: number, val: string) => {
        if (!records) return;
        const newRecords = [...records];
        const newShare = parseFloat(val) || 0;
        newRecords[index].adjustedShares = newShare;

        // Recalculate totals
        // We need the total pooled amount from periods
        const totalAmount = periods.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const totalShares = newRecords.reduce((sum, r) => sum + r.adjustedShares, 0);

        const rate = totalShares > 0 ? totalAmount / totalShares : 0;

        // Update all records finalAmount based on new rate
        // Wait, if I change ONE person's share, everyone's rate changes? Yes, theoretically.
        // OR do we fix the rate? Usually distribution is fixed pot. So yes, rate changes.
        // But re-calculating everyone's money locally is tricky if we want to preserve manual edits?
        // Let's assume standard pool logic: Shares determine % of pool.

        // Re-run distribution for all
        newRecords.forEach(r => {
            let amt = r.adjustedShares * rate;
            if (roundingEnabled) {
                amt = Math.round(amt / 0.5) * 0.5;
            }
            r.finalAmount = parseFloat(amt.toFixed(2));
        });

        setRecords(newRecords);
    };

    const handleSave = async () => {
        if (!records) return;
        setSaving(true);
        const res = await saveTipsDistribution({
            storeId,
            userId,
            periods: periods.filter(p => p.startDate && p.endDate && p.amount).map(p => ({
                ...p, amount: parseFloat(p.amount)
            })),
            records
        });
        setSaving(false);
        if (res.success) {
            toast.success("Tips Finalized Saved!");
            setRecords(null);
            setPeriods([{ id: 1, startDate: "", endDate: "", amount: "" }]);
            if (onSuccess) onSuccess();
        } else {
            toast.error("Failed to save");
        }
    };

    // Derived Stats
    const totalInput = periods.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const totalDistributed = records ? records.reduce((sum, r) => sum + r.finalAmount, 0) : 0;
    const variance = totalInput - totalDistributed;

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    Legacy Weighted Calculator
                </CardTitle>
                <CardDescription>
                    Multi-period distribution with duration-weighted logic.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Configuration Section */}
                <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mr-2">Distribution Periods</h3>
                        <Button variant="ghost" size="sm" onClick={addPeriod} className="h-8 whitespace-nowrap">
                            <Plus className="h-4 w-4 mr-1" /> Add Week
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {periods.map((period, idx) => (
                            <div key={period.id} className="flex flex-col sm:flex-row gap-4 items-start sm:items-end bg-card/50 p-3 rounded-md border border-border/50">
                                <div className="flex-1 w-full sm:w-auto space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs font-medium">Week Starting</Label>
                                        <span className="text-[10px] text-muted-foreground">
                                            {period.startDate && period.endDate ?
                                                `${period.startDate.split('-').slice(1).join('/')} - ${period.endDate.split('-').slice(1).join('/')}` :
                                                '(Select date)'}
                                        </span>
                                    </div>
                                    <DatePicker
                                        date={period.startDate}
                                        setDate={(d) => updatePeriod(period.id, 'startDate', d ? d.toISOString().split('T')[0] : "")}
                                        placeholder="Pick start date"
                                        className="w-full"
                                        disabledDates={(d) => isDateDisabled(d, period.id)}
                                    />
                                </div>
                                <div className="w-full sm:w-40 space-y-1.5">
                                    <Label className="text-xs font-medium">Amount (€)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            value={period.amount}
                                            onChange={(e) => updatePeriod(period.id, 'amount', e.target.value)}
                                            className="w-full"
                                        />
                                        {periods.length > 1 && (
                                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 shrink-0" onClick={() => removePeriod(period.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 border-dashed">
                                    <Filter className="mr-2 h-4 w-4" />
                                    Departments
                                    {selectedDeptIds.length > 0 && (
                                        <Badge variant="secondary" className="ml-2 rounded-sm px-1 font-normal">
                                            {selectedDeptIds.length}
                                        </Badge>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0" align="start">
                                <div className="p-2 space-y-2">
                                    {departments.map((dept) => (
                                        <div key={dept._id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={dept._id}
                                                checked={selectedDeptIds.includes(dept._id)}
                                                onCheckedChange={() => toggleDept(dept._id)}
                                            />
                                            <label htmlFor={dept._id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                                                {dept.name}
                                            </label>
                                        </div>
                                    ))}
                                    {departments.length === 0 && <div className="text-xs text-muted-foreground p-2">No departments found</div>}
                                </div>
                            </PopoverContent>
                        </Popover>

                        <div className="flex items-center space-x-2 border-l pl-4">
                            <Switch id="rounding" checked={roundingEnabled} onCheckedChange={setRoundingEnabled} />
                            <Label htmlFor="rounding" className="text-sm font-medium cursor-pointer">Cash Rounding (0.50)</Label>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="text-xs text-muted-foreground uppercase font-bold">Total Pool</div>
                        <div className="text-2xl font-bold text-primary">€{totalInput.toFixed(2)}</div>
                    </div>
                </div>

                {!records && (
                    <Button onClick={handleCalculate} disabled={loading} className="w-full h-12 text-lg shadow-lg">
                        {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        Calculate Distribution
                    </Button>
                )}

                {/* Results */}
                {records && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                            <div className="p-4 bg-muted/40 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <h3 className="font-semibold">Distribution Preview</h3>
                                <div className={variance !== 0 ? "text-destructive font-mono text-sm" : "text-emerald-600 font-mono text-sm"}>
                                    Variance: €{variance.toFixed(2)}
                                </div>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                Weight
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="cursor-help inline-flex items-center ml-1">
                                                                <Info className="h-3 w-3 text-muted-foreground" />
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p className="text-xs">Based on shift duration:<br />&lt;7h = 0.5<br />7-10h = 1.0<br />10-12.5h = 1.5<br />&gt;12.5h = 2.0</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        </TableHead>
                                        <TableHead className="w-[100px] text-center">Adjust</TableHead>
                                        <TableHead className="text-center w-[100px]">Status</TableHead>
                                        <TableHead className="text-right">Payout</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {records.map((r, i) => (
                                        <TableRow key={r.employeeId}>
                                            <TableCell className="font-medium">
                                                {r.employeeName}
                                                {r.periodDetails && r.periodDetails.length > 1 && (
                                                    <div className="text-[10px] text-muted-foreground">
                                                        Active in {r.periodDetails.length} periods
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center font-mono text-muted-foreground">
                                                {r.calculatedShares.toFixed(1)}
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    step="0.5"
                                                    className="h-8 w-20 text-center mx-auto"
                                                    value={r.adjustedShares}
                                                    onChange={(e) => handleAdjustShare(i, e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div
                                                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer ${r.status === 'paid' ? 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80' : 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                                                    onClick={() => {
                                                        const newRecords = [...records];
                                                        newRecords[i].status = r.status === 'paid' ? 'pending' : 'paid';
                                                        setRecords(newRecords);
                                                    }}
                                                >
                                                    {r.status === 'paid' ? 'Paid' : 'Pending'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-lg">
                                                €{r.finalAmount.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex gap-2 justify-end pt-4">
                            {initialData && onCancel && (
                                <Button variant="outline" onClick={onCancel}>Cancel Edit</Button>
                            )}
                            <Button variant="outline" onClick={() => setRecords(null)}>Back to Config</Button>
                            <Button onClick={handleSave} disabled={saving} className="min-w-[150px]">
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" /> {initialData ? "Update Distribution" : "Finalize & Save"}
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
