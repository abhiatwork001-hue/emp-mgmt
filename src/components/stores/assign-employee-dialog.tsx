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
import { Loader2, Plus, Users, Search } from "lucide-react";
import { getAvailableEmployeesForStore, assignEmployeesToStore } from "@/lib/actions/employee.actions";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AssignEmployeeDialogProps {
    storeId: string;
}

export function AssignEmployeeDialog({ storeId }: AssignEmployeeDialogProps) {
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
            const data = await getAvailableEmployeesForStore(storeId);
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
            await assignEmployeesToStore(storeId, selectedEmployees);
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
                <Button size="sm" className="bg-white text-black hover:bg-zinc-200">
                    <Plus className="mr-2 h-4 w-4" /> Add Employee
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-[#1e293b] text-white border-zinc-700">
                <DialogHeader>
                    <DialogTitle>Assign Employees</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Select employees to assign to this store.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
                        <Input
                            placeholder="Search employees..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 bg-[#0f172a] border-zinc-700 text-white placeholder:text-zinc-500"
                        />
                    </div>

                    <ScrollArea className="h-[300px] border border-zinc-700 rounded-md p-4 bg-[#0f172a]">
                        {loading ? (
                            <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin text-zinc-400" /></div>
                        ) : filteredEmployees.length === 0 ? (
                            <p className="text-sm text-zinc-500 text-center py-4">No available employees found.</p>
                        ) : (
                            <div className="space-y-2">
                                {filteredEmployees.map((emp) => (
                                    <div key={emp._id} className="flex items-center space-x-3 p-2 rounded hover:bg-zinc-800/50 transition cursor-pointer" onClick={() => handleSelect(emp._id)}>
                                        <Checkbox
                                            id={`emp-${emp._id}`}
                                            checked={selectedEmployees.includes(emp._id)}
                                            onCheckedChange={() => handleSelect(emp._id)}
                                            className="border-zinc-500 data-[state=checked]:bg-white data-[state=checked]:text-black"
                                        />
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                                                {emp.firstName?.[0]}{emp.lastName?.[0]}
                                            </div>
                                            <div className="space-y-0.5">
                                                <Label htmlFor={`emp-${emp._id}`} className="text-sm font-medium text-white cursor-pointer hover:underline">
                                                    {emp.firstName} {emp.lastName}
                                                </Label>
                                                <p className="text-xs text-zinc-500">{emp.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                    <div className="text-xs text-zinc-400">
                        {selectedEmployees.length} employees selected
                    </div>
                </div>

                <DialogFooter>
                    <Button type="submit" disabled={selectedEmployees.length === 0 || loading} onClick={handleSubmit} className="bg-white text-black hover:bg-zinc-200">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Assign Employees
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
