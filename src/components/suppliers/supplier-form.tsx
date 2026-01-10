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
        items: supplier?.items || []
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
