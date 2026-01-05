"use client";

import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getShiftDefinitions, createShiftDefinition, updateShiftDefinition, deleteShiftDefinition } from "@/lib/actions/shift-template.actions";
import { Plus, Users, X, Trash2, Check, AlertCircle, Search, Pencil, Clock } from "lucide-react";
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
    onDelete,
    absences = [],
    currentDayShifts = []
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    date: Date;
    storeId: string;
    storeDepartmentId?: string;
    initialData?: any;
    onSave: (shiftData: any) => void;
    onDelete?: () => void;
    absences?: any[];
    currentDayShifts?: any[];
}) {
    // State
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [employeeFilter, setEmployeeFilter] = useState<'global' | 'department'>('global');
    const [searchQuery, setSearchQuery] = useState("");

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
    const [limitConfirmOpen, setLimitConfirmOpen] = useState(false); // New state for headcount warning

    // Form State
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("17:00");
    const [shiftName, setShiftName] = useState("Custom Shift");
    const [notes, setNotes] = useState("");
    const [breakMinutes, setBreakMinutes] = useState(0);
    const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
    const [isOvertime, setIsOvertime] = useState(false);
    const [requiredHeadcount, setRequiredHeadcount] = useState(0);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
    const [isDayOff, setIsDayOff] = useState(false);
    const [saveAsTemplate, setSaveAsTemplate] = useState(true);

    // Template Creation State
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [newTemplateName, setNewTemplateName] = useState("");
    const [templateRequiredHeadcount, setTemplateRequiredHeadcount] = useState(0);

    // Limit State
    const [maxHeadcount, setMaxHeadcount] = useState<number | null>(null);

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
                // Try to find if this shift matches a template to set max limit?
                // Difficult if initialData doesn't store templateId. 
                // For now, limits might not persist on Edit unless we stored templateId.
                // But user flow implies "creating" is critical.
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
                setRequiredHeadcount(0);
                setMaxHeadcount(null);
                setSaveAsTemplate(true);
            }

            // Default to department if ID is provided
            if (storeDepartmentId) {
                setEmployeeFilter("department");
            } else {
                setEmployeeFilter("global");
            }
            setIsCreatingTemplate(false);
            setEditingTemplateId(null);
            setNewTemplateName("");
        } else {
            // Reset on close
            setSelectedEmployeeIds([]);
            setBreakMinutes(0);
            setIsDayOff(false);
            setMaxHeadcount(null);
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
        // Check limit
        if (maxHeadcount && selectedEmployeeIds.length > maxHeadcount) {
            setLimitConfirmOpen(true);
            return;
        }
        executeSave();
    };

    const executeSave = () => {
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
                employees: selectedEmps,
                // Pass back violation status if needed, or rely on parent validation
            });
        }

        onOpenChange(false);

        // Auto-Save Template Logic
        if (saveAsTemplate && !isDayOff && shiftName && startTime && endTime) {
            // Fire and forget - don't block closing
            createShiftDefinition({
                name: shiftName,
                startTime: startTime,
                endTime: endTime,
                breakMinutes: breakMinutes,
                color: selectedColor,
                maxAllowedHeadcount: requiredHeadcount || 0,
                storeDepartmentId: storeDepartmentId
            }).catch(err => console.error("Failed to auto-save template", err));
        }
    };

    const handleCreateTemplate = async () => {
        if (!newTemplateName) return;
        setLoading(true);
        try {
            if (editingTemplateId) {
                await updateShiftDefinition(editingTemplateId, {
                    name: newTemplateName,
                    startTime: startTime,
                    endTime: endTime,
                    breakMinutes: breakMinutes,
                    color: selectedColor,
                    maxAllowedHeadcount: templateRequiredHeadcount,
                });
            } else {
                await createShiftDefinition({
                    name: newTemplateName,
                    startTime: startTime,
                    endTime: endTime,
                    breakMinutes: breakMinutes,
                    color: selectedColor,
                    maxAllowedHeadcount: templateRequiredHeadcount, // Save limit
                    storeDepartmentId: storeDepartmentId // Scope to department if available
                });
            }
            await loadTemplates();
            setIsCreatingTemplate(false);
            setEditingTemplateId(null);
            setNewTemplateName("");
        } catch (error) {
            console.error("Failed to create template", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTemplate = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDeleteTemplateId(id);
    };

    const confirmDeleteTemplate = async () => {
        if (!deleteTemplateId) return;
        setLoading(true);
        try {
            await deleteShiftDefinition(deleteTemplateId);
            await loadTemplates();
            if (selectedTemplate === deleteTemplateId) setSelectedTemplate(null);
        } catch (error) {
            console.error("Failed to delete template", error);
        } finally {
            setLoading(false);
            setDeleteTemplateId(null);
        }
    };

    const handleEditTemplate = (e: React.MouseEvent, t: any) => {
        e.stopPropagation();
        setEditingTemplateId(t._id);
        setNewTemplateName(t.name);
        setStartTime(t.startTime);
        setEndTime(t.endTime);
        setBreakMinutes(t.breakMinutes || 0);
        setSelectedColor(t.color || PRESET_COLORS[0]);
        setTemplateRequiredHeadcount(t.maxAllowedHeadcount || 0);
        setIsCreatingTemplate(true);
    };

    const toggleEmployee = (id: string) => {
        setSelectedEmployeeIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Filter employees based on active tab
    const filteredEmployees = employees.filter(emp => {
        // 1. Filter by Tab
        if (employeeFilter === "department" && storeDepartmentId) {
            if (emp.storeDepartmentId !== storeDepartmentId) return false;
        }

        // 2. Filter by Search Query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
            return fullName.includes(query);
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

    const enrichedEmployees = filteredEmployees.map(emp => {
        const isAbsent = absences.some((a: any) => {
            const absDate = new Date(a.date).toDateString();
            const shiftDate = date.toDateString();
            return absDate === shiftDate && a.employeeId === emp._id;
        });

        const isBusyInThisSchedule = currentDayShifts.some(shift => {
            const isInShift = shift.employees.some((e: any) => e._id === emp._id);
            if (!isInShift) return false;
            if (shift.shiftName === "Day Off") return false;

            const getM = (t: string) => {
                const [h, m] = t.split(':').map(Number);
                return h * 60 + (m || 0);
            };
            const startM = getM(startTime);
            const endM = getM(endTime);
            const shiftStartM = getM(shift.startTime);
            const shiftEndM = getM(shift.endTime);

            // Overlap: Start A < End B && End A > Start B
            return (startM < shiftEndM && endM > shiftStartM);
        });

        return { ...emp, isAbsent, isBusyInThisSchedule };
    });

    // Check limit
    const isOverLimit = maxHeadcount && selectedEmployeeIds.length > maxHeadcount;

    return (
        <>
            {/* Limit Confirmation Dialog */}
            <AlertDialog open={limitConfirmOpen} onOpenChange={setLimitConfirmOpen}>
                <AlertDialogContent className="bg-destructive/10 border-destructive/50">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5" />
                            Staffing Limit Exceeded
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-foreground">
                            You have selected <strong>{selectedEmployeeIds.length}</strong> employees, but the limit for this shift is <strong>{maxHeadcount}</strong>.
                            <br /><br />
                            Do you want to proceed anyway?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setLimitConfirmOpen(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { setLimitConfirmOpen(false); executeSave(); }} className="bg-destructive hover:bg-destructive/90">
                            Proceed (Override)
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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
                                            <h4 className="font-medium">{editingTemplateId ? "Edit Template" : "New Template"}</h4>
                                            <Button variant="ghost" size="sm" onClick={() => { setIsCreatingTemplate(false); setEditingTemplateId(null); }}><X className="h-4 w-4" /></Button>
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
                                            <div className="space-y-1">
                                                <Label>Max Staff Limit</Label>
                                                <Input type="number" value={templateRequiredHeadcount} onChange={e => setTemplateRequiredHeadcount(Number(e.target.value))} placeholder="Optional" />
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
                                        <Button className="w-full" onClick={handleCreateTemplate} disabled={!newTemplateName}>{editingTemplateId ? "Update Template" : "Save Template"}</Button>
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
                                                                    "relative group border rounded-lg transition-colors overflow-hidden",
                                                                    selectedTemplate === t._id ? 'border-primary bg-primary/5' : 'hover:border-primary/50 border-input'
                                                                )}
                                                            >
                                                                {/* Main Click Area */}
                                                                <div
                                                                    className="p-3 cursor-pointer h-full"
                                                                    onClick={() => {
                                                                        setSelectedTemplate(t._id);
                                                                        setStartTime(t.startTime);
                                                                        setEndTime(t.endTime);
                                                                        setShiftName(t.name);
                                                                        setBreakMinutes(t.breakMinutes || 0);
                                                                        setSelectedColor(t.color || PRESET_COLORS[0]);
                                                                        setMaxHeadcount(t.maxAllowedHeadcount || null);
                                                                    }}
                                                                >
                                                                    {/* Color Strip */}
                                                                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: t.color || PRESET_COLORS[0] }} />

                                                                    <div className="pl-2 pr-6">
                                                                        <div className="font-semibold truncate">{t.name}</div>
                                                                        <div className="text-sm text-muted-foreground">{t.startTime} - {t.endTime}</div>
                                                                        {t.maxAllowedHeadcount && (
                                                                            <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                                                                                <Users className="h-3 w-3" /> Max {t.maxAllowedHeadcount}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Hover Actions */}
                                                                <div className="absolute right-1 top-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                                    <button
                                                                        className="h-6 w-6 flex items-center justify-center rounded-md bg-background/80 hover:bg-background border shadow-sm text-muted-foreground hover:text-foreground"
                                                                        onClick={(e) => handleEditTemplate(e, t)}
                                                                        title="Edit Template"
                                                                    >
                                                                        <Pencil className="h-3 w-3" />
                                                                    </button>
                                                                    <button
                                                                        className="h-6 w-6 flex items-center justify-center rounded-md bg-background/80 hover:bg-destructive/10 border shadow-sm text-muted-foreground hover:text-destructive"
                                                                        onClick={(e) => handleDeleteTemplate(e, t._id)}
                                                                        title="Delete Template"
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <div
                                                            className="p-4 border border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/50"
                                                            onClick={() => {
                                                                setEditingTemplateId(null);
                                                                setNewTemplateName("");
                                                                setTemplateRequiredHeadcount(0);
                                                                setIsCreatingTemplate(true);
                                                            }}
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

                                                    <div className="col-span-2 flex items-center space-x-2 pt-2">
                                                        <Switch id="save-template" checked={saveAsTemplate} onCheckedChange={setSaveAsTemplate} />
                                                        <Label htmlFor="save-template" className="text-sm font-medium text-muted-foreground">
                                                            Save as Department Template
                                                        </Label>
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
                                <Label className="text-base font-semibold">
                                    2. Assign Employees ({selectedEmployeeIds.length} {maxHeadcount && `/ ${maxHeadcount}`})
                                </Label>
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

                            {/* Search Input */}
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search employees..."
                                    className="pl-9"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {isOverLimit && (
                                <div className="bg-destructive/10 border border-destructive/50 text-destructive text-sm px-3 py-2 rounded-md flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                    <AlertCircle className="h-4 w-4" />
                                    <span className="font-semibold">Staffing Limit Exceeded!</span>
                                    <span>Allowed: {maxHeadcount}, Selected: {selectedEmployeeIds.length}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto border border-border rounded-lg p-3 bg-muted/20">
                                {filteredEmployees.length === 0 ? (
                                    <div className="col-span-full py-12 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                                        <Users className="h-8 w-8 opacity-20" />
                                        <span>No employees found in this view.</span>
                                    </div>
                                ) : (
                                    enrichedEmployees.map((emp: any) => {
                                        const isSelected = selectedEmployeeIds.includes(emp._id);
                                        const isDisabled = emp.isAbsent || (emp.isBusyInThisSchedule && !isSelected); // Allow deselecting if already selected (e.g. editing)

                                        return (
                                            <div
                                                key={emp._id}
                                                onClick={() => !isDisabled && toggleEmployee(emp._id)}
                                                className={cn(
                                                    "flex items-center gap-3 p-2 rounded-md border text-left transition-all",
                                                    isSelected
                                                        ? "bg-primary/10 border-primary shadow-sm"
                                                        : isDisabled
                                                            ? "bg-muted/50 border-transparent opacity-60 cursor-not-allowed grayscale"
                                                            : "bg-background border-border hover:border-primary/50 cursor-pointer hover:shadow-sm"
                                                )}
                                            >
                                                <Avatar className="h-8 w-8 border">
                                                    <AvatarImage src={emp.image} />
                                                    <AvatarFallback>{emp.firstName?.[0]}{emp.lastName?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm font-medium truncate">{emp.firstName} {emp.lastName}</p>
                                                        {isSelected && <Check className="h-3 w-3 text-primary" />}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground truncate">{emp.positionId?.name || "Staff"}</p>
                                                    {emp.isAbsent && <span className="text-[10px] text-destructive font-medium flex items-center gap-1"><AlertCircle className="h-3 w-3" /> On Leave</span>}
                                                    {emp.isBusyInThisSchedule && !isSelected && <span className="text-[10px] text-amber-500 font-medium flex items-center gap-1"><Clock className="h-3 w-3" /> Scheduled</span>}
                                                </div>
                                            </div>
                                        )
                                    })

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
                </DialogContent >
            </Dialog >

            <AlertDialog open={!!deleteTemplateId} onOpenChange={(open) => !open && setDeleteTemplateId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove this shift template.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteTemplateId(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteTemplate} className="bg-destructive hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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
