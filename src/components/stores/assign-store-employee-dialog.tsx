"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Search } from "lucide-react";
import { getAvailableStoreEmployeesForDepartment, assignStoreEmployeesToDepartment } from "@/lib/actions/store-department.actions";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AssignStoreEmployeeToDepartmentDialogProps {
    storeId: string;
    departmentId: string;
    departmentName: string;
}

export function AssignStoreEmployeeToDepartmentDialog({ storeId, departmentId, departmentName }: AssignStoreEmployeeToDepartmentDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const router = useRouter();

    useEffect(() => {
        if (open) {
            loadEmployees();
        }
    }, [open]);

    async function loadEmployees() {
        setLoading(true);
        try {
            const data = await getAvailableStoreEmployeesForDepartment(storeId, departmentId);
            setEmployees(data);
        } catch (error) {
            console.error("Failed to load employees", error);
        } finally {
            setLoading(false);
        }
    }

    const handleSelect = (id: string) => {
        setSelectedEmployees((prev) =>
            prev.includes(id) ? prev.filter((empId) => empId !== id) : [...prev, id]
        );
    };

    async function handleSubmit() {
        if (selectedEmployees.length === 0) return;
        setLoading(true);
        try {
            await assignStoreEmployeesToDepartment(departmentId, selectedEmployees);
            setOpen(false);
            router.refresh();
            setSelectedEmployees([]);
        } catch (error) {
            console.error("Failed to assign employees", error);
        } finally {
            setLoading(false);
        }
    }

    const filteredEmployees = employees.filter((emp) =>
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <Plus className="mr-2 h-4 w-4" /> Assign Employee
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Assign to {departmentName}</DialogTitle>
                    <DialogDescription>
                        Select store employees to assign to this department.
                        Only employees already assigned to this store appear here.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search employees..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 bg-muted/30"
                        />
                    </div>

                    <ScrollArea className="h-[300px] border border-border rounded-md p-4 bg-muted/20">
                        {loading ? (
                            <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                        ) : filteredEmployees.length === 0 ? (
                            <div className="text-center py-8 px-4">
                                <p className="text-sm text-muted-foreground mb-1">No available employees found.</p>
                                <p className="text-xs text-muted-foreground/60">
                                    Make sure employees are assigned to this store first.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredEmployees.map((emp) => (
                                    <div key={emp._id} className="flex items-center space-x-3 p-2 rounded hover:bg-accent transition cursor-pointer" onClick={() => handleSelect(emp._id)}>
                                        <Checkbox
                                            id={`emp-${emp._id}`}
                                            checked={selectedEmployees.includes(emp._id)}
                                            onCheckedChange={() => handleSelect(emp._id)}
                                        />
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground">
                                                {emp.firstName?.[0]}{emp.lastName?.[0]}
                                            </div>
                                            <div className="space-y-0.5">
                                                <Label htmlFor={`emp-${emp._id}`} className="text-sm font-medium cursor-pointer hover:underline">
                                                    {emp.firstName} {emp.lastName}
                                                </Label>
                                                <p className="text-xs text-muted-foreground">{emp.email}</p>
                                                {emp.positionId?.name && (
                                                    <p className="text-xs text-muted-foreground/80 italic">{emp.positionId.name}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                    <div className="text-xs text-muted-foreground">
                        {selectedEmployees.length} employees selected
                    </div>
                </div>

                <DialogFooter>
                    <Button type="submit" disabled={selectedEmployees.length === 0 || loading} onClick={handleSubmit}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Assign Employees
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
