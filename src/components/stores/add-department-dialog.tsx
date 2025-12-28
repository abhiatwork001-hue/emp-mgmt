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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";
import { getAvailableGlobalDepartments, createStoreDepartment } from "@/lib/actions/store-department.actions";
import { useRouter } from "next/navigation";

interface AddDepartmentDialogProps {
    storeId: string;
}

export function AddDepartmentDialog({ storeId }: AddDepartmentDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState<any[]>([]);
    const [selectedDept, setSelectedDept] = useState("");
    const router = useRouter();

    useEffect(() => {
        if (open) {
            loadDepartments();
        }
    }, [open]);

    async function loadDepartments() {
        setLoading(true);
        try {
            const depts = await getAvailableGlobalDepartments(storeId);
            setDepartments(depts);
        } catch (error) {
            console.error("Failed to load departments", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit() {
        if (!selectedDept) return;
        setLoading(true);
        try {
            await createStoreDepartment(storeId, selectedDept);
            setOpen(false);
            router.refresh();
            setSelectedDept("");
        } catch (error) {
            console.error("Failed to add department", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="bg-white text-black hover:bg-zinc-200">
                    <Plus className="mr-2 h-4 w-4" /> Add Department
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-[#1e293b] text-white border-zinc-700">
                <DialogHeader>
                    <DialogTitle>Add Department</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Select a global department to add to this store.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="department" className="text-right text-zinc-300">
                            Department
                        </Label>
                        <div className="col-span-3">
                            <Select onValueChange={setSelectedDept} value={selectedDept}>
                                <SelectTrigger className="w-full bg-[#0f172a] border-zinc-700 text-white">
                                    <SelectValue placeholder="Select a department" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1e293b] border-zinc-700 text-white">
                                    {loading ? (
                                        <div className="flex justify-center p-2"><Loader2 className="h-4 w-4 animate-spin" /></div>
                                    ) : departments.length === 0 ? (
                                        <div className="p-2 text-sm text-zinc-500">No available departments found.</div>
                                    ) : (
                                        departments.map((dept) => (
                                            <SelectItem key={dept._id} value={dept._id} className="focus:bg-zinc-800 focus:text-white">
                                                {dept.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" disabled={!selectedDept || loading} onClick={handleSubmit} className="bg-white text-black hover:bg-zinc-200">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Department
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
