"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DatePicker } from "@/components/ui/date-picker";
import { calculatePotentialDistribution, saveTipsDistribution } from "@/lib/actions/tips.actions";
import { toast } from "sonner";
import { Loader2, DollarSign, Calculator, Save } from "lucide-react";
import { format } from "date-fns";

interface TipsCalculatorProps {
    storeId: string;
    userId: string;
    onSuccess?: () => void;
}

export function TipsCalculator({ storeId, userId, onSuccess }: TipsCalculatorProps) {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [totalAmount, setTotalAmount] = useState("");

    const [records, setRecords] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleCalculate = async () => {
        if (!startDate || !endDate || !totalAmount) return;
        setLoading(true);
        const res = await calculatePotentialDistribution(storeId, startDate, endDate, parseFloat(totalAmount));
        setLoading(false);

        if (res.success && res.records) {
            setRecords(res.records);
            toast.success("Calculation Complete");
        } else {
            toast.error("Calculation Failed");
        }
    };

    const handleAdjustShare = (index: number, val: string) => {
        if (!records) return;
        const newRecords = [...records];
        newRecords[index].adjustedShares = parseFloat(val) || 0;
        setRecords(newRecords);
    };

    const handleSave = async () => {
        if (!records) return;
        setSaving(true);

        // Calculate finals one last time to be sure
        const finalTotalShares = records.reduce((sum, r) => sum + r.adjustedShares, 0);
        const shareValue = finalTotalShares > 0 ? parseFloat(totalAmount) / finalTotalShares : 0;

        const finalRecords = records.map(r => ({
            ...r,
            finalAmount: (r.adjustedShares * shareValue).toFixed(2)
        }));

        const res = await saveTipsDistribution({
            storeId,
            userId,
            weekStartDate: startDate,
            weekEndDate: endDate,
            totalAmount: parseFloat(totalAmount),
            records: finalRecords
        });

        setSaving(false);
        if (res.success) {
            toast.success("Distribution Finalized");
            setRecords(null);
            setTotalAmount("");
            if (onSuccess) onSuccess();
        } else {
            toast.error("Failed to save");
        }
    };

    // Derived UI values
    const totalShares = records ? records.reduce((sum, r) => sum + r.adjustedShares, 0) : 0;
    const shareValue = totalShares > 0 ? (parseFloat(totalAmount) / totalShares).toFixed(2) : "0.00";

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Calculate Weekly Tips</CardTitle>
                <CardDescription>Select a week to auto-calculate shares based on shifts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                    <div className="space-y-2">
                        <Label>Week Start</Label>
                        <DatePicker
                            date={startDate}
                            setDate={(d) => setStartDate(d ? d.toISOString().split('T')[0] : "")}
                            placeholder="Select start date"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Week End</Label>
                        <DatePicker
                            date={endDate}
                            setDate={(d) => setEndDate(d ? d.toISOString().split('T')[0] : "")}
                            placeholder="Select end date"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Total Tips Amount ($)</Label>
                        <Input
                            type="number"
                            placeholder="0.00"
                            value={totalAmount}
                            onChange={e => setTotalAmount(e.target.value)}
                        />
                    </div>
                </div>

                {!records && (
                    <Button onClick={handleCalculate} disabled={loading || !startDate || !totalAmount} className="w-full">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Calculator className="mr-2 h-4 w-4" /> Calculate Shares
                    </Button>
                )}

                {records && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg">
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Total Shares</div>
                                <div className="text-2xl font-bold">{totalShares.toFixed(1)}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-medium text-muted-foreground">Value per Share</div>
                                <div className="text-2xl font-bold text-emerald-600">${shareValue}</div>
                            </div>
                        </div>

                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead className="text-center">Shifts</TableHead>
                                        <TableHead className="text-center">Calc. Shares</TableHead>
                                        <TableHead className="w-[100px]">Adjusted</TableHead>
                                        <TableHead className="text-right">Payout</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {records.map((r, i) => (
                                        <TableRow key={r.employeeId}>
                                            <TableCell className="font-medium">{r.employeeName}</TableCell>
                                            <TableCell className="text-center">{r.shiftsWorked}</TableCell>
                                            <TableCell className="text-center text-muted-foreground">{r.calculatedShares}</TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    step="0.5"
                                                    className="h-8 w-20"
                                                    value={r.adjustedShares}
                                                    onChange={(e) => handleAdjustShare(i, e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right font-bold">
                                                ${(r.adjustedShares * parseFloat(shareValue)).toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setRecords(null)}>Cancel</Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" /> Finalize Distribution
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
