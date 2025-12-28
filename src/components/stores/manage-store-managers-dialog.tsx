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
            // Don't close dialog immediately so they can see it added
            // fetchCandidates(); // Refresh list? Router refresh might handle it if we passed props
        } catch (error) {
            console.error("Failed to assign manager", error);
            alert("Failed to assign manager. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    async function handleRemove(employeeId: string, isSubManager: boolean) {
        if (!confirm("Are you sure you want to remove this manager?")) return;
        setLoading(true);
        try {
            await removeStoreManager(storeId, employeeId, isSubManager);
            router.refresh();
        } catch (error) {
            console.error("Failed to remove manager", error);
        } finally {
            setLoading(false);
        }

    }

    const currentEmployees = employeeSource === "store" ? storeEmployees : globalEmployees;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700">
                    <UserCog className="mr-2 h-4 w-4" /> Manage Team
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto bg-[#1e293b] border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>Manage Leadership for {storeName}</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Assign or remove Store Managers and Sub-Managers.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="current" className="w-full mt-4">
                    <TabsList className="bg-[#111827] text-zinc-400 w-full justify-start">
                        <TabsTrigger value="current" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white flex-1">Current Team</TabsTrigger>
                        <TabsTrigger value="assign" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white flex-1">Assign New</TabsTrigger>
                    </TabsList>

                    <TabsContent value="current" className="space-y-6 mt-4">
                        {/* Managers Section */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Store Managers</h4>
                            {managers.length === 0 ? (
                                <p className="text-sm text-zinc-500 italic">No store managers assigned.</p>
                            ) : (
                                <div className="space-y-2">
                                    {managers.map((manager) => (
                                        <div key={manager._id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-700 bg-[#111827]">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium text-zinc-300">
                                                    {manager.firstName?.[0]}{manager.lastName?.[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{manager.firstName} {manager.lastName}</p>
                                                    <p className="text-xs text-zinc-400">{manager.email}</p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-zinc-400 hover:text-red-500 hover:bg-red-500/10"
                                                disabled={loading}
                                                onClick={() => handleRemove(manager._id, false)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Sub-Managers Section */}
                        <div className="space-y-3 pt-4 border-t border-zinc-700">
                            <h4 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Sub-Managers</h4>
                            {subManagers.length === 0 ? (
                                <p className="text-sm text-zinc-500 italic">No sub-managers assigned.</p>
                            ) : (
                                <div className="space-y-2">
                                    {subManagers.map((sub) => (
                                        <div key={sub._id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-700 bg-[#111827]">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium text-zinc-300">
                                                    {sub.firstName?.[0]}{sub.lastName?.[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{sub.firstName} {sub.lastName}</p>
                                                    <p className="text-xs text-zinc-400">{sub.email}</p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-zinc-400 hover:text-red-500 hover:bg-red-500/10"
                                                disabled={loading}
                                                onClick={() => handleRemove(sub._id, true)}
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
                                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Position Type Selection */}
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium text-zinc-300">Position Type</Label>
                                    <RadioGroup value={positionType} onValueChange={(val: string) => setPositionType(val as "manager" | "subManager")} className="flex gap-4">
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="manager" id="manager" className="border-zinc-500 text-primary" />
                                            <Label htmlFor="manager" className="font-normal cursor-pointer text-zinc-300">Manager</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="subManager" id="subManager" className="border-zinc-500 text-primary" />
                                            <Label htmlFor="subManager" className="font-normal cursor-pointer text-zinc-300">Sub-Manager</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                {/* Employee Source Toggle */}
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium text-zinc-300">Employee Source</Label>
                                    <RadioGroup value={employeeSource} onValueChange={(val: string) => setEmployeeSource(val as "store" | "global")} className="flex gap-4">
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="store" id="store" className="border-zinc-500 text-primary" />
                                            <Label htmlFor="store" className="font-normal cursor-pointer text-zinc-300">
                                                Store Employees ({storeEmployees.length})
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="global" id="global" className="border-zinc-500 text-primary" />
                                            <Label htmlFor="global" className="font-normal cursor-pointer text-zinc-300">
                                                Global Employees ({globalEmployees.length})
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                {/* Employee List */}
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium text-zinc-300">Select an employee</Label>
                                    {currentEmployees.length === 0 ? (
                                        <p className="text-sm text-zinc-500 italic py-8 text-center bg-[#111827] rounded-lg border border-zinc-800">
                                            No available employees found in this category.
                                        </p>
                                    ) : (
                                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                            {currentEmployees.map((emp) => (
                                                <div
                                                    key={emp._id}
                                                    className="flex items-center justify-between p-3 rounded-lg border border-zinc-700 bg-[#111827] hover:bg-zinc-800 transition"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium overflow-hidden text-zinc-300">
                                                            {emp.image ? (
                                                                <img src={emp.image} alt={emp.firstName} className="h-full w-full object-cover" />
                                                            ) : (
                                                                <span>{emp.firstName?.[0]}{emp.lastName?.[0]}</span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-xs text-zinc-400">{emp.email}</p>
                                                                {emp.positionId && (
                                                                    <Badge variant="outline" className="text-[10px] h-4 border-zinc-600 text-zinc-400">
                                                                        {emp.positionId.name}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleAssign(emp._id)}
                                                        disabled={loading}
                                                        className="bg-white text-black hover:bg-zinc-200"
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
    );
}
