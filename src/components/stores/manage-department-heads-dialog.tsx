"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserCog, Plus, Trash2 } from "lucide-react";
import {
    assignHeadOfDepartment,
    removeHeadOfDepartment,
    assignSubHeadOfDepartment,
    removeSubHeadOfDepartment
} from "@/lib/actions/store-department.actions";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from "next-intl";

interface ManageDepartmentHeadsDialogProps {
    departmentId: string;
    departmentName: string;
    currentHeads: any[]; // List of header employees
    employees: any[]; // List of all employees in department
    roleType?: "head" | "subHead";
}

export function ManageDepartmentHeadsDialog({
    departmentId,
    departmentName,
    currentHeads,
    employees,
    roleType = "head"
}: ManageDepartmentHeadsDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState("");
    const router = useRouter();
    const t = useTranslations("Common");

    const title = roleType === "head" ? "Department Heads" : "Sub-Heads";
    const singularTitle = roleType === "head" ? "Head" : "Sub-Head";

    // Filter employees who are not already in the current list
    const availableEmployees = employees.filter(
        emp => !currentHeads.some(head => head._id === emp._id)
    );

    async function handleAdd() {
        if (!selectedEmployee) return;
        setLoading(true);
        try {
            if (roleType === "head") {
                await assignHeadOfDepartment(departmentId, selectedEmployee);
            } else {
                await assignSubHeadOfDepartment(departmentId, selectedEmployee);
            }
            setSelectedEmployee("");
            router.refresh();
        } catch (error) {
            console.error(`Failed to assign ${singularTitle}`, error);
        } finally {
            setLoading(false);
        }
    }

    async function handleRemove(employeeId: string) {
        setLoading(true);
        try {
            if (roleType === "head") {
                await removeHeadOfDepartment(departmentId, employeeId);
            } else {
                await removeSubHeadOfDepartment(departmentId, employeeId);
            }
            router.refresh();
        } catch (error) {
            console.error(`Failed to remove ${singularTitle}`, error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border">
                    <UserCog className="mr-2 h-4 w-4" /> Manage {title}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-popover border-border text-popover-foreground">
                <DialogHeader>
                    <DialogTitle>Manage {title}</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Assign or remove {title.toLowerCase()} for {departmentName}.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                    {/* List Current Heads */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Current {title}</h4>
                        {currentHeads.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic bg-muted/30 p-4 rounded-lg border border-dashed border-border text-center">No {title.toLowerCase()} assigned.</p>
                        ) : (
                            <div className="space-y-2">
                                {currentHeads.map((head) => (
                                    <div key={head._id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground border border-border">
                                                {head.firstName?.[0]}{head.lastName?.[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{head.firstName} {head.lastName}</p>
                                                <p className="text-xs text-muted-foreground">{head.email}</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                            disabled={loading}
                                            onClick={() => handleRemove(head._id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Add New Head */}
                    <div className="space-y-4 border-t border-border pt-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Assign New {singularTitle}</h4>
                        <div className="flex gap-2">
                            <Select value={selectedEmployee} onValueChange={setSelectedEmployee} disabled={loading}>
                                <SelectTrigger className="w-full bg-muted/30 border-border text-foreground">
                                    <SelectValue placeholder={t('searchEmployee')} />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border text-popover-foreground">
                                    {availableEmployees.length === 0 ? (
                                        <SelectItem value="none" disabled>No eligible employees found</SelectItem>
                                    ) : (
                                        availableEmployees.map((emp) => (
                                            <SelectItem key={emp._id} value={emp._id}>
                                                {emp.firstName} {emp.lastName}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            <Button onClick={handleAdd} disabled={!selectedEmployee || loading} size="icon" className="h-10 w-10 shrink-0">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">
                            Only employees currently assigned to this department can be made {title.toLowerCase()}.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
