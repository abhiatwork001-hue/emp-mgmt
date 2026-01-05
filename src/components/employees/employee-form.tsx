"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { createEmployee, updateEmployee } from "@/lib/actions/employee.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { UploadDropzone } from "@/lib/uploadthing";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X } from "lucide-react";

interface EmployeeFormProps {
    employee?: any;
    onSuccess?: () => void;
    mode?: "create" | "edit";
    isSelfService?: boolean;
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

export function EmployeeForm({ employee, onSuccess, mode = "create", isSelfService = false }: EmployeeFormProps) {
    const isEdit = mode === "edit" || !!employee;
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { data: session } = useSession();

    const userRoles = (session?.user as any)?.roles || [];
    const isPrivileged = userRoles.some((r: string) =>
        ["hr", "tech", "owner", "admin", "super_user"].includes(r.toLowerCase())
    );

    const [formData, setFormData] = useState({
        image: employee?.image || "",
        firstName: employee?.firstName || "",
        lastName: employee?.lastName || "",
        email: employee?.email || "",
        phone: employee?.phone || "",
        address: employee?.address || "",
        nif: employee?.nif || "",
        dob: employee?.dob ? new Date(employee.dob) : undefined,
        contract: {
            weeklyHours: employee?.contract?.weeklyHours || 40,
            employmentType: employee?.contract?.employmentType || "Contracted",
            vacationAllowed: employee?.contract?.vacationAllowed ?? true,
            workingDays: employee?.contract?.workingDays || [1, 2, 3, 4, 5],
        },
        roles: employee?.roles || [],
        documents: employee?.documents || [],
        vacationTracker: {
            ...(employee?.vacationTracker || {}),
            defaultDays: employee?.vacationTracker?.defaultDays ?? 22,
            rolloverDays: employee?.vacationTracker?.rolloverDays ?? 0,
            usedDays: employee?.vacationTracker?.usedDays ?? 0,
        }
    });

    const addDocument = () => {
        setFormData(prev => ({
            ...prev,
            documents: [...prev.documents, { type: "", value: "", validity: undefined }]
        }));
    };

    const removeDocument = (index: number) => {
        setFormData(prev => ({
            ...prev,
            documents: prev.documents.filter((_: any, i: number) => i !== index)
        }));
    };

    const handleDocumentChange = (index: number, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            documents: prev.documents.map((doc: any, i: number) =>
                i === index ? { ...doc, [field]: value } : doc
            )
        }));
    };

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

    const handleVacationTrackerChange = (field: string, value: number) => {
        setFormData(prev => ({
            ...prev,
            vacationTracker: {
                ...prev.vacationTracker,
                [field]: value
            }
        }));
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (isEdit && employee?._id) {
                // If self service, only send personal info fields to avoid overwriting contract with defaults or stale data
                // Ideally backend handles this filtering too, but safe here.
                const submissionData = isSelfService ? {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    phone: formData.phone,
                    address: formData.address,
                    nif: formData.nif
                } : formData;

                const updatedEmp = await updateEmployee(employee._id, submissionData);
                toast.success("Employee updated successfully");

                // Redirect to the new slug (if name changed, slug changed)
                if (updatedEmp && updatedEmp.slug) {
                    router.push(`/dashboard/employees/${updatedEmp.slug}`);
                } else {
                    router.refresh();
                }
            } else {
                const newEmp = await createEmployee(formData);
                toast.success("Employee created successfully");
                if (newEmp && newEmp.slug) {
                    router.push(`/dashboard/employees/${newEmp.slug}`);
                } else {
                    router.push("/dashboard/employees");
                }
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to save employee.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={onSubmit} className="space-y-8 max-w-5xl mx-auto pb-12">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
            >
                <Card glass premium className="p-0 overflow-hidden border-primary/10">
                    <div className="bg-primary/5 px-6 py-4 border-b border-primary/10">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            Personal Information
                        </h3>
                    </div>
                    <CardContent className="p-8 space-y-6">
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            {/* Profile Picture Section */}
                            <div className="flex flex-col items-center gap-4 min-w-[200px]">
                                <div className="relative group">
                                    <Avatar className="w-40 h-40 border-4 border-background shadow-2xl">
                                        <AvatarImage src={formData.image} className="object-cover" />
                                        <AvatarFallback className="text-5xl bg-primary/5 text-primary font-light">
                                            {formData.firstName?.[0] || ""}{formData.lastName?.[0] || ""}
                                        </AvatarFallback>
                                    </Avatar>

                                    {formData.image && (
                                        <Button
                                            size="icon"
                                            variant="destructive"
                                            className="absolute -top-2 -right-2 h-9 w-9 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
                                            onClick={() => setFormData(prev => ({ ...prev, image: "" }))}
                                            type="button"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>

                                <div className="w-full max-w-[200px]">
                                    <UploadDropzone
                                        endpoint="profileImage"
                                        onClientUploadComplete={(res) => {
                                            if (res && res[0]) {
                                                setFormData(prev => ({ ...prev, image: res[0].url }));
                                                toast.success("Profile picture updated");
                                            }
                                        }}
                                        onUploadError={(error: Error) => {
                                            toast.error(`Error: ${error.message}`);
                                        }}
                                        appearance={{
                                            button: "bg-primary text-primary-foreground hover:bg-primary/90 text-xs py-2 h-8",
                                            container: "w-full p-0 border-dashed border-2 border-primary/20 rounded-lg min-h-[60px] bg-primary/5 hover:bg-primary/10 transition-colors",
                                            label: "text-xs text-muted-foreground",
                                            allowedContent: "hidden"
                                        }}
                                        content={{
                                            label: "Upload / Drop Image",
                                            button: "Upload Photo"
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Form Fields */}
                            <div className="flex-1 space-y-6 w-full">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">First Name</Label>
                                        <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} className="h-11 transition-all focus:ring-2 focus:ring-primary/20" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">Last Name</Label>
                                        <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} className="h-11 transition-all focus:ring-2 focus:ring-primary/20" required />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className="h-11 transition-all focus:ring-2 focus:ring-primary/20" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} className="h-11 transition-all focus:ring-2 focus:ring-primary/20" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="nif">NIF / Tax ID</Label>
                                        <Input id="nif" name="nif" value={formData.nif} onChange={handleChange} className="h-11 transition-all focus:ring-2 focus:ring-primary/20" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Date of Birth</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full h-11 justify-start text-left font-normal bg-background/50 border-input hover:bg-accent transition-all",
                                                        !formData.dob && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {formData.dob ? format(formData.dob, "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={formData.dob}
                                                    onSelect={(date) => setFormData(prev => ({ ...prev, dob: date }))}
                                                    initialFocus
                                                    captionLayout="dropdown"
                                                    startMonth={new Date(1950, 0)}
                                                    endMonth={new Date(new Date().getFullYear(), 11)}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Physical Address</Label>
                                    <Input id="address" name="address" value={formData.address} onChange={handleChange} className="h-11 transition-all focus:ring-2 focus:ring-primary/20" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card glass className="p-0 overflow-hidden border-border/40">
                    <div className="bg-muted/30 px-6 py-4 border-b border-border/40">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            Identification Documents
                        </h3>
                    </div>
                    <CardContent className="p-8">
                        {formData.documents.length === 0 ? (
                            <div className="text-center py-10 bg-accent/5 rounded-xl border border-dashed border-border/60">
                                <p className="text-sm text-muted-foreground">No documents added yet.</p>
                                <Button type="button" variant="outline" size="sm" onClick={addDocument} className="mt-4 gap-2">
                                    <Plus className="h-4 w-4" /> Add Document
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {formData.documents.map((doc: any, index: number) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="grid grid-cols-12 gap-4 items-end bg-accent/10 p-4 rounded-xl border border-border/40 group relative"
                                    >
                                        <div className="col-span-12 md:col-span-4 space-y-2">
                                            <Label className="text-[10px] uppercase text-muted-foreground tracking-widest font-bold">Type</Label>
                                            <Input placeholder="Passport, ID, etc." value={doc.type} onChange={(e) => handleDocumentChange(index, "type", e.target.value)} className="bg-background/50" />
                                        </div>
                                        <div className="col-span-12 md:col-span-4 space-y-2">
                                            <Label className="text-[10px] uppercase text-muted-foreground tracking-widest font-bold">Number / ID</Label>
                                            <Input placeholder="Document number" value={doc.value} onChange={(e) => handleDocumentChange(index, "value", e.target.value)} className="bg-background/50" />
                                        </div>
                                        <div className="col-span-10 md:col-span-3 space-y-2">
                                            <Label className="text-[10px] uppercase text-muted-foreground tracking-widest font-bold">Expiry Date</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-background/50", !doc.validity && "text-muted-foreground")}>
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {doc.validity ? format(new Date(doc.validity), "dd/MM/yy") : "Expiry"}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={doc.validity ? new Date(doc.validity) : undefined} onSelect={(date) => handleDocumentChange(index, "validity", date)} /></PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className="col-span-2 md:col-span-1 flex justify-center">
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeDocument(index)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </motion.div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={addDocument} className="w-full h-10 border-dashed hover:border-primary/50 hover:bg-primary/5 transition-all">
                                    <Plus className="h-4 w-4 mr-2" /> Add Another Document
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {!isSelfService && (
                    <Card glass className="p-0 overflow-hidden border-border/40">
                        <div className="bg-muted/30 px-6 py-4 border-b border-border/40">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-foreground">Security & System Roles</h3>
                                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary">Admin Only</Badge>
                            </div>
                        </div>
                        <CardContent className="p-8 space-y-6">
                            <p className="text-xs text-muted-foreground mb-4 italic">Assign high-level system permissions. Only Owner, SuperUser, or Tech can modify these.</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { id: "owner", label: "Owner", color: "bg-red-500/10 text-red-600 border-red-500/20" },
                                    { id: "admin", label: "Admin", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
                                    { id: "hr", label: "HR", color: "bg-green-500/10 text-green-600 border-green-500/20" },
                                    { id: "tech", label: "Tech", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
                                ].map((role) => (
                                    <div
                                        key={role.id}
                                        onClick={() => {
                                            const currentRoles = formData.roles || [];
                                            const newRoles = currentRoles.includes(role.id)
                                                ? currentRoles.filter((r: string) => r !== role.id)
                                                : [...currentRoles, role.id];
                                            setFormData(prev => ({ ...prev, roles: newRoles }));
                                        }}
                                        className={cn(
                                            "group cursor-pointer p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-2",
                                            (formData.roles || []).includes(role.id)
                                                ? cn(role.color, "shadow-lg scale-[1.02]")
                                                : "bg-background/50 border-border hover:border-primary/30"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-3 h-3 rounded-full border-2 transition-all",
                                            (formData.roles || []).includes(role.id) ? "bg-current border-transparent ring-2 ring-offset-2 ring-offset-background" : "border-muted-foreground/30"
                                        )} />
                                        <span className="text-sm font-bold uppercase tracking-wider">{role.label}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {!isSelfService && (
                    <Card glass className="p-0 overflow-hidden border-border/40">
                        <div className="bg-muted/30 px-6 py-4 border-b border-border/40">
                            <h3 className="text-lg font-semibold text-foreground">Employment & Contract</h3>
                        </div>
                        <CardContent className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <Label>Employment Type</Label>
                                    <Select value={formData.contract.employmentType} onValueChange={(val) => handleContractChange("employmentType", val)}>
                                        <SelectTrigger className="h-11 bg-background/50"><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="Contracted">Contracted</SelectItem><SelectItem value="Freelancer">Freelancer</SelectItem><SelectItem value="Extra">Extra</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="weeklyHours">Weekly Hours</Label>
                                    <Input id="weeklyHours" type="number" value={formData.contract.weeklyHours} onChange={(e) => handleContractChange("weeklyHours", Number(e.target.value))} className="h-11 bg-background/50" />
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="vacation-allowed" className="text-base">Vacation Entitlement</Label>
                                    <p className="text-xs text-muted-foreground">Allows the employee to request paid leave.</p>
                                </div>
                                <Switch id="vacation-allowed" checked={formData.contract.vacationAllowed} onCheckedChange={(checked) => handleContractChange("vacationAllowed", checked)} />
                            </div>

                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Standard Working Days</Label>
                                <div className="flex flex-wrap gap-3">
                                    {DAYS.map((day) => (
                                        <div key={day.value} onClick={() => handleDayToggle(day.value)} className={cn(
                                            "flex-1 min-w-[100px] p-3 rounded-xl border cursor-pointer transition-all text-center select-none",
                                            formData.contract.workingDays.includes(day.value)
                                                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.05]"
                                                : "bg-background/50 border-border hover:border-primary/30"
                                        )}>
                                            <span className="text-sm font-semibold">{day.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {!isSelfService && isPrivileged && (
                    <Card glass className="p-0 overflow-hidden border-border/40">
                        <div className="bg-primary/5 px-6 py-4 border-b border-primary/10">
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                Vacation Balance Management
                                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary">Override Only</Badge>
                            </h3>
                        </div>
                        <CardContent className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-2">
                                    <Label htmlFor="defaultDays">Annual Allowance (Current Year)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="defaultDays"
                                            type="number"
                                            value={formData.vacationTracker.defaultDays}
                                            onChange={(e) => handleVacationTrackerChange("defaultDays", Number(e.target.value))}
                                            className="h-11 bg-background/50"
                                        />
                                        <span className="text-xs font-bold text-muted-foreground">DAYS</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic">Standard entitlement for the contract.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="rolloverDays">Rollover (From Previous Year)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="rolloverDays"
                                            type="number"
                                            value={formData.vacationTracker.rolloverDays}
                                            onChange={(e) => handleVacationTrackerChange("rolloverDays", Number(e.target.value))}
                                            className="h-11 bg-background/50"
                                        />
                                        <span className="text-xs font-bold text-muted-foreground">DAYS</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic">Carry over from the last period.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="usedDays">Used Days (Correction)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="usedDays"
                                            type="number"
                                            value={formData.vacationTracker.usedDays}
                                            onChange={(e) => handleVacationTrackerChange("usedDays", Number(e.target.value))}
                                            className="h-11 bg-background/50"
                                        />
                                        <span className="text-xs font-bold text-muted-foreground">DAYS</span>
                                    </div>
                                    <p className="text-[10px] text-orange-500 font-bold uppercase tracking-tight">Used as manual correction only.</p>
                                </div>
                            </div>

                            <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border flex justify-between items-center">
                                <div className="text-sm font-medium">Resulting Total Balance:</div>
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col items-end">
                                        <div className="text-2xl font-black text-primary">
                                            {(formData.vacationTracker.defaultDays + formData.vacationTracker.rolloverDays) - formData.vacationTracker.usedDays}
                                        </div>
                                        <div className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Available Days Remaining</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="flex items-center justify-between pt-4 bg-muted/20 p-6 rounded-2xl border border-border/40">
                    <p className="text-sm text-muted-foreground">Ensure all required fields are filled before saving.</p>
                    <div className="flex gap-3">
                        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isLoading}>Cancel</Button>
                        <Button type="submit" disabled={isLoading} className="h-11 px-10 font-semibold shadow-xl shadow-primary/20">
                            {isLoading ? "Saving..." : (isEdit ? "Update Employee" : "Create Employee")}
                        </Button>
                    </div>
                </div>
            </motion.div>
        </form>
    );
}
