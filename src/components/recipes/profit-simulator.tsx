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

    // 5. Real Revenue (Net Sales - Operational Deductions)
    // * Debatable if commission should be deducted here for "Food Cost %" but usually Owners want to see "Pocket Money vs Cost".
    const realRevenue = netSales - (totalDeductions / (1 + taxRate)); // Assuming fee is also gross? simplifying: treat fee as direct expense
    // Let's stick to: Profit = Net Sales - Food Cost - Commission(ex tax?).
    // Simplest view:
    // Money resulting from sale (ex tax)

    const effectiveRevenue = netSales - (commissionAmount / (1 + taxRate)) - fixedFee;

    const profit = effectiveRevenue - baseCost;
    const newMarginPercent = effectiveRevenue > 0 ? (profit / effectiveRevenue) * 100 : -100;
    const newFoodCostPercent = effectiveRevenue > 0 ? (baseCost / effectiveRevenue) * 100 : 1000;

    // Break-even check
    const isLoss = profit < 0;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 w-full md:w-auto text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100">
                    <Calculator className="w-4 h-4" />
                    Profit Simulator
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Profitability Simulator</DialogTitle>
                    <DialogDescription>
                        Simulate discounts and delivery commissions to see real margins.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Inputs */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs">Discount %</Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    value={discountPercent}
                                    onChange={e => setDiscountPercent(parseFloat(e.target.value) || 0)}
                                    className="bg-red-50 text-red-600 font-bold"
                                />
                                <span className="absolute right-2 top-2.5 text-xs text-red-400">%</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Platform %</Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    value={commissionPercent}
                                    onChange={e => setCommissionPercent(parseFloat(e.target.value) || 0)}
                                    className="bg-orange-50 text-orange-600 font-bold"
                                />
                                <span className="absolute right-2 top-2.5 text-xs text-orange-400">%</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Fixed Fee €</Label>
                            <Input
                                type="number"
                                value={fixedFee}
                                onChange={e => setFixedFee(parseFloat(e.target.value) || 0)}
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* Results */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Original PVP</span>
                            <span className="font-medium text-muted-foreground line-through">{pvp.toFixed(2)}€</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold">New PVP (Customer Pays)</span>
                            <span className="font-bold">{discountedPvp.toFixed(2)}€</span>
                        </div>

                        <div className="bg-muted/30 p-3 rounded-md space-y-2 text-sm">
                            <div className="flex justify-between text-red-500">
                                <span>- Tax ({taxRatePercent}%)</span>
                                <span>{((discountedPvp - netSales)).toFixed(2)}€</span>
                            </div>
                            <div className="flex justify-between text-orange-500">
                                <span>- Commission & Fees</span>
                                <span>{(commissionAmount + fixedFee).toFixed(2)}€</span>
                            </div>
                            <Separator className="bg-muted" />
                            <div className="flex justify-between font-bold text-base">
                                <span>Effective Revenue</span>
                                <span>{effectiveRevenue.toFixed(2)}€</span>
                            </div>
                            <div className="flex justify-between text-blue-600">
                                <span>- Food Cost</span>
                                <span>{baseCost.toFixed(2)}€</span>
                            </div>
                        </div>

                        <div className={`p-4 rounded-md flex items-center justify-between border ${isLoss ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                            <div>
                                <p className="text-xs uppercase font-bold opacity-70">Net Profit</p>
                                <p className="text-2xl font-black">{profit.toFixed(2)}€</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs uppercase font-bold opacity-70">Real Cost %</p>
                                <p className="text-xl font-bold">{newFoodCostPercent.toFixed(1)}%</p>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
