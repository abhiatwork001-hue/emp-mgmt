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
                <Button variant="outline" className="w-full justify-start bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700">
                    <UserCog className="mr-2 h-4 w-4" /> Manage {title}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-[#1e293b] border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>Manage {title}</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Assign or remove {title.toLowerCase()} for {departmentName}.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                    {/* List Current Heads */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Current {title}</h4>
                        {currentHeads.length === 0 ? (
                            <p className="text-sm text-zinc-500 italic">No {title.toLowerCase()} assigned.</p>
                        ) : (
                            <div className="space-y-2">
                                {currentHeads.map((head) => (
                                    <div key={head._id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-700 bg-[#111827]">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-300">
                                                {head.firstName?.[0]}{head.lastName?.[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{head.firstName} {head.lastName}</p>
                                                <p className="text-xs text-zinc-400">{head.email}</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-zinc-400 hover:text-red-500 hover:bg-red-500/10"
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
                    <div className="space-y-4 border-t border-zinc-700 pt-4">
                        <h4 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Assign New {singularTitle}</h4>
                        <div className="flex gap-2">
                            <Select value={selectedEmployee} onValueChange={setSelectedEmployee} disabled={loading}>
                                <SelectTrigger className="w-full bg-[#111827] border-zinc-700 text-zinc-200">
                                    <SelectValue placeholder="Select an employee..." />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1e293b] border-zinc-700 text-zinc-200">
                                    {availableEmployees.length === 0 ? (
                                        <SelectItem value="none" disabled>No eligible employees found</SelectItem>
                                    ) : (
                                        availableEmployees.map((emp) => (
                                            <SelectItem key={emp._id} value={emp._id} className="focus:bg-zinc-800 focus:text-white">
                                                {emp.firstName} {emp.lastName}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            <Button onClick={handleAdd} disabled={!selectedEmployee || loading} className="bg-white text-black hover:bg-zinc-200">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-zinc-500">
                            Only employees currently assigned to this department can be made {title.toLowerCase()}.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
