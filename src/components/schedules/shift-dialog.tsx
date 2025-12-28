"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getShiftDefinitions, createShiftDefinition } from "@/lib/actions/shift-template.actions";
import { Plus, Users, X, Trash2, Check } from "lucide-react";
import { getAvailableEmployees } from "@/lib/actions/schedule-employee.actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
    "#3b82f6", // Blue 500
    "#ef4444", // Red 500
    "#10b981", // Emerald 500
    "#f59e0b", // Amber 500
    "#8b5cf6", // Violet 500
    "#ec4899", // Pink 500
    "#06b6d4", // Cyan 500
    "#f97316", // Orange 500
];

export function ShiftDialog({
    open,
    onOpenChange,
    date,
    storeId,
    storeDepartmentId,
    initialData,
    onSave,
    onDelete
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    date: Date;
    storeId: string;
    storeDepartmentId?: string;
    initialData?: any;
    onSave: (shiftData: any) => void;
    onDelete?: () => void;
}) {
    // State
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Form State
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("17:00");
    const [shiftName, setShiftName] = useState("Custom Shift");
    const [notes, setNotes] = useState("");
    const [breakMinutes, setBreakMinutes] = useState(0);
    const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
    const [isOvertime, setIsOvertime] = useState(false);
    const [requiredHeadcount, setRequiredHeadcount] = useState(0);

    // Day Off Mode
    const [isDayOff, setIsDayOff] = useState(false);

    // Alert State
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    // Template Creation State
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState("");
    const [templateRequiredHeadcount, setTemplateRequiredHeadcount] = useState(0);

    // Employee Selection State
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
    const [employeeFilter, setEmployeeFilter] = useState<"department" | "global">("department");

    useEffect(() => {
        if (open) {
            loadTemplates();
            loadEmployees();

            if (initialData) {
                // Pre-fill for editing
                setStartTime(initialData.startTime || "");
                setEndTime(initialData.endTime || "");
                setShiftName(initialData.shiftName || "Custom Shift");
                setNotes(initialData.notes || "");
                setBreakMinutes(initialData.breakMinutes || 0);
                setSelectedColor(initialData.color || PRESET_COLORS[0]);
                setSelectedEmployeeIds(initialData.employees?.map((e: any) => e._id) || []);
                setIsDayOff(initialData.shiftName === "Day Off");
                setIsOvertime(initialData.isOvertime || false);
                setRequiredHeadcount(initialData.requiredHeadcount || 0);
            } else {
                // Reset defaults for new
                setStartTime("09:00");
                setEndTime("17:00");
                setShiftName("Custom Shift");
                setNotes("");
                setBreakMinutes(0);
                setSelectedColor(PRESET_COLORS[0]);
                setSelectedEmployeeIds([]);
                setIsDayOff(false);
                setIsOvertime(false);
                setRequiredHeadcount(0);
            }

            // Default to department if ID is provided
            if (storeDepartmentId) {
                setEmployeeFilter("department");
            } else {
                setEmployeeFilter("global");
            }
            setIsCreatingTemplate(false);
        } else {
            // Reset on close
            setSelectedEmployeeIds([]);
            setBreakMinutes(0);
            setIsDayOff(false);
        }
    }, [open, storeDepartmentId, initialData]);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const temps = await getShiftDefinitions(storeDepartmentId);
            setTemplates(temps);
        } finally {
            setLoading(false);
        }
    };

    const loadEmployees = async () => {
        const emps = await getAvailableEmployees(storeId);
        setEmployees(emps);
    };

    const handleSave = () => {
        // Find full employee objects
        const selectedEmps = employees.filter(e => selectedEmployeeIds.includes(e._id));

        if (isDayOff) {
            onSave({
                shiftName: "Day Off",
                startTime: "",
                endTime: "",
                breakMinutes: 0,
                color: "#94a3b8", // Slate 400 for day off
                notes,
                employees: selectedEmps
            });
        } else {
            onSave({
                shiftName,
                startTime,
                endTime,
                breakMinutes,
                color: selectedColor,
                notes,
                isOvertime,
                requiredHeadcount,
                employees: selectedEmps
            });
        }

        onOpenChange(false);
    };

    const handleCreateTemplate = async () => {
        if (!newTemplateName) return;
        setLoading(true);
        try {
            await createShiftDefinition({
                name: newTemplateName,
                startTime: startTime,
                endTime: endTime,
                breakMinutes: breakMinutes,
                color: selectedColor,
                storeDepartmentId: storeDepartmentId // Scope to department if available
            });
            await loadTemplates();
            setIsCreatingTemplate(false);
            setNewTemplateName("");
        } catch (error) {
            console.error("Failed to create template", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleEmployee = (id: string) => {
        setSelectedEmployeeIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Filter employees based on active tab
    const filteredEmployees = employees.filter(emp => {
        if (employeeFilter === "global") return true;
        if (employeeFilter === "department" && storeDepartmentId) {
            return emp.storeDepartmentId === storeDepartmentId;
        }
        return true;
    });

    const handleDelete = () => {
        if (onDelete) {
            onDelete();
            setDeleteConfirmOpen(false);
            onOpenChange(false);
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="flex flex-row items-center justify-between">
                        <DialogTitle>{initialData ? "Edit Shift" : "Create Shift"} for {date.toLocaleDateString()}</DialogTitle>
                        <div className="flex gap-2 mr-8">
                            {!isDayOff && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-dashed text-muted-foreground hover:text-foreground hover:border-foreground"
                                    onClick={() => {
                                        setIsDayOff(true);
                                        setShiftName("Day Off");
                                    }}
                                >
                                    Mark as Day Off
                                </Button>
                            )}
                            {isDayOff && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                        setIsDayOff(false);
                                        setShiftName("Custom Shift");
                                        setStartTime("09:00");
                                        setEndTime("17:00");
                                    }}
                                >
                                    Set Working Shift
                                </Button>
                            )}
                        </div>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Step 1: Time/Template */}
                        {!isDayOff && (
                            <div className="space-y-4">
                                <Label className="text-base font-semibold">1. Select Shift Details</Label>

                                {isCreatingTemplate ? (
                                    <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-medium">New Template</h4>
                                            <Button variant="ghost" size="sm" onClick={() => setIsCreatingTemplate(false)}><X className="h-4 w-4" /></Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label>Template Name</Label>
                                                <Input value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} placeholder="e.g. Morning Shift" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label>Break (min)</Label>
                                                <Input type="number" value={breakMinutes} onChange={e => setBreakMinutes(Number(e.target.value))} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label>Start</Label>
                                                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label>End</Label>
                                                <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                                            </div>
                                            {/* Color Picker in Creation */}
                                            <div className="col-span-2 space-y-2">
                                                <Label>Color Code</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {PRESET_COLORS.map(color => (
                                                        <button
                                                            key={color}
                                                            className={cn(
                                                                "w-6 h-6 rounded-full transition-all hover:scale-110 focus:outline-none ring-offset-2",
                                                                selectedColor === color && "ring-2 ring-foreground scale-110"
                                                            )}
                                                            style={{ backgroundColor: color }}
                                                            onClick={(e) => { e.preventDefault(); setSelectedColor(color); }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                        </div>
                                        <Button className="w-full" onClick={handleCreateTemplate} disabled={!newTemplateName}>Save Template</Button>
                                    </div>
                                ) : (
                                    <>
                                        <Tabs defaultValue="template" className="w-full">
                                            <TabsList className="grid w-full grid-cols-2">
                                                <TabsTrigger value="template">Templates</TabsTrigger>
                                                <TabsTrigger value="custom">Custom Shift</TabsTrigger>
                                            </TabsList>
                                            <TabsContent value="template">
                                                {loading ? <p>Loading templates...</p> : (
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {templates.map(t => (
                                                            <div
                                                                key={t._id}
                                                                className={cn(
                                                                    "p-3 border rounded-lg cursor-pointer transition-colors relative overflow-hidden",
                                                                    selectedTemplate === t._id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                                                                )}
                                                                onClick={() => {
                                                                    setSelectedTemplate(t._id);
                                                                    setStartTime(t.startTime);
                                                                    setEndTime(t.endTime);
                                                                    setShiftName(t.name);
                                                                    setBreakMinutes(t.breakMinutes || 0);
                                                                    setSelectedColor(t.color || PRESET_COLORS[0]);
                                                                }}
                                                            >
                                                                {/* Color Strip */}
                                                                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: t.color || PRESET_COLORS[0] }} />

                                                                <div className="pl-2">
                                                                    <div className="font-semibold">{t.name}</div>
                                                                    <div className="text-sm text-muted-foreground">{t.startTime} - {t.endTime}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <div
                                                            className="p-4 border border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/50"
                                                            onClick={() => setIsCreatingTemplate(true)}
                                                        >
                                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                                <Plus className="h-6 w-6" />
                                                                <span>Create Template</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </TabsContent>
                                            <TabsContent value="custom">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <Label>Start</Label>
                                                        <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label>End</Label>
                                                        <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label>Name</Label>
                                                        <Input value={shiftName} onChange={e => setShiftName(e.target.value)} />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label>Break (min)</Label>
                                                        <Input type="number" value={breakMinutes} onChange={e => setBreakMinutes(Number(e.target.value))} />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label>Required Staff</Label>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            value={requiredHeadcount}
                                                            onChange={e => setRequiredHeadcount(Number(e.target.value))}
                                                        />
                                                    </div>
                                                    {/* Color Picker Custom */}
                                                    <div className="col-span-2 space-y-2">
                                                        <Label>Color Code</Label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {PRESET_COLORS.map(color => (
                                                                <button
                                                                    key={color}
                                                                    className={cn(
                                                                        "w-6 h-6 rounded-full transition-all hover:scale-110 focus:outline-none ring-offset-2",
                                                                        selectedColor === color && "ring-2 ring-foreground scale-110"
                                                                    )}
                                                                    style={{ backgroundColor: color }}
                                                                    onClick={(e) => { e.preventDefault(); setSelectedColor(color); }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TabsContent>
                                        </Tabs>

                                        <div className="flex items-center space-x-2 mt-2">
                                            <Switch id="overtime-mode" checked={isOvertime} onCheckedChange={setIsOvertime} />
                                            <Label htmlFor="overtime-mode">Extra Overtime</Label>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}


                        {/* Step 2: Employees */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-semibold">2. Assign Employees ({selectedEmployeeIds.length})</Label>
                                {/* Tabs for filtering */}
                                <div className="flex items-center gap-2 bg-muted p-1 rounded-md">
                                    {storeDepartmentId && (
                                        <button
                                            onClick={() => setEmployeeFilter("department")}
                                            className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${employeeFilter === "department" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                                        >
                                            Department
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setEmployeeFilter("global")}
                                        className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${employeeFilter === "global" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                                    >
                                        Global / All
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto border border-border rounded-lg p-3 bg-muted/20">
                                {filteredEmployees.length === 0 ? (
                                    <div className="col-span-full py-12 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                                        <Users className="h-8 w-8 opacity-20" />
                                        <span>No employees found in this view.</span>
                                    </div>
                                ) : (
                                    filteredEmployees.map(emp => (
                                        <div
                                            key={emp._id}
                                            onClick={() => toggleEmployee(emp._id)}
                                            className={cn(
                                                "flex items-center gap-2 p-2.5 rounded-md cursor-pointer border transition-all",
                                                selectedEmployeeIds.includes(emp._id)
                                                    ? 'bg-primary/10 border-primary text-primary shadow-sm'
                                                    : 'hover:bg-accent border-transparent text-foreground'
                                            )}
                                        >
                                            <Avatar className="h-7 w-7 border border-background">
                                                <AvatarImage src={emp.image} />
                                                <AvatarFallback className="text-[10px] bg-muted">{emp.firstName[0]}{emp.lastName[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="overflow-hidden">
                                                <div className="text-xs font-semibold truncate">{emp.firstName} {emp.lastName}</div>
                                                <div className="text-[10px] text-muted-foreground truncate">{emp.positionId?.name}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Step 3: Notes */}
                        <div className="space-y-2">
                            <Label className="text-base font-semibold">3. Notes</Label>
                            <Input placeholder="Instructions..." value={notes} onChange={e => setNotes(e.target.value)} />
                        </div>
                    </div>

                    <DialogFooter className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex gap-2 w-full sm:w-auto">
                            {initialData && onDelete && (
                                <Button variant="destructive" className="w-full sm:w-auto" onClick={() => setDeleteConfirmOpen(true)}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remove Shift
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto justify-end">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button onClick={handleSave}>
                                {initialData ? "Save Changes" : "Create Shift"}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this shift from the schedule.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
