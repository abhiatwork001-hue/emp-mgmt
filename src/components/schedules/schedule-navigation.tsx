"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getStoresWithDepartments } from "@/lib/actions/store.actions";
import { getOrCreateSchedule } from "@/lib/actions/schedule.actions";
import { Loader2, Store as StoreIcon, Layers, ChevronRight } from "lucide-react";

export default function ScheduleNavigation() {
    const router = useRouter();
    const [stores, setStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [navigatingId, setNavigatingId] = useState<string | null>(null);

    useEffect(() => {
        const fetchStores = async () => {
            try {
                const data = await getStoresWithDepartments();
                setStores(data);
            } catch (error) {
                console.error("Failed to fetch stores", error);
                alert("Failed to load stores");
            } finally {
                setLoading(false);
            }
        };
        fetchStores();
    }, []);

    const handleDepartmentClick = async (storeId: string, departmentId: string) => {
        setNavigatingId(departmentId);
        try {
            // Get current week details
            const today = new Date();

            // Call action to get or create schedule for THIS week
            // Signature: getOrCreateSchedule(storeId, storeDepartmentId, startDate)
            const schedule = await getOrCreateSchedule(storeId, departmentId, today);

            if (schedule && schedule._id) {
                router.push(`/dashboard/schedules/${schedule._id}`);
            } else {
                alert("Could not access schedule");
            }
        } catch (error) {
            console.error("Navigation failed", error);
            alert("Failed to navigate to schedule");
        } finally {
            setNavigatingId(null);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    if (stores.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                    <StoreIcon className="h-12 w-12 mb-4 opacity-20" />
                    <p>No stores found. Please ask an administrator to set up stores.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store) => (
                <Card key={store._id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2">
                            <StoreIcon className="h-5 w-5 text-primary" />
                            {store.name}
                        </CardTitle>
                        <CardDescription>{store.location || "Main Location"}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
                                <Layers className="h-3 w-3" /> Departments
                            </h4>

                            {store.departments && store.departments.length > 0 ? (
                                <div className="space-y-1">
                                    {store.departments.map((dept: any) => (
                                        <Button
                                            key={dept._id}
                                            variant="ghost"
                                            className="w-full justify-between group h-auto py-3"
                                            onClick={() => handleDepartmentClick(store._id, dept._id)}
                                            disabled={navigatingId === dept._id}
                                        >
                                            <span className="font-medium group-hover:text-primary transition-colors">{dept.name}</span>
                                            {navigatingId === dept._id ? (
                                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                            ) : (
                                                <div className="flex items-center text-xs text-muted-foreground group-hover:text-primary transition-colors">
                                                    Current Week <ChevronRight className="h-3 w-3 ml-1" />
                                                </div>
                                            )}
                                        </Button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground italic p-2">No departments configured.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
