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
import { useTranslations, useLocale } from "next-intl";
import { getLocalized } from "@/lib/utils";

interface AddDepartmentDialogProps {
    storeId: string;
}

export function AddDepartmentDialog({ storeId }: AddDepartmentDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState<any[]>([]);
    const [selectedDept, setSelectedDept] = useState("");
    const router = useRouter();
    const t = useTranslations("Common");
    const locale = useLocale();

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
                <Button size="sm" variant="outline">
                    <Plus className="mr-2 h-4 w-4" /> {t('add')} {t('departments')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('add')} {t('departments')}</DialogTitle>
                    <DialogDescription>
                        Select a global department to add to this store.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="department" className="text-right">
                            Department
                        </Label>
                        <div className="col-span-3">
                            <Select onValueChange={setSelectedDept} value={selectedDept}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t('loading')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {loading ? (
                                        <div className="flex justify-center p-2"><Loader2 className="h-4 w-4 animate-spin" /></div>
                                    ) : departments.length === 0 ? (
                                        <div className="p-2 text-sm text-zinc-500">No available departments found.</div>
                                    ) : (
                                        departments.map((dept) => (
                                            <SelectItem key={dept._id} value={dept._id}>
                                                {getLocalized(dept, "name", locale)}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" disabled={!selectedDept || loading} onClick={handleSubmit}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('add')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
