"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserPlus, Building2, Loader2 } from "lucide-react";
import { getAvailableGlobalDepartmentHeadCandidates, assignGlobalDepartmentHead, assignGlobalDepartmentSubHead } from "@/lib/actions/department.actions";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface AssignGlobalDepartmentHeadDialogProps {
    departmentId: string;
    departmentName: string;
    type: "head" | "subHead";
}

export function AssignGlobalDepartmentHeadDialog({ departmentId, departmentName, type }: AssignGlobalDepartmentHeadDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetchingCandidates, setFetchingCandidates] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const router = useRouter();

    const title = type === "head" ? "Assign Department Head" : "Assign Sub Head";
    const description = type === "head"
        ? "Select an employee to assign as department head"
        : "Select an employee to assign as sub head";

    // Fetch candidates when dialog opens
    useEffect(() => {
        if (open) {
            fetchCandidates();
        }
    }, [open]);

    async function fetchCandidates() {
        setFetchingCandidates(true);
        try {
            const data = await getAvailableGlobalDepartmentHeadCandidates(departmentId);
            setEmployees(data);
        } catch (error) {
            console.error("Failed to fetch candidates", error);
        } finally {
            setFetchingCandidates(false);
        }
    }

    async function handleAssign(employeeId: string) {
        setLoading(true);
        try {
            if (type === "head") {
                await assignGlobalDepartmentHead(departmentId, employeeId);
            } else {
                await assignGlobalDepartmentSubHead(departmentId, employeeId);
            }
            setOpen(false);
            router.refresh();
        } catch (error) {
            console.error(`Failed to assign ${type}`, error);
            alert(`Failed to assign ${type}. Please try again.`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" >
                    <UserPlus className="mr-2 h-4 w-4" />
                    {type === "head" ? "Assign Head" : "Assign Sub Head"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{title} for {departmentName}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                {fetchingCandidates ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                    </div>
                ) : (
                    <div className="space-y-3 mt-4">
                        {employees.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic py-8 text-center">
                                No available employees to assign.
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {employees.map((emp) => (
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
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
