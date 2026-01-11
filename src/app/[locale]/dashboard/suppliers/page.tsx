"use client";

import { useState, useEffect } from "react";
import { getSuppliers, deleteSupplier } from "@/lib/actions/supplier.actions";
import { Button } from "@/components/ui/button";
import { Plus, Search, Phone, Mail, MapPin, Trash2, Edit2, Package, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { SupplierForm } from "@/components/suppliers/supplier-form";

export default function SuppliersPage() {
    const { data: session } = useSession();
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<any>(null);

    const userRoles = (session?.user as any)?.roles || [];
    const canManage = userRoles.some((r: string) => ["admin", "owner", "hr", "store_manager"].includes(r.toLowerCase()));

    const fetchSuppliers = async () => {
        setIsLoading(true);
        try {
            const data = await getSuppliers();
            setSuppliers(data);
        } catch (error) {
            console.error("Failed to fetch suppliers", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}?`)) return;
        try {
            await deleteSupplier(id);
            toast.success("Supplier deleted");
            fetchSuppliers();
        } catch (error) {
            toast.error("Failed to delete supplier");
        }
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.items?.some((i: any) => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-white dark:to-gray-400">
                        Supplier Management
                    </h1>
                    <p className="text-muted-foreground mt-1">Manage network of suppliers and order catalogs.</p>
                </div>

                {canManage && (
                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) setEditingSupplier(null);
                    }}>
                        <DialogTrigger asChild>
                            <Button className="shrink-0 gap-2 shadow-lg shadow-primary/20">
                                <Plus className="w-4 h-4" /> Add Supplier
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>{editingSupplier ? "Edit Supplier" : "Add New Supplier"}</DialogTitle>
                            </DialogHeader>
                            <SupplierForm
                                supplier={editingSupplier}
                                onSuccess={() => {
                                    setIsDialogOpen(false);
                                    fetchSuppliers();
                                    setEditingSupplier(null);
                                }}
                            />
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name, category, or item..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 bg-muted/40 border-muted-foreground/20 focus:bg-background transition-all"
                />
            </div>

            {/* List */}
            {isLoading ? (
                <div className="text-center py-20 text-muted-foreground">Loading suppliers...</div>
            ) : filteredSuppliers.length === 0 ? (
                <div className="text-center py-20 bg-muted/20 rounded-2xl border border-dashed">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">No suppliers found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {filteredSuppliers.map((supplier) => (
                            <motion.div
                                key={supplier._id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                            >
                                <Link href={`/dashboard/suppliers/${supplier._id}`} className="block h-full cursor-pointer">
                                    <Card className="h-full hover:shadow-lg transition-all border-border/50 bg-background/50 backdrop-blur-sm group overflow-hidden hover:border-primary/50">
                                        <div className="h-2 bg-gradient-to-r from-primary/50 to-purple-500/50 w-full" />
                                        <CardContent className="p-6 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{supplier.name}</h3>
                                                    {supplier.category && (
                                                        <Badge variant="secondary" className="mt-1 text-xs font-medium">
                                                            {supplier.category}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {canManage && (
                                                    <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 z-10 relative"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setEditingSupplier(supplier);
                                                                setIsDialogOpen(true);
                                                            }}
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10 z-10 relative"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                handleDelete(supplier._id, supplier.name);
                                                            }}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-2 text-sm text-muted-foreground">
                                                {supplier.contactPerson && (
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-3.5 h-3.5" />
                                                        <span>{supplier.contactPerson}</span>
                                                    </div>
                                                )}
                                                {supplier.phoneNumber && (
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="w-3.5 h-3.5" />
                                                        <span>{supplier.phoneNumber}</span>
                                                    </div>
                                                )}
                                                {supplier.email && (
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="w-3.5 h-3.5" />
                                                        <span>{supplier.email}</span>
                                                    </div>
                                                )}
                                                {supplier.address && (
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-3.5 h-3.5" />
                                                        <span className="truncate">{supplier.address}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Min Order Badge */}
                                            {supplier.minimumOrderValue > 0 && (
                                                <div className="flex justify-end">
                                                    <div className="font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded text-xs">
                                                        Min: €{supplier.minimumOrderValue}
                                                    </div>
                                                </div>
                                            )}

                                            {supplier.items?.length > 0 && (
                                                <div className="pt-4 border-t border-border/40">
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Top Items</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {supplier.items.slice(0, 3).map((item: any, idx: number) => (
                                                            <Badge key={idx} variant="outline" className="bg-muted/30 font-normal">
                                                                {item.name}
                                                            </Badge>
                                                        ))}
                                                        {supplier.items.length > 3 && (
                                                            <span className="text-xs text-muted-foreground self-center">+{supplier.items.length - 3} more</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Link>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
