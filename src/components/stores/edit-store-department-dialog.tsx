"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Edit, Loader2 } from "lucide-react";
import { updateStoreDepartment } from "@/lib/actions/store-department.actions";
import { useRouter } from "next/navigation";

interface EditStoreDepartmentDialogProps {
    department: {
        _id: string;
        name: string;
        description?: string;
        active: boolean;
    };
}

export function EditStoreDepartmentDialog({ department }: EditStoreDepartmentDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [formData, setFormData] = useState({
        name: department.name,
        description: department.description || "",
        active: department.active,
        minEmployees: (department as any).minEmployees || 0,
        targetEmployees: (department as any).targetEmployees || 0
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            await updateStoreDepartment(department._id, {
                name: formData.name,
                description: formData.description,
                active: formData.active,
                minEmployees: formData.minEmployees,
                targetEmployees: formData.targetEmployees
            });
            setOpen(false);
            router.refresh();
        } catch (error) {
            console.error("Failed to update department", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                >
                    <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-[#1e293b] border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>Edit Department</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Update department details and status.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="bg-[#111827] border-zinc-700 text-white"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="bg-[#111827] border-zinc-700 text-white resize-none"
                            rows={3}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="min-employees">Min Employees</Label>
                            <Input
                                id="min-employees"
                                type="number"
                                min="0"
                                value={formData.minEmployees}
                                onChange={(e) => setFormData({ ...formData, minEmployees: parseInt(e.target.value) || 0 })}
                                className="bg-[#111827] border-zinc-700 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="target-employees">Target Employees</Label>
                            <Input
                                id="target-employees"
                                type="number"
                                min="0"
                                value={formData.targetEmployees}
                                onChange={(e) => setFormData({ ...formData, targetEmployees: parseInt(e.target.value) || 0 })}
                                className="bg-[#111827] border-zinc-700 text-white"
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-zinc-700 p-3 bg-[#111827]">
                        <div className="space-y-0.5">
                            <Label className="text-base">Active Status</Label>
                            <p className="text-sm text-zinc-400">
                                {formData.active ? "Department is active" : "Department is inactive"}
                            </p>
                        </div>
                        <Switch
                            checked={formData.active}
                            onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-white text-black hover:bg-zinc-200">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
