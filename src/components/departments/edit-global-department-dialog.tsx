"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Edit, Loader2, Settings } from "lucide-react";
import { updateGlobalDepartment } from "@/lib/actions/department.actions";
import { useRouter } from "next/navigation";

interface EditGlobalDepartmentDialogProps {
    department: {
        _id: string;
        name: string;
        description?: string;
        active: boolean;
    };
    trigger?: React.ReactNode;
}

export function EditGlobalDepartmentDialog({ department, trigger }: EditGlobalDepartmentDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [formData, setFormData] = useState({
        name: department.name,
        description: department.description || "",
        active: department.active
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            await updateGlobalDepartment(department._id, {
                name: formData.name,
                description: formData.description,
                active: formData.active
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
                {trigger || (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white">
                        <Settings className="h-4 w-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-[#1e293b] border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>Edit Global Department</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Update global department details and status.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="global-name">Name</Label>
                        <Input
                            id="global-name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="bg-[#111827] border-zinc-700 text-white"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="global-description">Description</Label>
                        <Textarea
                            id="global-description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="bg-[#111827] border-zinc-700 text-white resize-none"
                            rows={3}
                        />
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
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
