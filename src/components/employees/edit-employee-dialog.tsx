"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateEmployee } from "@/lib/actions/employee.actions";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Edit } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface EditEmployeeDialogProps {
    employee: any;
}

const DAYS = [
    { label: "Sun", value: 0 },
    { label: "Mon", value: 1 },
    { label: "Tue", value: 2 },
    { label: "Wed", value: 3 },
    { label: "Thu", value: 4 },
    { label: "Fri", value: 5 },
    { label: "Sat", value: 6 },
];

export function EditEmployeeDialog({ employee }: EditEmployeeDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const [formData, setFormData] = useState({
        firstName: employee.firstName || "",
        lastName: employee.lastName || "",
        email: employee.email || "",
        phone: employee.phone || "",
        address: employee.address || "",
        nif: employee.nif || "",
        contract: {
            weeklyHours: employee.contract?.weeklyHours || 40,
            employmentType: employee.contract?.employmentType || "Contracted",
            vacationAllowed: employee.contract?.vacationAllowed ?? true,
            workingDays: employee.contract?.workingDays || [1, 2, 3, 4, 5],
        }
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleContractChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            contract: {
                ...prev.contract,
                [field]: value
            }
        }));
    };

    const handleDayToggle = (dayValue: number) => {
        const currentDays = formData.contract.workingDays;
        let newDays;
        if (currentDays.includes(dayValue)) {
            newDays = currentDays.filter((d: number) => d !== dayValue);
        } else {
            newDays = [...currentDays, dayValue];
        }
        handleContractChange("workingDays", newDays);
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await updateEmployee(employee._id, formData);
            setOpen(false);
            router.refresh();
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white mt-4 border border-zinc-700">
                    <Edit className="mr-2 h-4 w-4" /> Edit Profile
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-[#0f172a] border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Employee Profile</DialogTitle>
                    <DialogDescription>Update personal information and contract details.</DialogDescription>
                </DialogHeader>

                <form onSubmit={onSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-zinc-400 border-b border-zinc-800 pb-2">Personal Info</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} className="bg-zinc-900 border-zinc-700" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} className="bg-zinc-900 border-zinc-700" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" value={formData.email} onChange={handleChange} className="bg-zinc-900 border-zinc-700" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} className="bg-zinc-900 border-zinc-700" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nif">NIF</Label>
                                <Input id="nif" name="nif" value={formData.nif} onChange={handleChange} className="bg-zinc-900 border-zinc-700" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Input id="address" name="address" value={formData.address} onChange={handleChange} className="bg-zinc-900 border-zinc-700" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-zinc-400 border-b border-zinc-800 pb-2">Contract Details</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Employment Type</Label>
                                <Select
                                    value={formData.contract.employmentType}
                                    onValueChange={(val) => handleContractChange("employmentType", val)}
                                >
                                    <SelectTrigger className="bg-zinc-900 border-zinc-700">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                                        <SelectItem value="Contracted">Contracted</SelectItem>
                                        <SelectItem value="Freelancer">Freelancer</SelectItem>
                                        <SelectItem value="Extra">Extra</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="weeklyHours">Weekly Hours</Label>
                                <Input
                                    id="weeklyHours"
                                    type="number"
                                    value={formData.contract.weeklyHours}
                                    onChange={(e) => handleContractChange("weeklyHours", Number(e.target.value))}
                                    className="bg-zinc-900 border-zinc-700"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 bg-zinc-900 p-3 rounded-md border border-zinc-800">
                            <Switch
                                id="vacation-allowed"
                                checked={formData.contract.vacationAllowed}
                                onCheckedChange={(checked) => handleContractChange("vacationAllowed", checked)}
                            />
                            <Label htmlFor="vacation-allowed">Vacation Allowed</Label>
                        </div>

                        <div className="space-y-2">
                            <Label>Working Days</Label>
                            <div className="flex flex-wrap gap-2">
                                {DAYS.map((day) => (
                                    <div key={day.value} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`day-${day.value}`}
                                            checked={formData.contract.workingDays.includes(day.value)}
                                            onCheckedChange={() => handleDayToggle(day.value)}
                                            className="border-zinc-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
                                        />
                                        <Label htmlFor={`day-${day.value}`} className="cursor-pointer">{day.label}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="hover:text-white">Cancel</Button>
                        <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {isLoading ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
