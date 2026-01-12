"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, X, ListTodo, Users, Building2, Briefcase, Search } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { createTask } from "@/lib/actions/task.actions";
import { ScrollArea } from "@/components/ui/scroll-area";

// Assume we fetch these lists from props or API context
// For simplicity in this iteration, passing as props or mocking could work, 
// but fetching inside is better for standalone.
// We'll require props for the lists to keep it generic.

interface CreateTaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentUserId: string;
    currentUser: any;
    stores?: any[];
    managers?: any[]; // List of potential assignees
    storeDepartments?: any[];
    initialAssignments?: { type: string; id: string; label: string }[];
    taskToEdit?: any;
}

const EMPTY_ARRAY: any[] = [];

export function CreateTaskDialog({
    open,
    onOpenChange,
    currentUserId,
    currentUser,
    stores = EMPTY_ARRAY,
    managers: allEmployees = EMPTY_ARRAY, // Renamed for clarity since it contains all
    storeDepartments = EMPTY_ARRAY,
    initialAssignments = EMPTY_ARRAY,
    taskToEdit
}: CreateTaskDialogProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("medium");
    const [deadline, setDeadline] = useState("");
    const [requiresSubmission, setRequiresSubmission] = useState(false);

    // Required Files State
    const [requiredFileNames, setRequiredFileNames] = useState<string[]>([]);
    const [newRequiredFile, setNewRequiredFile] = useState("");

    // Assignment Builder State
    const [assignments, setAssignments] = useState<{ type: string; id: string; label: string }[]>(initialAssignments);

    // Sanitize inputs to ensure they are arrays (handle null passed from parent)
    const safeStores = Array.isArray(stores) ? stores : [];
    const safeEmployees = Array.isArray(allEmployees) ? allEmployees : [];
    const safeDepts = Array.isArray(storeDepartments) ? storeDepartments : [];

    // RBAC Logic
    const rawRoles = currentUser?.roles;
    const roles = (Array.isArray(rawRoles) ? rawRoles : []).map((r: string) => r?.toLowerCase().replace(/ /g, "_") || "");
    const isGlobalAdmin = roles.some((r: string) => ["admin", "owner", "hr", "super_user"].includes(r));
    const isStoreManager = roles.includes("store_manager");
    const isStoreDeptHead = roles.includes("store_department_head");
    const isGlobalHead = roles.includes("department_head"); // Global Dept Head

    // Filter available entities based on role
    const availableStores = (isGlobalAdmin || isGlobalHead) ? safeStores : (
        (isStoreManager || isStoreDeptHead) && currentUser.storeId
            ? safeStores.filter(s => s._id === (currentUser.storeId._id || currentUser.storeId))
            : []
    );

    const availableDepts = (isGlobalAdmin || isGlobalHead) ? safeDepts : (
        isStoreManager && currentUser.storeId
            ? safeDepts.filter(d => d.storeId === (currentUser.storeId._id || currentUser.storeId))
            : isStoreDeptHead && currentUser.storeDepartmentId
                ? safeDepts.filter(d => d._id === (currentUser.storeDepartmentId._id || currentUser.storeDepartmentId))
                : []
    );

    const availableEmployees = (isGlobalAdmin || isGlobalHead) ? safeEmployees : (
        (isStoreManager || isStoreDeptHead) && currentUser.storeId
            ? safeEmployees.filter(e => e.storeId === (currentUser.storeId._id || currentUser.storeId))
            : []
    );
    // Note: Store Dept Head should technically only see employees in their Dept, handled in scope logic below or filter here.
    const deptHeadEmployees = isStoreDeptHead && currentUser.storeDepartmentId
        ? availableEmployees.filter(e => e.storeDepartmentId === (currentUser.storeDepartmentId._id || currentUser.storeDepartmentId))
        : availableEmployees;


    // Temporary selection state
    const [scope, setScope] = useState("");
    const [selectedEntityId, setSelectedEntityId] = useState("");
    const [selectedSubOption, setSelectedSubOption] = useState("all");
    const [employeeSearch, setEmployeeSearch] = useState("");
    const [empFilterStore, setEmpFilterStore] = useState("all");
    const [empFilterDept, setEmpFilterDept] = useState("all");

    // Determine default scope on open or role change
    useEffect(() => {
        if (open) {
            if (taskToEdit) {
                setTitle(taskToEdit.title);
                setDescription(taskToEdit.description || "");
                setPriority(taskToEdit.priority);
                setDeadline(taskToEdit.deadline ? new Date(taskToEdit.deadline).toISOString().split('T')[0] : "");
                setRequiresSubmission(taskToEdit.requiresSubmission || false);
                setRequiredFileNames(taskToEdit.requiredFileNames || []);
                setTodos(taskToEdit.todos?.map((t: any) => t.text) || []);
                setAssignments([]);
            } else {
                setTitle("");
                setDescription("");
                setPriority("medium");
                setDeadline("");
                setRequiresSubmission(false);
                setRequiredFileNames([]);
                setTodos([]);
                if (initialAssignments.length > 0) {
                    setAssignments(initialAssignments);
                } else {
                    setAssignments([]);
                }
            }

            if (isGlobalAdmin) setScope("global");
            else if (isStoreManager) setScope("store");
            else if (isStoreDeptHead) setScope("department");
            else setScope("individual"); // Fallback
        }
    }, [open, isGlobalAdmin, isStoreManager, isStoreDeptHead, initialAssignments]);

    // Auto-select entity if only one exists
    useEffect(() => {
        if (scope === 'store' && availableStores.length === 1) {
            setSelectedEntityId(availableStores[0]._id);
        }
        if (scope === 'department' && availableDepts.length === 1) {
            setSelectedEntityId(availableDepts[0]._id);
        }
    }, [scope, availableStores, availableDepts]);

    // Todos
    const [todos, setTodos] = useState<string[]>([]);
    const [newTodo, setNewTodo] = useState("");

    const handleAddTodo = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTodo.trim()) {
            setTodos([...todos, newTodo.trim()]);
            setNewTodo("");
        }
    };

    const removeTodo = (idx: number) => {
        setTodos(todos.filter((_, i) => i !== idx));
    };

    const handleAddRequiredFile = (e: React.FormEvent) => {
        e.preventDefault();
        if (newRequiredFile.trim()) {
            setRequiredFileNames([...requiredFileNames, newRequiredFile.trim()]);
            setNewRequiredFile("");
        }
    };

    const removeRequiredFile = (idx: number) => {
        setRequiredFileNames(requiredFileNames.filter((_, i) => i !== idx));
    };

    const addAssignment = () => {
        if (!selectedEntityId && scope !== 'global') return;

        let newAssignment: { type: string; id: string; label: string } | null = null;

        if (scope === 'individual') {
            const list = isStoreDeptHead ? deptHeadEmployees : availableEmployees;
            const user = list.find(u => u._id === selectedEntityId);
            if (user) {
                newAssignment = {
                    type: 'individual',
                    id: String(user._id),
                    label: `👤 ${user.firstName} ${user.lastName}`
                };
            }
        }
        else if (scope === 'store') {
            const store = availableStores.find(s => s._id === selectedEntityId);
            if (store) {
                const type = selectedSubOption === 'managers' ? 'store_managers' : 'store_all';
                const labelSuffix = selectedSubOption === 'managers' ? '(Managers Only)' : '(All Staff)';
                newAssignment = {
                    type: type,
                    id: String(store._id),
                    label: `🏪 Store: ${store.name} ${labelSuffix}`
                };
            }
        }
        else if (scope === 'department') {
            const dept = availableDepts.find(d => d._id === selectedEntityId);
            if (dept) {
                newAssignment = {
                    type: 'store_department_all',
                    id: String(dept._id),
                    label: `📂 Dept: ${dept.name}`
                };
            }
        }
        else if (scope === 'global') {
            // Only Admin/Owner/HR/SuperUser
            if (selectedSubOption === 'all') {
                newAssignment = { type: 'global_all', id: 'all', label: '🌍 Entire Company' };
            } else if (selectedSubOption === 'store_managers') {
                newAssignment = { type: 'global_role', id: 'store_manager', label: '🌍 All Store Managers' };
            } else if (selectedSubOption === 'dept_heads') {
                newAssignment = { type: 'global_role', id: 'store_department_head', label: '🌍 All Dept Heads' };
            }
        }

        if (newAssignment) {
            if (!assignments.some(a => a.type === newAssignment!.type && a.id === newAssignment!.id)) {
                setAssignments([...assignments, newAssignment]);
            }
            // Reset selection slightly for convenience? Keep scope usually.
        }
    };

    const removeAssignment = (idx: number) => {
        setAssignments(assignments.filter((_, i) => i !== idx));
    };

    const handleSubmit = async () => {
        if (!title.trim()) return;

        if (taskToEdit) {
            const { updateTask } = await import("@/lib/actions/task.actions");
            const res = await updateTask(taskToEdit._id, {
                title,
                description,
                priority,
                deadline,
                requiresSubmission,
                requiredFileNames,
                todos
            });
            if (res.success) {
                onOpenChange(false);
            }
            return;
        }

        if (assignments.length === 0) return;

        // Simplify assignments for backend
        const payloadAssignments = assignments.map(a => ({ type: a.type, id: a.id }));

        const res = await createTask({
            title,
            description,
            priority,
            deadline,
            assignments: payloadAssignments,
            todos,
            creatorId: currentUserId,
            requiresSubmission,
            requiredFileNames
        });

        if (res.success) {
            onOpenChange(false);
            toast.success("Task created successfully");
            // Reset state
            setTitle("");
            setDescription("");
            setTodos([]);
            setRequiresSubmission(false);
            setRequiredFileNames([]);
            setAssignments(initialAssignments);
        } else {
            toast.error(res.error || "Failed to create task");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Task Title</Label>
                            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Read New Safety Policy" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Priority</Label>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Deadline</Label>
                                <DatePicker
                                    date={deadline}
                                    setDate={(d) => setDeadline(d ? d.toISOString().split('T')[0] : "")}
                                    placeholder="Select deadline"
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="desc">Description</Label>
                            <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="submission"
                                checked={requiresSubmission}
                                onCheckedChange={(checked) => setRequiresSubmission(checked as boolean)}
                            />
                            <Label htmlFor="submission" className="font-medium cursor-pointer">
                                Require File Submission
                            </Label>
                        </div>

                        {requiresSubmission && (
                            <div className="space-y-3 bg-muted/20 p-3 rounded-md border">
                                <Label className="text-xs font-semibold uppercase text-muted-foreground">Required Files (Optional Checklist)</Label>
                                <div className="space-y-2">
                                    {requiredFileNames.map((name, idx) => (
                                        <div key={idx} className="flex items-center gap-2 group">
                                            <div className="flex-1 text-sm p-2 bg-background border rounded-md font-medium">
                                                {name}
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeRequiredFile(idx)}
                                                className="h-8 w-8 p-0 opacity-50 group-hover:opacity-100 hover:text-red-500"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <div className="flex gap-2">
                                        <Input
                                            value={newRequiredFile}
                                            onChange={(e) => setNewRequiredFile(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddRequiredFile(e)}
                                            placeholder="e.g. Safety Cert, ID Card"
                                            className="flex-1 h-9 text-sm"
                                        />
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="secondary"
                                            onClick={handleAddRequiredFile}
                                            className="h-9 w-9 p-0"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        Define specific files to be uploaded. If left empty, a single generic upload slot will be shown.
                                    </p>
                                </div>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Assignees must upload a file (Image/PDF) to complete this task (e.g., ID Scan, Report).
                        </p>
                    </div>

                    {/* Todos */}
                    <div className="space-y-3 border-t pt-4">
                        <Label className="flex items-center gap-2">
                            <ListTodo className="h-4 w-4" /> Checklist
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                value={newTodo}
                                onChange={e => setNewTodo(e.target.value)}
                                placeholder="Add a subtask..."
                                onKeyDown={e => e.key === 'Enter' && handleAddTodo(e)}
                            />
                            <Button type="button" size="sm" onClick={handleAddTodo} variant="secondary">Add</Button>
                        </div>
                        <ul className="space-y-2">
                            {todos.map((todo, i) => (
                                <li key={i} className="flex justify-between items-center bg-muted/30 px-3 py-2 rounded text-sm">
                                    <span>{todo}</span>
                                    <button onClick={() => removeTodo(i)} className="text-muted-foreground hover:text-destructive">
                                        <X className="h-4 w-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Assignments - Enhanced */}
                    {!taskToEdit && (
                        <div className="space-y-3 border-t pt-4">
                            <Label>Assign To <span className="text-muted-foreground font-normal">(Multiple selections allowed)</span></Label>

                            {/* Selector Area */}
                            <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                                <div className="flex gap-2">
                                    <div className="w-1/3">
                                        <Label className="text-xs mb-1 block text-muted-foreground">Scope</Label>
                                        <Select value={scope} onValueChange={(v) => { setScope(v); setSelectedEntityId(""); setSelectedSubOption("all"); }}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="individual">Individual</SelectItem>
                                                {(isGlobalAdmin || isStoreManager) && <SelectItem value="store">Store Team</SelectItem>}
                                                {(isGlobalAdmin || isStoreManager || isStoreDeptHead) && <SelectItem value="department">Department</SelectItem>}
                                                {(isGlobalAdmin || isGlobalHead) && <SelectItem value="global">{(isGlobalHead ? "My Global Dept" : "Company Wide")}</SelectItem>}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex-1">
                                        <Label className="text-xs mb-1 block text-muted-foreground">Target</Label>

                                        {scope === 'individual' && (
                                            <div className="space-y-3 p-3 border rounded-md bg-background/50">
                                                <div className="grid grid-cols-2 gap-2">
                                                    {(isGlobalAdmin || availableStores.length > 1) && (
                                                        <Select value={empFilterStore} onValueChange={setEmpFilterStore}>
                                                            <SelectTrigger className="h-8 text-xs bg-background">
                                                                <SelectValue placeholder="Filter Store" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="all">All Stores</SelectItem>
                                                                {availableStores.map(s => (
                                                                    <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}

                                                    <Select value={empFilterDept} onValueChange={setEmpFilterDept}>
                                                        <SelectTrigger className="h-8 text-xs bg-background">
                                                            <SelectValue placeholder="Filter Dept" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">All Depts</SelectItem>
                                                            {availableDepts.map(d => (
                                                                <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="relative">
                                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                                    <Input
                                                        placeholder="Search by name..."
                                                        className="h-8 pl-8 text-xs bg-background"
                                                        value={employeeSearch}
                                                        onChange={(e) => setEmployeeSearch(e.target.value)}
                                                    />
                                                </div>

                                                <ScrollArea className="h-[180px] w-full rounded-md border bg-background">
                                                    <div className="p-2 space-y-1">
                                                        {(isStoreDeptHead ? deptHeadEmployees : availableEmployees)
                                                            .filter(e => {
                                                                if (empFilterStore !== 'all' && (e.storeId?._id || e.storeId) !== empFilterStore) return false;
                                                                if (empFilterDept !== 'all' && (e.storeDepartmentId?._id || e.storeDepartmentId || e.departmentId) !== empFilterDept) return false;
                                                                if (employeeSearch) {
                                                                    const full = `${e.firstName} ${e.lastName}`.toLowerCase();
                                                                    if (!full.includes(employeeSearch.toLowerCase())) return false;
                                                                }
                                                                return true;
                                                            })
                                                            .map(e => (
                                                                <div
                                                                    key={e._id}
                                                                    className={`flex items-center gap-2 p-2 rounded-sm cursor-pointer text-sm transition-colors ${selectedEntityId === e._id ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"}`}
                                                                    onClick={() => setSelectedEntityId(e._id)}
                                                                >
                                                                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${selectedEntityId === e._id ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"}`}>
                                                                        {e.firstName?.[0]}{e.lastName?.[0]}
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        {e.firstName} {e.lastName}
                                                                        <div className={`text-[10px] ${selectedEntityId === e._id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                                                            {e.position || "Employee"}
                                                                        </div>
                                                                    </div>
                                                                    {selectedEntityId === e._id && <Users className="h-3 w-3" />}
                                                                </div>
                                                            ))}

                                                        {(isStoreDeptHead ? deptHeadEmployees : availableEmployees).filter(e => {
                                                            if (empFilterStore !== 'all' && (e.storeId?._id || e.storeId) !== empFilterStore) return false;
                                                            if (empFilterDept !== 'all' && (e.storeDepartmentId?._id || e.storeDepartmentId || e.departmentId) !== empFilterDept) return false;
                                                            if (employeeSearch) {
                                                                const full = `${e.firstName} ${e.lastName}`.toLowerCase();
                                                                if (!full.includes(employeeSearch.toLowerCase())) return false;
                                                            }
                                                            return true;
                                                        }).length === 0 && (
                                                                <div className="text-center py-8 text-xs text-muted-foreground">
                                                                    No employees found.
                                                                </div>
                                                            )}
                                                    </div>
                                                </ScrollArea>
                                            </div>
                                        )}

                                        {scope === 'store' && (
                                            <div className="flex gap-2">
                                                <Select value={selectedEntityId} onValueChange={setSelectedEntityId} disabled={availableStores.length === 1}>
                                                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select Store..." /></SelectTrigger>
                                                    <SelectContent>
                                                        {availableStores.map(s => (
                                                            <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Select value={selectedSubOption} onValueChange={setSelectedSubOption}>
                                                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">All Employees</SelectItem>
                                                        <SelectItem value="managers">Managers Only</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        {scope === 'department' && (
                                            <Select value={selectedEntityId} onValueChange={setSelectedEntityId} disabled={availableDepts.length === 1}>
                                                <SelectTrigger><SelectValue placeholder="Select Department..." /></SelectTrigger>
                                                <SelectContent>
                                                    {availableDepts.map(d => (
                                                        <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}

                                        {scope === 'global' && (
                                            <Select value={selectedSubOption} onValueChange={setSelectedSubOption}>
                                                <SelectTrigger><SelectValue placeholder="Select Group..." /></SelectTrigger>
                                                <SelectContent>
                                                    {isGlobalAdmin ? (
                                                        <>
                                                            <SelectItem value="all">Entire Company (Every Employee)</SelectItem>
                                                            <SelectItem value="store_managers">All Store Managers</SelectItem>
                                                            <SelectItem value="dept_heads">All Department Heads</SelectItem>
                                                        </>
                                                    ) : (
                                                        <SelectItem value="dept_global">All Departments (In my scope)</SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                </div>

                                <Button
                                    type="button"
                                    className="w-full"
                                    onClick={addAssignment}
                                    disabled={
                                        (scope === 'individual' && !selectedEntityId) ||
                                        (scope === 'store' && !selectedEntityId) ||
                                        (scope === 'department' && !selectedEntityId)
                                    }
                                >
                                    <Plus className="h-4 w-4 mr-2" /> Add to List
                                </Button>
                            </div>

                            {/* Selected Chips */}
                            <div className="flex flex-wrap gap-2 mt-2 min-h-[40px]">
                                {assignments.length === 0 && <span className="text-sm text-muted-foreground italic py-2">No recipients added yet.</span>}
                                {assignments.map((a, idx) => (
                                    <Badge key={idx} variant="secondary" className="gap-2 py-1 pl-2 pr-1">
                                        {a.label}
                                        <div
                                            className="rounded-full hover:bg-destructive hover:text-destructive-foreground p-0.5 cursor-pointer transition-colors"
                                            onClick={() => removeAssignment(idx)}
                                        >
                                            <X className="h-3 w-3" />
                                        </div>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!title || (!taskToEdit && assignments.length === 0)}>
                        {taskToEdit ? "Save Changes" : `Create ${assignments.length > 1 ? `Tasks (${assignments.length})` : 'Task'}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
