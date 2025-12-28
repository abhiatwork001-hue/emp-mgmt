"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Edit, Building2, Loader2 } from "lucide-react";
import { getAvailableGlobalDepartmentHeadCandidates, assignGlobalDepartmentHead } from "@/lib/actions/department.actions";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface ManageGlobalDepartmentHeadsDialogProps {
    departmentId: string;
    departmentName: string;
}

export function ManageGlobalDepartmentHeadsDialog({ departmentId, departmentName }: ManageGlobalDepartmentHeadsDialogProps) {
    const [open, setOpen] = useState(false);
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
    const [fetchingCandidates, setFetchingCandidates] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const router = useRouter();
    const t = useTranslations("Common");

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
        setLoadingMap(prev => ({ ...prev, [employeeId]: true }));
        try {
            await assignGlobalDepartmentHead(departmentId, employeeId);
            setOpen(false);
            router.refresh();
        } catch (error) {
            console.error("Failed to assign department head", error);
        } finally {
            setLoadingMap(prev => ({ ...prev, [employeeId]: false }));
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                    <Edit className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto bg-popover border-border text-popover-foreground">
                <DialogHeader>
                    <DialogTitle>Assign Department Head for {departmentName}</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Select an employee to assign as department head
                    </DialogDescription>
                </DialogHeader>

                {fetchingCandidates ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-3 mt-4">
                        {employees.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic py-8 text-center">
                                No available employees to assign.
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                {employees.map((emp) => (
                                    <div
                                        key={emp._id}
                                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium overflow-hidden border border-border">
                                                {emp.image ? (
                                                    <img src={emp.image} alt={emp.firstName} className="h-full w-full object-cover" />
                                                ) : (
                                                    <span className="text-muted-foreground">{emp.firstName?.[0]}{emp.lastName?.[0]}</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{emp.firstName} {emp.lastName}</p>
                                                <p className="text-xs text-muted-foreground">{emp.email}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {emp.positionId && (
                                                        <Badge variant="outline" className="text-[10px] h-4 border-border">
                                                            {emp.positionId.name}
                                                        </Badge>
                                                    )}
                                                    {emp.storeId && (
                                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
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
                                            disabled={loadingMap[emp._id]}
                                            className="h-8"
                                        >
                                            {loadingMap[emp._id] ? <Loader2 className="h-4 w-4 animate-spin" /> : t('add')}
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
