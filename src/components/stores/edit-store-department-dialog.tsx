"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { Label } from "@/components/ui/label";
import { updateStoreDepartment } from "@/lib/actions/store-department.actions";
import { Loader2, Settings } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface EditStoreDepartmentDialogProps {
    department: {
        _id: string;
        name: string;
        minEmployees?: number;
        maxEmployees?: number;
        targetEmployees?: number;
        minWeeklyHours?: number;
        maxWeeklyHours?: number;
        targetWeeklyHours?: number;
    };
}

export function EditStoreDepartmentDialog({ department }: EditStoreDepartmentDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    // const t = useTranslations("Stores.departmentForm"); 

    const [formData, setFormData] = useState({
        minEmployees: department.minEmployees || 0,
        maxEmployees: department.maxEmployees || 0,
        targetEmployees: department.targetEmployees || 0,
        minWeeklyHours: department.minWeeklyHours || 0,
        maxWeeklyHours: department.maxWeeklyHours || 0,
        targetWeeklyHours: department.targetWeeklyHours || 0,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await updateStoreDepartment(department._id, formData);
            toast.success("Department settings updated");
            setOpen(false);
            router.refresh();
        } catch (error) {
            console.error("Failed to update department", error);
            toast.error("Failed to update settings");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                    <Settings className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit {department.name} Settings</DialogTitle>
                    <DialogDescription>
                        Configure staffing limits and schedule targets for this department.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">

                    {/* Staffing Targets */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium leading-none text-muted-foreground border-b pb-2">Staffing Targets (Headcount)</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="minEmployees">Min</Label>
                                <Input
                                    id="minEmployees"
                                    type="number"
                                    min="0"
                                    value={formData.minEmployees}
                                    onChange={(e) => setFormData({ ...formData, minEmployees: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="targetEmployees">Target</Label>
                                <Input
                                    id="targetEmployees"
                                    type="number"
                                    min="0"
                                    value={formData.targetEmployees}
                                    onChange={(e) => setFormData({ ...formData, targetEmployees: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="maxEmployees">Max</Label>
                                <Input
                                    id="maxEmployees"
                                    type="number"
                                    min="0"
                                    value={formData.maxEmployees}
                                    onChange={(e) => setFormData({ ...formData, maxEmployees: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Weekly Hours Targets */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium leading-none text-muted-foreground border-b pb-2">Weekly Schedule Hours</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="minWeeklyHours">Min</Label>
                                <Input
                                    id="minWeeklyHours"
                                    type="number"
                                    min="0"
                                    value={formData.minWeeklyHours}
                                    onChange={(e) => setFormData({ ...formData, minWeeklyHours: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="targetWeeklyHours">Target</Label>
                                <Input
                                    id="targetWeeklyHours"
                                    type="number"
                                    min="0"
                                    value={formData.targetWeeklyHours}
                                    onChange={(e) => setFormData({ ...formData, targetWeeklyHours: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="maxWeeklyHours">Max</Label>
                                <Input
                                    id="maxWeeklyHours"
                                    type="number"
                                    min="0"
                                    value={formData.maxWeeklyHours}
                                    onChange={(e) => setFormData({ ...formData, maxWeeklyHours: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
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
