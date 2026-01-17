"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

import { Search, ShoppingCart, Truck, AlertTriangle, CheckCircle, XCircle, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { verifyOrderOptimization } from "@/lib/actions/supplier.actions";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";

interface SmartOrderHelperProps {
    suppliers: any[]; // Full list of suppliers with items
    storeId: string;
}

export function SmartOrderHelper({ suppliers, storeId }: SmartOrderHelperProps) {
    const [open, setOpen] = useState(false);
    // Keep search state to limit the rendered list for performance
    const [searchTerm, setSearchTerm] = useState("");
    const [cart, setCart] = useState<{ itemId: string; name: string; supplier: string; price: number; quantity: number }[]>([]);
    const [optimizationPlan, setOptimizationPlan] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(false);

    // Flatten all items for search
    const allItems = useMemo(() => {
        const items: any[] = [];
        suppliers.forEach(s => {
            if (s.items) {
                s.items.forEach((i: any) => {
                    items.push({
                        ...i,
                        supplierName: s.name,
                        supplierId: s._id
                    });
                });
            }
        });
        return items;
    }, [suppliers]);

    const filteredItems = useMemo(() => {
        // If no search term, don't show everything (perf)
        if (!searchTerm) return [];
        return allItems.filter(i =>
            i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.sku?.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 20); // Limit results
    }, [allItems, searchTerm]);

    const addToCart = (item: any) => {
        setCart(prev => {
            const existing = prev.find(p => p.itemId === item._id);
            if (existing) {
                return prev.map(p => p.itemId === item._id ? { ...p, quantity: p.quantity + 1 } : p);
            }
            return [...prev, { itemId: item._id, name: item.name, supplier: item.supplierName, price: item.price || 0, quantity: 1 }];
        });
        setOptimizationPlan(null); // Reset plan on change
        setSearchTerm(""); // Clear search
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => prev.filter(p => p.itemId !== itemId));
        setOptimizationPlan(null);
    };

    const updateQuantity = (itemId: string, delta: number) => {
        setCart(prev => prev.map(p => {
            if (p.itemId === itemId) {
                const newQ = p.quantity + delta;
                return newQ > 0 ? { ...p, quantity: newQ } : p;
            }
            return p;
        }));
        setOptimizationPlan(null);
    };

    const handleOptimize = async () => {
        if (cart.length === 0) return;
        setLoading(true);
        try {
            const plan = await verifyOrderOptimization(storeId, cart.map(c => ({ itemId: c.itemId, quantity: c.quantity })));
            setOptimizationPlan(plan);
        } catch (error) {
            toast.error("Failed to optimize order", {
                description: "Please try again later."
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="default" className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                    <Truck className="h-4 w-4" />
                    Smart Order Planner
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] sm:max-w-[90vw] w-[90vw] h-[90vh] flex flex-col z-[200]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-indigo-500" />
                        Smart Order Planner
                    </DialogTitle>
                    <DialogDescription>
                        Build your list using the global catalog. We'll group them and tell you exactly when they will arrive.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-1 gap-6 min-h-0 overflow-hidden pt-4">
                    {/* LEFT: Search & Cart */}
                    <div className="w-1/2 flex flex-col gap-4 border-r pr-6 min-h-0 h-full">

                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-muted-foreground">
                                Catalog: {allItems.length} items | Matches: {filteredItems.length} | Term: "{searchTerm}"
                            </span>
                        </div>
                        <div className="border rounded-md p-0 overflow-hidden bg-background h-[300px] flex flex-col shadow-sm">
                            <Command shouldFilter={false} className="h-full">
                                <CommandInput
                                    placeholder="Search items (e.g. 'Cola', 'Frango')..."
                                    value={searchTerm}
                                    onValueChange={setSearchTerm}
                                    className="text-base"
                                />
                                <CommandList className="flex-1 overflow-y-auto min-h-[100px]">
                                    <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                                        {allItems.length === 0 ? "No items in catalog." : "No items found."}
                                    </CommandEmpty>

                                    {/* Render items directly without Group if filtering manually to avoid layout issues */}
                                    {searchTerm && filteredItems.length > 0 && (
                                        <div className="p-1">
                                            {filteredItems.map((item, i) => (
                                                <CommandItem
                                                    key={item._id || i}
                                                    value={item.name}
                                                    onSelect={() => addToCart(item)}
                                                    className="flex items-center justify-between cursor-pointer py-2 px-3 hover:bg-accent rounded-sm aria-selected:bg-accent"
                                                >
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="font-medium truncate">{item.name}</span>
                                                        <div className="flex gap-2 text-xs text-muted-foreground truncate">
                                                            <span>{item.sku || 'No SKU'}</span>
                                                            {item.supplierName && <span>• {item.supplierName}</span>}
                                                        </div>
                                                    </div>
                                                    <Button size="sm" variant="ghost" className="h-6 w-6 shrink-0 ml-2 p-0 opacity-50 hover:opacity-100">
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </CommandItem>
                                            ))}
                                        </div>
                                    )}

                                    {!searchTerm && (
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 p-4">
                                            <Search className="h-8 w-8 mb-2" />
                                            <p className="text-xs">Type to search catalog</p>
                                        </div>
                                    )}
                                </CommandList>
                            </Command>
                        </div>

                        <div className="flex-1 min-h-0 flex flex-col">
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <ShoppingCart className="h-4 w-4" /> Your Cart ({cart.length})
                            </h4>
                            <div className="flex-1 border rounded-md p-2 overflow-y-auto">
                                {cart.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                        Cart is empty.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {cart.map(item => (
                                            <div key={item.itemId} className="flex justify-between items-center bg-card p-2 rounded border shadow-sm group">
                                                <div className="truncate flex-1 mr-2">
                                                    <div className="text-sm font-medium truncate">{item.name}</div>
                                                    <div className="text-xs text-muted-foreground">{item.supplier}</div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQuantity(item.itemId, -1)}>-</Button>
                                                    <span className="text-sm w-4 text-center font-mono">{item.quantity}</span>
                                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQuantity(item.itemId, 1)}>+</Button>
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => removeFromCart(item.itemId)}>×</Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <Button onClick={handleOptimize} disabled={cart.length === 0 || loading} className="w-full h-11 text-base shadow-md bg-white text-black hover:bg-gray-200">
                            {loading ? "Generating Plan..." : "Generate Plan"}
                        </Button>
                    </div>

                    {/* RIGHT: Plan Results */}
                    <div className="w-1/2 flex flex-col gap-4 min-h-0 h-full">
                        <h4 className="text-sm font-medium">Optimization Plan</h4>
                        <div className="flex-1 pr-2 overflow-y-auto">
                            {!optimizationPlan ? (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed rounded-lg bg-muted/20 p-8 text-center">
                                    <div className="max-w-xs">
                                        <Truck className="h-0 w-0 mx-auto mb-3 opacity-20" /> {/* Fixed sized logic hidden */}
                                        <Truck className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                        <p>Add items to your cart and click "Analyze" to see how your orders will be grouped and scheduled.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {optimizationPlan.map((plan, idx) => (
                                        <Card key={idx} className={`border-l-4 shadow-sm ${plan.isMovMet ? 'border-l-green-500' : 'border-l-red-500'}`}>
                                            <CardContent className="p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <div className="font-bold text-lg">{plan.supplierName}</div>
                                                        <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                                            <Truck className="h-3.5 w-3.5" />
                                                            {plan.deliveryDate ? (
                                                                <span className="font-medium text-foreground">Delivery: {format(new Date(plan.deliveryDate), 'EEEE, MMM do')}</span>
                                                            ) : (
                                                                <span className="text-red-500">Schedule Warning</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {plan.isMovMet ? (
                                                        <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">MOV Met</Badge>
                                                    ) : (
                                                        <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">Shortfall €{plan.shortfall.toFixed(2)}</Badge>
                                                    )}
                                                </div>

                                                <Separator className="my-3" />

                                                <div className="space-y-1.5 mb-4">
                                                    {plan.items.map((pi: any, pid: number) => (
                                                        <div key={pid} className="flex justify-between text-sm group">
                                                            <div className="flex items-center gap-2">
                                                                <span className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{pi.quantity}x</span>
                                                                <span>{pi.productName}</span>
                                                            </div>
                                                            <span className="text-muted-foreground">€{(pi.totalLinePrice).toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="flex justify-between items-center text-sm font-medium bg-muted/40 p-3 rounded">
                                                    <span>Total Value</span>
                                                    <span className="text-base">€{plan.totalValue.toFixed(2)}</span>
                                                </div>

                                                {!plan.isMovMet && (
                                                    <div className="mt-3 p-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded flex items-center gap-2">
                                                        <AlertTriangle className="h-4 w-4 shrink-0" />
                                                        <span>Minimum order value is €{plan.mov}. You need €{plan.shortfall.toFixed(2)} more.</span>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
