"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { Search, Plus, MapPin, Phone, Users, Building2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditStoreDialog } from "@/components/stores/edit-store-dialog";


interface Store {
    _id: string;
    slug: string;
    name: string;
    address?: string;
    phone?: string; // Not in IStore but maybe in future or from owners? Using address for now.
    active: boolean;
    employeeCount: number;
    departmentCount: number;
    manager?: { firstName: string; lastName: string; email: string };
    managers?: any[]; // Populated check
}

export function StoreList({ initialStores }: { initialStores: Store[] }) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredStores = initialStores
        .filter((store) =>
            store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (store.address && store.address.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .sort((a, b) => {
            // Sort active first
            if (a.active === b.active) return 0;
            return a.active ? -1 : 1;
        });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="relative w-full max-w-xl">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search stores by name or address..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Link href="/dashboard/stores/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Add Store
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStores.map((store) => (
                    <Link href={`/dashboard/stores/${store.slug}`} key={store._id}>
                        <Card className="bg-card border hover:bg-accent/50 transition cursor-pointer">
                            <CardContent className="p-6 space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                            <Building2 className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg text-foreground">{store.name}</h3>
                                            <p className="text-xs text-muted-foreground">
                                                {store.manager ? `${store.manager.firstName} ${store.manager.lastName}` : "No Manager Assigned"}
                                            </p>
                                        </div>
                                    </div>
                                    {store.active ? (
                                        <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-0">Active</Badge>
                                    ) : (
                                        <Badge className="bg-red-500/10 text-red-500 border-0">Inactive</Badge>
                                    )}
                                </div>
                                {/*                                 <div className="absolute top-6 right-6" onClick={(e) => e.preventDefault()}>
                                    <EditStoreDialog store={store} />
                                </div> */}

                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        <span>{store.address || "No address provided"}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4" />
                                        <span>12312312</span> {/* Mock phone for now */}
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 pt-2">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                                            <Users className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground">Employees</span>
                                            <span className="font-bold text-foreground">{store.employeeCount}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
                                            <Building2 className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground">Departments</span>
                                            <span className="font-bold text-foreground">{store.departmentCount}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-zinc-700/50 mt-2">
                                    <span className="text-sm text-muted-foreground">Manager</span>
                                    <div className="flex items-center text-sm text-foreground hover:underline">
                                        View Details <ChevronRight className="h-3 w-3 ml-1" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
