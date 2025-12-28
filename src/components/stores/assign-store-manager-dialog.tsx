"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCog, Plus, Building2, Loader2 } from "lucide-react";
import { getAvailableManagerCandidates, assignStoreManager } from "@/lib/actions/store.actions";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface AssignStoreManagerDialogProps {
    storeId: string;
    storeName: string;
    isSubManager?: boolean;
}

export function AssignStoreManagerDialog({ storeId, storeName, isSubManager = false }: AssignStoreManagerDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetchingCandidates, setFetchingCandidates] = useState(false);
    const [storeEmployees, setStoreEmployees] = useState<any[]>([]);
    const [globalEmployees, setGlobalEmployees] = useState<any[]>([]);
    const router = useRouter();

    // Fetch candidates when dialog opens
    useEffect(() => {
        if (open) {
            fetchCandidates();
        }
    }, [open]);

    async function fetchCandidates() {
        setFetchingCandidates(true);
        try {
            const data = await getAvailableManagerCandidates(storeId);
            setStoreEmployees(data.storeEmployees);
            setGlobalEmployees(data.globalEmployees);
        } catch (error) {
            console.error("Failed to fetch candidates", error);
        } finally {
            setFetchingCandidates(false);
        }
    }

    async function handleAssign(employeeId: string) {
        setLoading(true);
        try {
            await assignStoreManager(storeId, employeeId, isSubManager);
            setOpen(false);
            router.refresh();
        } catch (error) {
            console.error("Failed to assign manager", error);
            alert("Failed to assign manager. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white">
                    <Plus className="h-3 w-3 mr-1" /> Assign
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Assign {isSubManager ? "Sub-Manager" : "Store Manager"}</DialogTitle>
                    <DialogDescription>
                        Select an employee to assign as {isSubManager ? "sub-manager" : "store manager"} for {storeName}.
                    </DialogDescription>
                </DialogHeader>

                {fetchingCandidates ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                    </div>
                ) : (
                    <Tabs defaultValue="store" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="store">
                                Store Employees ({storeEmployees.length})
                            </TabsTrigger>
                            <TabsTrigger value="global">
                                Global Employees ({globalEmployees.length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="store" className="space-y-3 mt-4">
                            {storeEmployees.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic py-8 text-center">
                                    No available employees in this store.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {storeEmployees.map((emp) => (
                                        <div
                                            key={emp._id}
                                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium overflow-hidden">
                                                    {emp.image ? (
                                                        <img src={emp.image} alt={emp.firstName} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <span>{emp.firstName?.[0]}{emp.lastName?.[0]}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                                                    <p className="text-xs text-muted-foreground">{emp.email}</p>
                                                    {emp.positionId && (
                                                        <Badge variant="outline" className="mt-1 text-xs">
                                                            {emp.positionId.name}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => handleAssign(emp._id)}
                                                disabled={loading}
                                            >
                                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign"}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="global" className="space-y-3 mt-4">
                            {globalEmployees.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic py-8 text-center">
                                    No available global employees.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {globalEmployees.map((emp) => (
                                        <div
                                            key={emp._id}
                                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium overflow-hidden">
                                                    {emp.image ? (
                                                        <img src={emp.image} alt={emp.firstName} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <span>{emp.firstName?.[0]}{emp.lastName?.[0]}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                                                    <p className="text-xs text-muted-foreground">{emp.email}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {emp.positionId && (
                                                            <Badge variant="outline" className="text-xs">
                                                                {emp.positionId.name}
                                                            </Badge>
                                                        )}
                                                        {emp.storeId && (
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                <Building2 className="h-3 w-3" />
                                                                <span>{emp.storeId.name}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => handleAssign(emp._id)}
                                                disabled={loading}
                                            >
                                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign"}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground pt-2 border-t">
                                Note: Global employees will be automatically assigned to this store when made manager.
                            </p>
                        </TabsContent>
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    );
}
