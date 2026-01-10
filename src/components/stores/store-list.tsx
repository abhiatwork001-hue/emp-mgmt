"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { Search, Plus, MapPin, Phone, Users, Building2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Loader2, Sparkles } from "lucide-react";
import { seedMockReviewsForAllStores } from "@/lib/actions/google-places.actions";
import { EditStoreDialog } from "@/components/stores/edit-store-dialog";
import { EmptyState } from "@/components/ui/empty-state";


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
    googleRating?: number;
    googleUserRatingsTotal?: number;
}

export function StoreList({ initialStores, currentUserRoles = [] }: { initialStores: Store[], currentUserRoles?: string[] }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isSeeding, setIsSeeding] = useState(false);

    const isTech = currentUserRoles.includes("tech");

    const handleSeed = async () => {
        setIsSeeding(true);
        try {
            await seedMockReviewsForAllStores();
            window.location.reload();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSeeding(false);
        }
    };

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
                <div className="flex items-center gap-2">
                    {isTech && (
                        <Button variant="outline" onClick={handleSeed} disabled={isSeeding}>
                            {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-yellow-500" />}
                            Generate Fake Data
                        </Button>
                    )}
                    <Link href="/dashboard/stores/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Add Store
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStores.length === 0 && (
                    <div className="col-span-full">
                        <EmptyState
                            title={searchTerm ? "No stores found" : "No stores"}
                            description={searchTerm ? "Try adjusting your search terms." : "Get started by creating your first store."}
                            icon={Building2}
                            actionLabel={!searchTerm ? "Add Store" : undefined}
                            actionHref="/dashboard/stores/new"
                        />
                    </div>
                )}
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
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-muted-foreground">
                                                    {store.manager ? `${store.manager.firstName} ${store.manager.lastName}` : "No Manager Assigned"}
                                                </p>
                                                {store.googleRating && store.googleRating > 0 && (
                                                    <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded text-[10px] font-medium text-yellow-700 dark:text-yellow-400">
                                                        <span>{store.googleRating.toFixed(1)}</span>
                                                        <Star className="w-3 h-3 fill-current" />
                                                    </div>
                                                )}
                                            </div>
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
