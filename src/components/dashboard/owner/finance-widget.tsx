"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, DollarSign } from "lucide-react";

interface FinanceProps {
    data: {
        weekCost: number;
        budgetVariance: number;
    };
}

export function FinanceWidget({ data }: FinanceProps) {
    const isOverBudget = data.budgetVariance > 0;

    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Labor Cost (Est.)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold mb-1">
                    €{data.weekCost.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mb-4">Current Week Estimate</p>

                <div className={`p-3 rounded-md border flex items-center justify-between ${isOverBudget ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-green-500/10 border-green-500/20 text-green-500'}`}>
                    <span className="text-sm font-medium">Vs Budget</span>
                    <div className="flex items-center font-bold">
                        {isOverBudget ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                        {data.budgetVariance > 0 ? '+' : ''}{data.budgetVariance}%
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
