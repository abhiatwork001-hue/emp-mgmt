"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Calendar, ShoppingCart, AlertTriangle } from "lucide-react";
import { generateOrderPlan, SupplierPlan } from "@/lib/actions/planner.actions";
import { format } from "date-fns";
import { toast } from "sonner";

export function SmartOrderPlanner({ storeId }: { storeId: string }) {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [plans, setPlans] = useState<SupplierPlan[]>([]);
    const [unmapped, setUnmapped] = useState<string[]>([]);

    const handlePlan = async () => {
        if (!input.trim()) return;
        setLoading(true);
        try {
            const items = input.split(",").map(i => i.trim()).filter(Boolean);
            const res = await generateOrderPlan(items, storeId);
            setPlans(res.plans);
            setUnmapped(res.unmapped);
            if (res.plans.length === 0 && res.unmapped.length > 0) {
                toast.warning("Could not match items to suppliers");
            } else {
                toast.success(`Generated plan for ${res.plans.length} orders`);
            }
        } catch (error) {
            toast.error("Failed to generate plan");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Smart Order Planner
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-indigo-500" />
                        Smart Order Planner
                    </DialogTitle>
                    <DialogDescription>
                        Paste your shopping list (comma separated) and we'll tell you who and when to order from.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Textarea
                            placeholder="e.g. Tomatoes, Napkins, Fries, Lettuce, Bleach"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="min-h-[100px]"
                        />
                        <div className="flex justify-end">
                            <Button onClick={handlePlan} disabled={loading || !input.trim()}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                                Generate Plan
                            </Button>
                        </div>
                    </div>

                    {plans.length > 0 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h3 className="text-lg font-semibold">Your Plan</h3>
                            <div className="grid gap-4 md:grid-cols-2">
                                {plans.map((plan) => (
                                    <Card key={plan.supplierId} className="border-l-4 border-l-indigo-500">
                                        <CardHeader className="py-3 bg-muted/20">
                                            <CardTitle className="text-base flex justify-between items-center">
                                                <span>{plan.supplierName}</span>
                                                <Badge variant={plan.minOrderValue ? "outline" : "secondary"}>
                                                    Min: {plan.minOrderValue ? `$${plan.minOrderValue}` : "None"}
                                                </Badge>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-4 space-y-3">
                                            <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                                                <AlertTriangle className="h-4 w-4" />
                                                Order Deadline: {format(new Date(plan.orderDeadline), "MMM d, h:mm a")}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Calendar className="h-3 w-3" />
                                                Expected Delivery: {format(new Date(plan.deliveryDate), "EEEE, MMM d")}
                                            </div>

                                            <div className="border-t pt-2 mt-2">
                                                <span className="text-xs font-semibold text-muted-foreground uppercase">Items</span>
                                                <ul className="mt-1 space-y-1">
                                                    {plan.items.map((item, idx) => (
                                                        <li key={idx} className="text-sm flex items-center justify-between">
                                                            <span>{item.found}</span>
                                                            {item.searched.toLowerCase() !== item.found.toLowerCase() && (
                                                                <span className="text-xs text-muted-foreground italic">({item.searched})</span>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {unmapped.length > 0 && (
                        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                            <h4 className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-2 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                Items not matching suppliers
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {unmapped.map((item, i) => (
                                    <Badge key={i} variant="outline" className="bg-white dark:bg-transparent border-orange-300">
                                        {item}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
