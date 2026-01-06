"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calculator, DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfitSimulatorProps {
    baseCost: number;       // Total Food Cost
    pvp: number;           // Selling Price (inc Tax)
    taxRatePercent: number;// e.g. 13 or 23
}

export function ProfitSimulator({ baseCost, pvp, taxRatePercent }: ProfitSimulatorProps) {
    const [discountPercent, setDiscountPercent] = useState(0);
    const [commissionPercent, setCommissionPercent] = useState(0); // e.g. 30% for UberEats
    const [fixedFee, setFixedFee] = useState(0); // e.g. 2€ delivery fee subsidy

    // Calculations
    const taxRate = taxRatePercent / 100;

    // 1. Discounted Price (What customer pays)
    const discountedPvp = pvp * (1 - discountPercent / 100);

    // 2. Remove Tax to get Net Sales
    const netSales = discountedPvp / (1 + taxRate);

    // 3. Platform Commissions (Usually calculated on the Gross Discounted Price)
    const commissionAmount = discountedPvp * (commissionPercent / 100);

    // 4. Fixed Fees
    const totalDeductions = commissionAmount + fixedFee;

    // 5. Effective Revenue (Net Sales - Operational Deductions converted to Net)
    const effectiveRevenue = netSales - (totalDeductions / (1 + taxRate));

    const profit = effectiveRevenue - baseCost;
    // Food Cost % is typically (Cost / Net Sales)
    const newFoodCostPercent = netSales > 0 ? (baseCost / netSales) * 100 : 0;

    // Break-even check
    const isLoss = profit < 0;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 w-full md:w-auto font-black italic tracking-tight border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-all active:scale-95 shadow-sm">
                    <Calculator className="w-4 h-4" />
                    Open Simulator
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Calculator className="h-4 w-4" />
                        </div>
                        <DialogTitle className="text-xl font-black italic tracking-tight">Scenario Simulator</DialogTitle>
                    </div>
                    <DialogDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        Calculate margins for promotions & delivery
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Inputs */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Discount %</Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    value={discountPercent}
                                    onChange={e => setDiscountPercent(parseFloat(e.target.value) || 0)}
                                    className="h-10 font-bold bg-muted/30 border-border/50 focus:bg-background transition-all"
                                />
                                <span className="absolute right-2 top-2.5 text-[10px] font-black text-muted-foreground/50">%</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Platform %</Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    value={commissionPercent}
                                    onChange={e => setCommissionPercent(parseFloat(e.target.value) || 0)}
                                    className="h-10 font-bold bg-muted/30 border-border/50 focus:bg-background transition-all"
                                />
                                <span className="absolute right-2 top-2.5 text-[10px] font-black text-muted-foreground/50">%</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Fixed Fee €</Label>
                            <Input
                                type="number"
                                value={fixedFee}
                                onChange={e => setFixedFee(parseFloat(e.target.value) || 0)}
                                className="h-10 font-bold bg-muted/30 border-border/50 focus:bg-background transition-all"
                            />
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-muted-foreground uppercase">Target Price</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground line-through decoration-red-500/50">{pvp.toFixed(2)}€</span>
                                <span className="text-sm font-black italic text-foreground">{discountedPvp.toFixed(2)}€</span>
                            </div>
                        </div>
                        <Separator className="bg-border/40" />
                        <div className="space-y-2">
                            <div className="flex justify-between text-[11px] font-bold">
                                <span className="text-muted-foreground">Tax ({taxRatePercent}%)</span>
                                <span className="text-red-500/80">-{((discountedPvp - netSales)).toFixed(2)}€</span>
                            </div>
                            <div className="flex justify-between text-[11px] font-bold">
                                <span className="text-muted-foreground">Commissions & Fees</span>
                                <span className="text-orange-500/80">-{totalDeductions.toFixed(2)}€</span>
                            </div>
                            <div className="flex justify-between text-[11px] font-bold">
                                <span className="text-muted-foreground">Base Food Cost</span>
                                <span className="text-blue-500/80">-{baseCost.toFixed(2)}€</span>
                            </div>
                        </div>
                    </div>

                    <div className={cn(
                        "p-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all duration-500",
                        isLoss
                            ? "bg-red-500/5 border-red-500/20 text-red-600 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                            : "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                    )}>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Net Profit Per Unit</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black italic tracking-tighter">{profit.toFixed(2)}</span>
                            <span className="text-xl font-black italic">€</span>
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-[11px] font-black italic uppercase tracking-tight opacity-80">
                            <div className="flex items-center gap-1">
                                <TrendingUp className={cn("h-3 w-3", isLoss && "rotate-180")} />
                                Food Cost: {newFoodCostPercent.toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
