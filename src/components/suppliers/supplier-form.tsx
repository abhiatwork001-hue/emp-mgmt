"use client";

import { useState } from "react";
import { createSupplier, updateSupplier } from "@/lib/actions/supplier.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SupplierFormProps {
    supplier?: any;
    onSuccess: () => void;
}

export function SupplierForm({ supplier, onSuccess }: SupplierFormProps) {
    const isEdit = !!supplier;
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: supplier?.name || "",
        contactPerson: supplier?.contactPerson || "",
        phoneNumber: supplier?.phoneNumber || "",
        email: supplier?.email || "",
        address: supplier?.address || "",
        category: supplier?.category || "",
        items: supplier?.items || [],
        deliverySchedule: supplier?.deliverySchedule || []
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { name: "", sku: "", category: "", unit: "", price: 0 }]
        }));
    };

    const removeItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_: any, i: number) => i !== index)
        }));
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map((item: any, i: number) => i === index ? { ...item, [field]: value } : item)
        }));
    };

    // --- Schedule Logic ---
    const addSchedule = () => {
        setFormData(prev => ({
            ...prev,
            deliverySchedule: [...(prev.deliverySchedule || []), { dayOfWeek: 1, orderCutoff: { leadDays: 1, time: "17:00" } }]
        }));
    };

    const removeSchedule = (index: number) => {
        setFormData(prev => ({
            ...prev,
            deliverySchedule: prev.deliverySchedule.filter((_: any, i: number) => i !== index)
        }));
    };

    const handleScheduleChange = (index: number, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            deliverySchedule: prev.deliverySchedule.map((item: any, i: number) => {
                if (i !== index) return item;
                if (field === "dayOfWeek") return { ...item, dayOfWeek: parseInt(value) };
                if (field === "leadDays") return { ...item, orderCutoff: { ...item.orderCutoff, leadDays: parseInt(value) } };
                if (field === "time") return { ...item, orderCutoff: { ...item.orderCutoff, time: value } };
                return item;
            })
        }));
    };

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (isEdit) {
                await updateSupplier(supplier._id, formData);
                toast.success("Supplier updated");
            } else {
                await createSupplier(formData);
                toast.success("Supplier created");
            }
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error("Failed to save supplier");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Company Name *</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} required placeholder="e.g. Sysco" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input id="category" name="category" value={formData.category} onChange={handleChange} placeholder="e.g. Food, Maintenance" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input id="contactPerson" name="contactPerson" value={formData.contactPerson} onChange={handleChange} placeholder="Sales Rep Name" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input id="phoneNumber" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="+1 ..." />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" value={formData.email} onChange={handleChange} placeholder="orders@..." />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" name="address" value={formData.address} onChange={handleChange} placeholder="Warehouse Location" />
                </div>
            </div>

            {/* Delivery Schedule Section */}
            <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                    <div className="space-y-1">
                        <Label className="text-base font-semibold">Delivery Schedule / Order Reminders</Label>
                        <p className="text-xs text-muted-foreground">Configure recurring delivery days and set when you need to order by.</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addSchedule} className="gap-1">
                        <Plus className="w-4 h-4" /> Add Schedule
                    </Button>
                </div>

                <div className="space-y-3">
                    <AnimatePresence>
                        {(formData.deliverySchedule || []).map((schedule: any, index: number) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="grid grid-cols-12 gap-2 items-end bg-orange-50/50 dark:bg-orange-950/10 p-3 rounded-lg border border-orange-200/50 dark:border-orange-900/50"
                            >
                                <div className="col-span-12 md:col-span-4 space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Delivery Day</Label>
                                    <select
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        value={schedule.dayOfWeek}
                                        onChange={(e) => handleScheduleChange(index, "dayOfWeek", e.target.value)}
                                    >
                                        {days.map((day, i) => (
                                            <option key={i} value={i}>{day}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-5 md:col-span-3 space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Lead Days</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            min="0"
                                            max="14"
                                            value={schedule.orderCutoff?.leadDays}
                                            onChange={(e) => handleScheduleChange(index, "leadDays", e.target.value)}
                                            className="h-9"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">days before</span>
                                    </div>
                                </div>
                                <div className="col-span-5 md:col-span-3 space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Cutoff Time</Label>
                                    <Input
                                        type="time"
                                        value={schedule.orderCutoff?.time}
                                        onChange={(e) => handleScheduleChange(index, "time", e.target.value)}
                                        className="h-9"
                                    />
                                </div>

                                <div className="col-span-2 md:col-span-1 flex justify-end">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeSchedule(index)} className="h-9 w-9 text-destructive hover:bg-destructive/10">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>

                                {/* Helper Text based on selection */}
                                <div className="col-span-12 text-[10px] text-muted-foreground italic pt-1">
                                    Example: Deliver on <strong>{days[schedule.dayOfWeek]}</strong> requires ordering by <strong>{schedule.orderCutoff?.time}</strong> on <strong>{
                                        days[(schedule.dayOfWeek - (schedule.orderCutoff?.leadDays || 0) + 7) % 7]
                                    }</strong>.
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {(formData.deliverySchedule || []).length === 0 && (
                        <div className="text-center py-4 text-sm text-muted-foreground italic bg-muted/20 rounded-lg">
                            No delivery schedule set.
                        </div>
                    )}
                </div>
            </div>

            <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                    <Label className="text-base font-semibold">Catalog Items</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                        <Plus className="w-4 h-4" /> Add Item
                    </Button>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    <AnimatePresence>
                        {formData.items.map((item: any, index: number) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="grid grid-cols-12 gap-2 items-end bg-muted/40 p-3 rounded-lg border"
                            >
                                <div className="col-span-5 space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Item Name</Label>
                                    <Input value={item.name} onChange={(e) => handleItemChange(index, "name", e.target.value)} placeholder="Item Name" className="h-8 text-sm" />
                                </div>
                                <div className="col-span-3 space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">SKU / Unit</Label>
                                    <Input value={item.unit} onChange={(e) => handleItemChange(index, "unit", e.target.value)} placeholder="Unit (kg/box)" className="h-8 text-sm" />
                                </div>
                                <div className="col-span-3 space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Price</Label>
                                    <Input type="number" value={item.price} onChange={(e) => handleItemChange(index, "price", parseFloat(e.target.value))} placeholder="0.00" className="h-8 text-sm" />
                                </div>
                                <div className="col-span-1">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {formData.items.length === 0 && (
                        <div className="text-center py-6 text-sm text-muted-foreground italic bg-muted/20 rounded-lg">
                            No items added yet.
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                    {isLoading ? "Saving..." : (isEdit ? "Update Supplier" : "Create Supplier")}
                </Button>
            </div>
        </form>
    );
}
