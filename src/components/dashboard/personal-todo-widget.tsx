"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Calendar, CheckCircle2, FileText, Clock, StickyNote, ArrowRight, Pencil } from "lucide-react";
import { createNote, toggleNoteCompletion, deleteNote, updateNote } from "@/lib/actions/personal-todo.actions";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";

interface PersonalTodoWidgetProps {
    initialTodos: any[];
    userId: string;
}

export function PersonalTodoWidget({ initialTodos, userId }: PersonalTodoWidgetProps) {
    const [notes, setNotes] = useState(initialTodos);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("all");

    // Form State
    const [isEditMode, setIsEditMode] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isTask, setIsTask] = useState(false);
    const [deadline, setDeadline] = useState("");

    const resetForm = () => {
        setTitle("");
        setContent("");
        setIsTask(false);
        setDeadline("");
        setIsEditMode(false);
        setEditId(null);
    };

    const handleOpenCreate = () => {
        resetForm();
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (note: any) => {
        setTitle(note.title);
        setContent(note.content);
        setIsTask(note.isTask);
        setDeadline(note.deadline ? new Date(note.deadline).toISOString().split('T')[0] : "");
        setEditId(note._id);
        setIsEditMode(true);
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!content.trim()) return;

        if (isEditMode && editId) {
            // Optimistic Update
            setNotes(prev => prev.map(n => n._id === editId ? {
                ...n, title, content, isTask, deadline: deadline ? new Date(deadline).toISOString() : undefined
            } : n));

            setIsDialogOpen(false);
            const res = await updateNote(editId, { title, content, isTask, deadline });
            if (!res.success) toast.error("Failed to update");
        } else {
            // Create
            const optimisticId = Math.random().toString();
            const newNote = {
                _id: optimisticId, userId, title: title || "Note", content, isTask,
                deadline: deadline ? new Date(deadline).toISOString() : undefined,
                completed: false, createdAt: new Date().toISOString()
            };
            setNotes([newNote, ...notes]);
            setIsDialogOpen(false);

            const res = await createNote({ userId, title, content, isTask, deadline });
            if (res.success) {
                setNotes(prev => prev.map(n => n._id === optimisticId ? res.note : n));
            } else {
                setNotes(prev => prev.filter(n => n._id !== optimisticId));
                toast.error("Failed to create");
            }
        }
        resetForm();
    };

    const handleToggle = async (id: string, current: boolean) => {
        setNotes(prev => prev.map(n => n._id === id ? {
            ...n,
            completed: !current,
            completedAt: !current ? new Date().toISOString() : undefined
        } : n));
        await toggleNoteCompletion(id, !current);
    };

    const handleDelete = async (id: string) => {
        setNotes(prev => prev.filter(n => n._id !== id));
        await deleteNote(id);
    };

    // Filter Logic
    const uncompletedTasks = notes.filter(n => n.isTask && !n.completed);
    const completedTasks = notes.filter(n => n.isTask && n.completed);
    const genericNotes = notes.filter(n => !n.isTask);

    let displayItems: any[] = [];
    if (activeTab === "all") {
        displayItems = [...uncompletedTasks, ...genericNotes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (activeTab === "tasks") {
        displayItems = uncompletedTasks.sort((a, b) => {
            // Sort by deadline if exists, else created
            if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    } else {
        displayItems = genericNotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const NoteItem = ({ note }: { note: any }) => (
        <div className={cn(
            "w-full group relative flex flex-col gap-3 p-4 rounded-xl border bg-card hover:shadow-sm transition-all duration-200",
            note.completed ? "opacity-60 bg-muted/10 border-transparent" : "hover:border-primary/50",
            note.isTask && !note.completed && note.deadline && new Date(note.deadline) < new Date() && "border-destructive/30 bg-destructive/5"
        )}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    {note.isTask ? (
                        <Checkbox
                            checked={note.completed}
                            onCheckedChange={() => handleToggle(note._id, note.completed)}
                            className="mt-1 h-5 w-5 rounded-md border-2"
                        />
                    ) : (
                        <div className="mt-1 bg-primary/10 p-1.5 rounded-md text-primary shrink-0">
                            <FileText className="h-4 w-4" />
                        </div>
                    )}

                    <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h4 className={cn("font-semibold text-sm truncate", note.completed && "line-through text-muted-foreground")}>
                                {note.title || "Untitled Note"}
                            </h4>
                            {note.isTask && note.deadline && (
                                <Badge variant={new Date(note.deadline) < new Date() && !note.completed ? "destructive" : "outline"} className="h-5 px-1.5 text-[10px] gap-1 font-normal ml-auto shrink-0">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(note.deadline), "MMM d")}
                                </Badge>
                            )}
                        </div>
                        <p className={cn("text-xs text-muted-foreground whitespace-pre-wrap break-words line-clamp-3 leading-relaxed", note.completed && "line-through opacity-70")}>
                            {note.content}
                        </p>
                    </div>
                </div>

                <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => handleOpenEdit(note)}>
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(note._id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t mt-auto text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> Created {note.createdAt ? format(new Date(note.createdAt), "MMM d") : 'Today'}
                </span>
                {note.completedAt && (
                    <span className="flex items-center gap-1 text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3" /> Uncheck
                    </span>
                )}
            </div>
        </div>
    );

    return (
        <Card className="h-full flex flex-col shadow-sm border-l-4 border-l-primary/50 relative">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between bg-muted/5">
                <div className="space-y-1">
                    <CardTitle className="text-md font-semibold flex items-center gap-2">
                        <StickyNote className="h-4 w-4 text-primary" />
                        Personal Workflow
                    </CardTitle>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleOpenCreate}>
                            <Plus className="h-3.5 w-3.5" /> New
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{isEditMode ? "Edit Item" : "Create New Note / Task"}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="flex items-center space-x-2">
                                <Switch id="is-task" checked={isTask} onCheckedChange={setIsTask} />
                                <Label htmlFor="is-task">Mark as Actionable Task?</Label>
                            </div>
                            <div className="space-y-2">
                                <Label>Title (Optional)</Label>
                                <Input placeholder="e.g. Ideas for Menu" value={title} onChange={e => setTitle(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Content</Label>
                                <Textarea placeholder={isTask ? "What needs to be done?" : "Write your thoughts..."} className="resize-none" rows={4} value={content} onChange={e => setContent(e.target.value)} />
                            </div>
                            {isTask && (
                                <div className="space-y-2">
                                    <Label>Deadline</Label>
                                    <DatePicker
                                        date={deadline}
                                        setDate={(d) => setDeadline(d ? d.toISOString().split('T')[0] : "")}
                                        placeholder="Select deadline"
                                    />
                                </div>
                            )}
                            <Button onClick={handleSave} className="w-full" disabled={!content.trim()}>
                                {isEditMode ? "Save Changes" : (isTask ? "Create Task" : "Create Note")}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardHeader>

            <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                    <div className="px-4 pt-2 border-b w-full overflow-x-auto scrollbar-hide">
                        <TabsList className="w-max justify-start h-9 bg-transparent p-0">
                            <TabsTrigger value="all" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 text-xs">All</TabsTrigger>
                            <TabsTrigger value="tasks" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 text-xs">Tasks</TabsTrigger>
                            <TabsTrigger value="notes" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 text-xs">Notes</TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 w-full overflow-y-auto min-h-0 bg-secondary/5">
                        <div className="flex flex-col gap-3 p-4">
                            {displayItems.length === 0 && activeTab !== 'tasks' && (
                                <div className="text-center py-10 text-muted-foreground text-sm w-full border border-dashed rounded-lg bg-muted/20">
                                    No items found. Create your first note or task!
                                </div>
                            )}

                            {displayItems.map(note => <NoteItem key={note._id} note={note} />)}

                            {/* Completed Tasks Section - Only in Tasks Tab */}
                            {activeTab === 'tasks' && completedTasks.length > 0 && (
                                <div className="mt-8">
                                    <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        <CheckCircle2 className="h-3 w-3" /> Completed
                                        <div className="h-px bg-border flex-1" />
                                    </div>
                                    <div className="flex flex-col gap-3 opacity-60 hover:opacity-100 transition-opacity">
                                        {completedTasks.map(note => (
                                            <div key={note._id} className="relative group bg-muted/20 border border-transparent rounded-lg p-3 flex items-start gap-3 hover:bg-card hover:shadow-sm">
                                                <Checkbox checked={true} onCheckedChange={() => handleToggle(note._id, true)} className="mt-1 h-4 w-4" />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-medium line-through text-muted-foreground">{note.title}</h4>
                                                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                                                        <span>Created: {format(new Date(note.createdAt), "MMM d")}</span>
                                                        <span>•</span>
                                                        <span>Completed: {note.completedAt ? format(new Date(note.completedAt), "MMM d") : 'Recent'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleOpenEdit(note)}><Pencil className="h-3 w-3" /></Button>
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDelete(note._id)}><Trash2 className="h-3 w-3" /></Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Tabs>
            </CardContent>

            <div className="p-2 border-t bg-muted/5 flex justify-center">
                <Button variant="ghost" size="sm" className="h-7 text-xs w-full text-muted-foreground hover:text-primary" asChild>
                    <Link href="/dashboard/notes">
                        View Full Page <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                </Button>
            </div>
        </Card>
    );
}
