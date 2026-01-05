"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
    getSystemSettings,
    updateScheduleRules,
    getAllStoresForConfig,
    updateStoreStaffing,
    getAllDepartmentsForConfig,
    updateDepartmentStaffing,
    updateCompanyProfile,
    getShiftDefinitions,
    updateShiftConfig
} from "@/lib/actions/settings.actions";
import { Loader2, Save, Upload, Building } from "lucide-react";
import { UploadButton } from "@/lib/uploadthing"; // Ensure this component exists or use core uploadthing
import Image from "next/image";

import { useRouter } from "@/i18n/routing";
import { useSession } from "next-auth/react";
import { hasAccess } from "@/lib/rbac";
import { AccessDenied } from "@/components/auth/access-denied";

export default function SettingsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    const [hasPageAccess, setHasPageAccess] = useState<boolean | null>(null);

    useEffect(() => {
        if (status === "loading") return;

        const roles = (session?.user as any)?.roles || ["employee"];
        const permissions = (session?.user as any)?.permissions || [];

        if (!hasAccess(roles, "/dashboard/settings", "", permissions)) {
            setHasPageAccess(false);
        } else {
            setHasPageAccess(true);
        }
    }, [session, status]);

    // Company Profile State
    const [company, setCompany] = useState({
        name: "",
        address: "",
        taxNumber: "",
        logo: ""
    });

    // Schedule Rules State
    const [scheduleRules, setScheduleRules] = useState({
        deadlineDay: 2,
        deadlineTime: "17:00",
        alertEnabled: true
    });

    // Staffing State
    const [stores, setStores] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [shifts, setShifts] = useState<any[]>([]);

    useEffect(() => {
        const loadData = async () => {
            const [settingsRes, storesRes, deptsRes, shiftsRes] = await Promise.all([
                getSystemSettings(),
                getAllStoresForConfig(),
                getAllDepartmentsForConfig(),
                getShiftDefinitions()
            ]);

            if (settingsRes.success) {
                if (settingsRes.settings?.scheduleRules) setScheduleRules(settingsRes.settings.scheduleRules);
                // Assume settings also returns company-level root data if we adjust action, 
                // but for now let's assume getSystemSettings returns the company doc
                const c = settingsRes.settings || {};
                setCompany({
                    name: c.name || "",
                    address: c.address || "",
                    taxNumber: c.taxNumber || "",
                    logo: c.logo || ""
                });
            }

            if (storesRes.success) setStores(storesRes.stores);
            if (deptsRes.success) setDepartments(deptsRes.departments);
            if (shiftsRes.success) setShifts(shiftsRes.shifts);

            setLoading(false);
        };
        loadData();
    }, []);

    const handleSaveProfile = async () => {
        const res = await updateCompanyProfile(company);
        if (res.success) toast.success("Company profile updated");
        else toast.error("Failed to update profile");
    };

    const handleSaveScheduleRules = async () => {
        const res = await updateScheduleRules(scheduleRules);
        if (res.success) toast.success("Schedule rules updated");
        else toast.error("Failed to update rules");
    };

    const handleUpdateStore = async (id: string, min: number, max: number) => {
        const res = await updateStoreStaffing(id, min, max);
        if (res.success) toast.success("Store limit updated");
    };

    const handleUpdateDept = async (id: string, min: number, target: number, max: number) => {
        const res = await updateDepartmentStaffing(id, min, target, max);
        if (res.success) toast.success("Department limits updated");
    };

    const handleUpdateShift = async (id: string, max: number) => {
        const res = await updateShiftConfig(id, max);
        if (res.success) toast.success("Shift limit updated");
    };

    if (status === "loading" || loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    if (hasPageAccess === false) {
        return <AccessDenied />;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
                <p className="text-muted-foreground">Manage company profile, rules, and staffing limits.</p>
            </div>

            <Tabs defaultValue="company" className="space-y-4">
                <TabsList className="grid grid-cols-5 w-full max-w-4xl">
                    <TabsTrigger value="company">Company</TabsTrigger>
                    <TabsTrigger value="general">Rules</TabsTrigger>
                    <TabsTrigger value="stores">Stores</TabsTrigger>
                    <TabsTrigger value="departments">Departments</TabsTrigger>
                    <TabsTrigger value="shifts">Shift Limits</TabsTrigger>
                </TabsList>

                {/* COMPANY TAB */}
                <TabsContent value="company">
                    <Card>
                        <CardHeader>
                            <CardTitle>Company Profile</CardTitle>
                            <CardDescription>Update your company branding and details.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 max-w-xl">
                            <div className="flex items-center gap-6">
                                <div className="shrink-0">
                                    {company.logo ? (
                                        <div className="relative h-24 w-24 rounded-lg overflow-hidden border">
                                            <Image src={company.logo} alt="Logo" fill className="object-cover" />
                                        </div>
                                    ) : (
                                        <div className="h-24 w-24 rounded-lg border bg-muted flex items-center justify-center">
                                            <Building className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>Company Logo</Label>
                                    <UploadButton
                                        endpoint="profileImage"
                                        onClientUploadComplete={(res) => {
                                            if (res?.[0]) {
                                                setCompany(prev => ({ ...prev, logo: res[0].url }));
                                                toast.success("Logo uploaded");
                                            }
                                        }}
                                        onUploadError={(error: Error) => {
                                            toast.error(`Error: ${error.message}`);
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>Company Name</Label>
                                <Input value={company.name} onChange={e => setCompany(p => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Address</Label>
                                <Input value={company.address} onChange={e => setCompany(p => ({ ...p, address: e.target.value }))} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Tax ID / NIF</Label>
                                <Input value={company.taxNumber} onChange={e => setCompany(p => ({ ...p, taxNumber: e.target.value }))} />
                            </div>

                            <Button onClick={handleSaveProfile}><Save className="mr-2 h-4 w-4" /> Save Profile</Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* GENERAL RULES TAB */}
                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>Schedule Deadlines</CardTitle>
                            <CardDescription>
                                Set the deadline for when next week's schedule must be sent for approval.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 max-w-md">
                            <div className="grid gap-2">
                                <Label>Deadline Day</Label>
                                <Select
                                    value={String(scheduleRules.deadlineDay)}
                                    onValueChange={(v) => setScheduleRules(prev => ({ ...prev, deadlineDay: parseInt(v) }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select day" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
                                            <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label>Deadline Time</Label>
                                <Input
                                    type="time"
                                    value={scheduleRules.deadlineTime}
                                    onChange={(e) => setScheduleRules(prev => ({ ...prev, deadlineTime: e.target.value }))}
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={scheduleRules.alertEnabled}
                                    onCheckedChange={(checked) => setScheduleRules(prev => ({ ...prev, alertEnabled: checked }))}
                                />
                                <Label>Enable Alerts for Managers</Label>
                            </div>

                            <Button onClick={handleSaveScheduleRules} className="w-full">
                                <Save className="mr-2 h-4 w-4" /> Save Rules
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* STORES TAB */}
                <TabsContent value="stores">
                    <Card>
                        <CardHeader>
                            <CardTitle>Store Staffing Limits</CardTitle>
                            <CardDescription>
                                Set the minimum and maximum employees required for each store.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {stores.map(store => (
                                    <div key={store._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-card gap-4">
                                        <div className="font-medium text-lg">{store.name}</div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-28">
                                                <Label className="text-xs text-muted-foreground">Min</Label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    defaultValue={store.minEmployees}
                                                    onFocus={(e) => e.target.value === "0" && (e.target.value = "")}
                                                    onBlur={(e) => {
                                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                                        e.target.value = val.toString();
                                                        handleUpdateStore(store._id, val, store.maxEmployees);
                                                    }}
                                                />
                                            </div>
                                            <div className="w-28">
                                                <Label className="text-xs text-muted-foreground">Max</Label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    defaultValue={store.maxEmployees || 0}
                                                    onFocus={(e) => e.target.value === "0" && (e.target.value = "")}
                                                    onBlur={(e) => {
                                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                                        e.target.value = val.toString();
                                                        handleUpdateStore(store._id, store.minEmployees, val);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* DEPARTMENTS TAB */}
                <TabsContent value="departments">
                    <Card>
                        <CardHeader>
                            <CardTitle>Department Staffing Rules</CardTitle>
                            <CardDescription>
                                Set minimum, target, and max staffing per department.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {(() => {
                                    const grouped = departments.reduce((acc: any, dept) => {
                                        const storeName = dept.storeId?.name || "Global / Unassigned";
                                        if (!acc[storeName]) acc[storeName] = [];
                                        acc[storeName].push(dept);
                                        return acc;
                                    }, {});
                                    const storeNames = Object.keys(grouped);

                                    return (
                                        <Accordion type="multiple" defaultValue={storeNames} className="w-full space-y-2">
                                            {storeNames.map((storeName) => (
                                                <AccordionItem key={storeName} value={storeName} className="border rounded-lg bg-card/50 px-4">
                                                    <AccordionTrigger className="hover:no-underline py-3">
                                                        <div className="flex items-center gap-2 font-bold text-lg text-primary">
                                                            <Building className="h-4 w-4" />
                                                            {storeName}
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent>
                                                        <div className="grid gap-3 pt-2">
                                                            {grouped[storeName].map((dept: any) => (
                                                                <div key={dept._id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg bg-background hover:bg-muted/30 transition-colors gap-4">
                                                                    <div>
                                                                        <div className="font-semibold text-base">{dept.name}</div>
                                                                        <div className="text-xs text-muted-foreground">Staffing Targets</div>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-24">
                                                                            <Label className="text-xs text-muted-foreground mb-1 block">Min</Label>
                                                                            <Input
                                                                                type="number"
                                                                                min={0}
                                                                                defaultValue={dept.minEmployees || 0}
                                                                                onFocus={(e) => e.target.value === "0" && (e.target.value = "")}
                                                                                onBlur={(e) => {
                                                                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                                                                    e.target.value = val.toString();
                                                                                    handleUpdateDept(dept._id, val, dept.targetEmployees, dept.maxEmployees);
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <div className="w-24">
                                                                            <Label className="text-xs text-muted-foreground mb-1 block">Target</Label>
                                                                            <Input
                                                                                type="number"
                                                                                min={0}
                                                                                defaultValue={dept.targetEmployees || 0}
                                                                                onFocus={(e) => e.target.value === "0" && (e.target.value = "")}
                                                                                onBlur={(e) => {
                                                                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                                                                    e.target.value = val.toString();
                                                                                    handleUpdateDept(dept._id, dept.minEmployees, val, dept.maxEmployees);
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <div className="w-24">
                                                                            <Label className="text-xs text-muted-foreground mb-1 block">Max</Label>
                                                                            <Input
                                                                                type="number"
                                                                                min={0}
                                                                                defaultValue={dept.maxEmployees || 0}
                                                                                onFocus={(e) => e.target.value === "0" && (e.target.value = "")}
                                                                                onBlur={(e) => {
                                                                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                                                                    e.target.value = val.toString();
                                                                                    handleUpdateDept(dept._id, dept.minEmployees, dept.targetEmployees, val);
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    );
                                })()}
                                {departments.length === 0 && <p className="text-muted-foreground">No departments found.</p>}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SHIFTS TAB */}
                <TabsContent value="shifts">
                    <Card>
                        <CardHeader>
                            <CardTitle>Shift Limits</CardTitle>
                            <CardDescription>
                                Set maximum headcount for specific shifts. Grouped by Store and Department.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                                {(() => {
                                    const grouped = shifts.reduce((acc: any, shift) => {
                                        const storeName = shift.storeDepartmentId?.storeId?.name || "Unassigned Store";
                                        const deptName = shift.storeDepartmentId?.name || "Unassigned Dept";

                                        if (!acc[storeName]) acc[storeName] = {};
                                        if (!acc[storeName][deptName]) acc[storeName][deptName] = [];

                                        acc[storeName][deptName].push(shift);
                                        return acc;
                                    }, {});
                                    const storeNames = Object.keys(grouped);

                                    return (
                                        <Accordion type="multiple" className="w-full space-y-4">
                                            {storeNames.map((storeName) => (
                                                <AccordionItem key={storeName} value={storeName} className="border rounded-lg bg-card/50 px-4">
                                                    <AccordionTrigger className="hover:no-underline py-3">
                                                        <div className="flex items-center gap-2 font-bold text-xl">
                                                            <Building className="h-5 w-5 text-primary" />
                                                            {storeName}
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent>
                                                        <div className="pl-2 pr-2 pt-2 pb-4">
                                                            <Accordion type="multiple" className="w-full space-y-2">
                                                                {Object.entries(grouped[storeName]).map(([deptName, deptShifts]: [string, any]) => (
                                                                    <AccordionItem key={deptName} value={deptName} className="border rounded-md bg-background px-3">
                                                                        <AccordionTrigger className="hover:no-underline py-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                                                            {deptName}
                                                                        </AccordionTrigger>
                                                                        <AccordionContent>
                                                                            <div className="grid gap-3 pt-2 pb-2">
                                                                                {deptShifts.map((shift: any) => (
                                                                                    <div key={shift._id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                                                                                        <div>
                                                                                            <div className="font-medium">{shift.name}</div>
                                                                                            <div className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded inline-block mt-1">
                                                                                                {shift.startTime} - {shift.endTime}
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="w-24">
                                                                                            <Label className="text-xs text-muted-foreground mb-1 block">Max Info</Label>
                                                                                            <Input
                                                                                                type="number"
                                                                                                min={0}
                                                                                                placeholder="Unltd"
                                                                                                defaultValue={shift.maxAllowedHeadcount || 0}
                                                                                                onFocus={(e) => e.target.value === "0" && (e.target.value = "")}
                                                                                                onBlur={(e) => {
                                                                                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                                                                                    e.target.value = val.toString();
                                                                                                    handleUpdateShift(shift._id, val);
                                                                                                }}
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </AccordionContent>
                                                                    </AccordionItem>
                                                                ))}
                                                            </Accordion>
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    );
                                })()}
                                {shifts.length === 0 && <p className="text-muted-foreground text-sm p-4">No shift definitions found.</p>}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
