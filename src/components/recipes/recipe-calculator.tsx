"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calculator, RotateCcw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RecipeCalculatorProps {
    ingredients: any[];
    baseDoses: number;
    baseCost: number;
    yieldAmount?: number;
    yieldUnit?: string;
    portionsInHouse?: number;
    portionsTakeAway?: number;
    hideFinancials?: boolean;
}

export function RecipeCalculator({
    ingredients,
    baseDoses,
    baseCost,
    yieldAmount,
    yieldUnit,
    portionsInHouse,
    portionsTakeAway,
    hideFinancials = false
}: RecipeCalculatorProps) {
    const [targetDoses, setTargetDoses] = useState(baseDoses);
    const [multiplier, setMultiplier] = useState(1);

    // Mode: 'doses' (scale by target info) or 'multiplier' (scale by factor) or 'ingredient' (scale by available stock)
    const [mode, setMode] = useState<'doses' | 'multiplier' | 'ingredient'>('doses');

    // For 'ingredient' mode interaction
    const [editingIngIndex, setEditingIngIndex] = useState<number | null>(null);

    const round3 = (num: number) => Math.round(num * 1000) / 1000;

    useEffect(() => {
        // Reset scale when ingredients change significantly
        reset();
    }, [ingredients]);

    const reset = () => {
        setMultiplier(1);
        setTargetDoses(baseDoses);
        setEditingIngIndex(null);
    };

    const handleDoseChange = (val: number) => {
        setTargetDoses(val);
        if (baseDoses > 0) {
            // Calculate multiplier with precision
            const m = val / baseDoses;
            setMultiplier(m); // Keep multiplier precise internally
        }
    };

    const handleMultiplierChange = (val: number) => {
        setMultiplier(val);
        setTargetDoses(round3(baseDoses * val));
    };

    const handleIngredientScale = (index: number, val: number) => {
        const base = ingredients[index].amount;
        if (base > 0) {
            const m = val / base;
            setMultiplier(m);
            setTargetDoses(round3(baseDoses * m));
        }
    };

    return (
        <div className="h-full flex flex-col bg-card">
            {/* Controls */}
            <div className="p-4 bg-muted/30 space-y-4 border-b border-border">
                <Tabs value={mode} onValueChange={(v: any) => { setMode(v); setEditingIngIndex(null); }} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="doses">By Doses</TabsTrigger>
                        <TabsTrigger value="multiplier">Factor (x)</TabsTrigger>
                        <TabsTrigger value="ingredient">By Ingredient</TabsTrigger>
                    </TabsList>

                    <div className="mt-4 flex items-center gap-4">
                        {mode === 'doses' && (
                            <div className="space-y-1 flex-1">
                                <Label className="text-xs uppercase text-muted-foreground font-bold">Target Yield</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        value={targetDoses}
                                        onChange={e => handleDoseChange(parseFloat(e.target.value) || 0)}
                                        className="text-lg font-bold"
                                        step="0.1"
                                    />
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        (Base: {baseDoses})
                                    </span>
                                </div>
                            </div>
                        )}

                        {mode === 'multiplier' && (
                            <div className="space-y-1 flex-1">
                                <Label className="text-xs uppercase text-muted-foreground font-bold">Multiplier Factor</Label>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold text-primary">x</span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={round3(multiplier)}
                                        onChange={e => handleMultiplierChange(parseFloat(e.target.value) || 0)}
                                        className="text-lg font-bold"
                                    />
                                </div>
                            </div>
                        )}

                        {mode === 'ingredient' && (
                            <div className="flex-1 p-2 bg-background border rounded-md">
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">i</span>
                                    Click on any ingredient amount below to scale.
                                </p>
                            </div>
                        )}

                        <Button variant="ghost" size="icon" onClick={reset} title="Reset">
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                    </div>
                </Tabs>
            </div>

            {/* Scaled List */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
                <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase border-b border-border pb-2">
                    <span>Ingredient</span>
                    <span>Required Amount</span>
                </div>

                <ul className="space-y-3">
                    {ingredients.map((ing, i) => {
                        const scaledAmount = round3(ing.amount * multiplier);
                        const isEditing = mode === 'ingredient' && editingIngIndex === i;

                        return (
                            <li key={i} className="flex justify-between items-center text-sm border-b border-dashed border-muted last:border-0 pb-1 last:pb-0">
                                <span className="font-medium text-gray-700">{ing.name}</span>
                                <div className="text-right flex items-center gap-1 justify-end">
                                    {isEditing ? (
                                        <Input
                                            type="number"
                                            step="0.001"
                                            autoFocus
                                            className="w-24 h-8 text-right font-bold"
                                            defaultValue={scaledAmount}
                                            onChange={(e) => handleIngredientScale(i, parseFloat(e.target.value) || 0)}
                                            onBlur={() => setEditingIngIndex(null)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') setEditingIngIndex(null);
                                            }}
                                        />
                                    ) : (
                                        <div
                                            className={`font-bold text-base ${mode === 'ingredient' ? 'cursor-pointer hover:text-primary hover:underline decoration-dashed decoration-primary/50' : ''}`}
                                            onClick={() => mode === 'ingredient' && setEditingIngIndex(i)}
                                            title={mode === 'ingredient' ? "Click to scale recipe by this ingredient" : ""}
                                        >
                                            <span className="text-primary">
                                                {scaledAmount.toFixed(3).replace(/\.?0+$/, "")}
                                            </span>
                                        </div>
                                    )}
                                    <span className="text-muted-foreground ml-1 text-xs uppercase w-8">{ing.unit}</span>
                                </div>
                            </li>
                        );
                    })}
                </ul>

                <Separator />

                <div className="pt-2 space-y-4">
                    {/* Financial Overview (Restricted) */}
                    {!hideFinancials && (
                        <div className="flex justify-between items-center bg-muted/30 p-2 rounded">
                            <span className="text-sm font-bold text-muted-foreground uppercase">Estimated Cost</span>
                            <span className="font-bold text-lg">
                                {round3(baseCost * multiplier).toFixed(2)}€
                            </span>
                        </div>
                    )}

                    {/* Yield & Portions Breakdown (Public Operation Info) */}
                    <div className="text-sm space-y-3 px-2">
                        {(yieldAmount || 0) > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Total Output:</span>
                                <span className="font-medium">
                                    {round3(yieldAmount! * multiplier).toFixed(3).replace(/\.?0+$/, "")} {yieldUnit}
                                </span>
                            </div>
                        )}

                        {/* In House Portions */}
                        {(portionsInHouse || 0) > 0 && (yieldAmount || 0) > 0 && (
                            <div className="flex justify-between items-center border-t pt-2 border-dashed">
                                <div>
                                    <span className="block font-medium text-foreground">In House Serving</span>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                            {portionsInHouse} {yieldUnit} / portion
                                        </span>
                                        <span className="text-muted-foreground">
                                            ({round3((yieldAmount! * multiplier) / portionsInHouse!).toFixed(1)} portions)
                                        </span>
                                    </div>
                                </div>
                                {!hideFinancials && (
                                    <div className="text-right">
                                        <span className="block font-bold text-primary">
                                            {round3((baseCost * portionsInHouse!) / yieldAmount!).toFixed(2)}€
                                        </span>
                                        <span className="text-[10px] uppercase text-muted-foreground">Cost / Portion</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Take Away Portions */}
                        {(portionsTakeAway || 0) > 0 && (yieldAmount || 0) > 0 && (
                            <div className="flex justify-between items-center border-t pt-2 border-dashed">
                                <div>
                                    <span className="block font-medium text-foreground">Take Away (To-Go)</span>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                                            {portionsTakeAway} {yieldUnit} / portion
                                        </span>
                                        <span className="text-muted-foreground">
                                            ({round3((yieldAmount! * multiplier) / portionsTakeAway!).toFixed(1)} portions)
                                        </span>
                                    </div>
                                </div>
                                {!hideFinancials && (
                                    <div className="text-right">
                                        <span className="block font-bold text-primary">
                                            {round3((baseCost * portionsTakeAway!) / yieldAmount!).toFixed(2)}€
                                        </span>
                                        <span className="text-[10px] uppercase text-muted-foreground">Cost / Portion</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
