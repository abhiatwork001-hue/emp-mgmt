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
import { Plus, X, ListTodo, Users, Building2, Briefcase } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { createTask } from "@/lib/actions/task.actions";

// Assume we fetch these lists from props or API context
// For simplicity in this iteration, passing as props or mocking could work, 
// but fetching inside is better for standalone.
// We'll require props for the lists to keep it generic.

interface CreateTaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentUserId: string;
    currentUser: any;
    stores: any[];
    managers: any[]; // List of potential assignees
    storeDepartments: any[];
}

export function CreateTaskDialog({
    open,
    onOpenChange,
    currentUserId,
    currentUser,
    stores,
    managers: allEmployees, // Renamed for clarity since it contains all
    storeDepartments
}: CreateTaskDialogProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("medium");
    const [deadline, setDeadline] = useState("");

    // Assignment Builder State
    const [assignments, setAssignments] = useState<{ type: string; id: string; label: string }[]>([]);

    // RBAC Logic
    const roles = (currentUser?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
    const isGlobalAdmin = roles.some((r: string) => ["admin", "owner", "hr", "super_user"].includes(r));
    const isStoreManager = roles.includes("store_manager");
    const isStoreDeptHead = roles.includes("store_department_head");
    const isGlobalHead = roles.includes("department_head"); // Global Dept Head

    // Filter available entities based on role
    const availableStores = isGlobalAdmin ? stores : (
        (isStoreManager || isStoreDeptHead) && currentUser.storeId
            ? stores.filter(s => s._id === (currentUser.storeId._id || currentUser.storeId))
            : []
    );

    const availableDepts = isGlobalAdmin ? storeDepartments : (
        isStoreManager && currentUser.storeId
            ? storeDepartments.filter(d => d.storeId === (currentUser.storeId._id || currentUser.storeId))
            : isStoreDeptHead && currentUser.storeDepartmentId
                ? storeDepartments.filter(d => d._id === (currentUser.storeDepartmentId._id || currentUser.storeDepartmentId))
                : []
    );

    const availableEmployees = isGlobalAdmin ? allEmployees : (
        (isStoreManager || isStoreDeptHead) && currentUser.storeId
            ? allEmployees.filter(e => e.storeId === (currentUser.storeId._id || currentUser.storeId))
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

    // Determine default scope on open or role change
    useEffect(() => {
        if (open) {
            if (isGlobalAdmin) setScope("global");
            else if (isStoreManager) setScope("store");
            else if (isStoreDeptHead) setScope("department");
            else setScope("individual"); // Fallback
        }
    }, [open, isGlobalAdmin, isStoreManager, isStoreDeptHead]);

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

    const addAssignment = () => {
        if (!selectedEntityId && scope !== 'global') return;

        let newAssignment: { type: string; id: string; label: string } | null = null;

        if (scope === 'individual') {
            const list = isStoreDeptHead ? deptHeadEmployees : availableEmployees;
            const user = list.find(u => u._id === selectedEntityId);
            if (user) {
                newAssignment = {
                    type: 'individual',
                    id: user._id,
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
                    id: store._id,
                    label: `🏪 Store: ${store.name} ${labelSuffix}`
                };
            }
        }
        else if (scope === 'department') {
            const dept = availableDepts.find(d => d._id === selectedEntityId);
            if (dept) {
                newAssignment = {
                    type: 'store_department_all',
                    id: dept._id,
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
        if (!title || assignments.length === 0) return;

        // Simplify assignments for backend
        const payloadAssignments = assignments.map(a => ({ type: a.type, id: a.id }));

        const res = await createTask({
            title,
            description,
            priority,
            deadline,
            assignments: payloadAssignments,
            todos,
            creatorId: currentUserId
        });

        if (res.success) {
            onOpenChange(false);
            // Reset state
            setTitle("");
            setDescription("");
            setTodos([]);
            setAssignments([]);
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
                                        <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                                            <SelectTrigger><SelectValue placeholder="Select Employee..." /></SelectTrigger>
                                            <SelectContent>
                                                {(isStoreDeptHead ? deptHeadEmployees : availableEmployees).map(m => (
                                                    <SelectItem key={m._id} value={m._id}>{m.firstName} {m.lastName}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
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

                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!title || assignments.length === 0}>
                        Create {assignments.length > 1 ? `Tasks (${assignments.length} groups)` : 'Task'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
