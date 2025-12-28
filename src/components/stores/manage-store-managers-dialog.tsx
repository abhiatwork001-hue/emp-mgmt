"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Edit, Building2, Loader2, Trash2, UserCog } from "lucide-react";
import { getAvailableManagerCandidates, assignStoreManager, removeStoreManager } from "@/lib/actions/store.actions";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ManageStoreManagersDialogProps {
    storeId: string;
    storeName: string;
    managers: any[];
    subManagers: any[];
}

export function ManageStoreManagersDialog({ storeId, storeName, managers, subManagers }: ManageStoreManagersDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetchingCandidates, setFetchingCandidates] = useState(false);
    const [positionType, setPositionType] = useState<"manager" | "subManager">("manager");
    const [employeeSource, setEmployeeSource] = useState<"store" | "global">("store");
    const [storeEmployees, setStoreEmployees] = useState<any[]>([]);
    const [globalEmployees, setGlobalEmployees] = useState<any[]>([]);
    const [pendingRemoval, setPendingRemoval] = useState<{ id: string; isSubManager: boolean; name: string } | null>(null);
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
            await assignStoreManager(storeId, employeeId, positionType === "subManager");
            router.refresh();
        } catch (error) {
            console.error("Failed to assign manager", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleRemove() {
        if (!pendingRemoval) return;
        setLoading(true);
        try {
            await removeStoreManager(storeId, pendingRemoval.id, pendingRemoval.isSubManager);
            router.refresh();
        } catch (error) {
            console.error("Failed to remove manager", error);
        } finally {
            setLoading(false);
            setPendingRemoval(null);
        }
    }

    const currentEmployees = employeeSource === "store" ? storeEmployees : globalEmployees;

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <UserCog className="mr-2 h-4 w-4" /> Manage Team
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Manage Leadership for {storeName}</DialogTitle>
                        <DialogDescription>
                            Assign or remove Store Managers and Sub-Managers.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="current" className="w-full mt-4">
                        <TabsList className="bg-muted w-full justify-start">
                            <TabsTrigger value="current" className="flex-1">Current Team</TabsTrigger>
                            <TabsTrigger value="assign" className="flex-1">Assign New</TabsTrigger>
                        </TabsList>

                        <TabsContent value="current" className="space-y-6 mt-4">
                            {/* Managers Section */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Store Managers</h4>
                                {managers.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic">No store managers assigned.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {managers.map((manager) => (
                                            <div key={manager._id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-foreground">
                                                        {manager.firstName?.[0]}{manager.lastName?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">{manager.firstName} {manager.lastName}</p>
                                                        <p className="text-xs text-muted-foreground">{manager.email}</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                    disabled={loading}
                                                    onClick={() => setPendingRemoval({ id: manager._id, isSubManager: false, name: `${manager.firstName} ${manager.lastName}` })}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Sub-Managers Section */}
                            <div className="space-y-3 pt-4 border-t border-border">
                                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Sub-Managers</h4>
                                {subManagers.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic">No sub-managers assigned.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {subManagers.map((sub) => (
                                            <div key={sub._id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-foreground">
                                                        {sub.firstName?.[0]}{sub.lastName?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">{sub.firstName} {sub.lastName}</p>
                                                        <p className="text-xs text-muted-foreground">{sub.email}</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                    disabled={loading}
                                                    onClick={() => setPendingRemoval({ id: sub._id, isSubManager: true, name: `${sub.firstName} ${sub.lastName}` })}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="assign" className="space-y-6 mt-4">
                            {fetchingCandidates ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Position Type Selection */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-medium">Position Type</Label>
                                        <RadioGroup value={positionType} onValueChange={(val: string) => setPositionType(val as "manager" | "subManager")} className="flex gap-4">
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="manager" id="manager" />
                                                <Label htmlFor="manager" className="font-normal cursor-pointer">Manager</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="subManager" id="subManager" />
                                                <Label htmlFor="subManager" className="font-normal cursor-pointer">Sub-Manager</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    {/* Employee Source Toggle */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-medium">Employee Source</Label>
                                        <RadioGroup value={employeeSource} onValueChange={(val: string) => setEmployeeSource(val as "store" | "global")} className="flex gap-4">
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="store" id="store" />
                                                <Label htmlFor="store" className="font-normal cursor-pointer">
                                                    Store Employees ({storeEmployees.length})
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="global" id="global" />
                                                <Label htmlFor="global" className="font-normal cursor-pointer">
                                                    Global Employees ({globalEmployees.length})
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    {/* Employee List */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-medium">Select an employee</Label>
                                        {currentEmployees.length === 0 ? (
                                            <p className="text-sm text-muted-foreground italic py-8 text-center bg-muted/20 rounded-lg border border-border">
                                                No available employees found in this category.
                                            </p>
                                        ) : (
                                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                                {currentEmployees.map((emp) => (
                                                    <div
                                                        key={emp._id}
                                                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium overflow-hidden">
                                                                {emp.image ? (
                                                                    <img src={emp.image} alt={emp.firstName} className="h-full w-full object-cover" />
                                                                ) : (
                                                                    <span>{emp.firstName?.[0]}{emp.lastName?.[0]}</span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-xs text-muted-foreground">{emp.email}</p>
                                                                    {emp.positionId && (
                                                                        <Badge variant="outline" className="text-[10px] h-4">
                                                                            {emp.positionId.name}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            onClick={(e) => { e.stopPropagation(); handleAssign(emp._id); }}
                                                            disabled={loading}
                                                        >
                                                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign"}
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!pendingRemoval} onOpenChange={(open) => !open && setPendingRemoval(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove {pendingRemoval?.isSubManager ? "Sub-Manager" : "Manager"}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove <strong>{pendingRemoval?.name}</strong> from their {pendingRemoval?.isSubManager ? "Sub-Manager" : "Manager"} position?
                            This will remove their management permissions for this store.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleRemove();
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={loading}
                        >
                            {loading ? "Removing..." : "Remove Manager"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
