"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
    Calendar,
    CheckCircle2,
    Clock,
    FileText,
    Plus,
    Trash2,
    StickyNote,
    Search,
    Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/ui/date-picker";
import { createNote, deleteNote, toggleNoteCompletion } from "@/lib/actions/personal-todo.actions";

interface NotesPageClientProps {
    initialNotes: any[];
    userId: string;
}

export function NotesPageClient({ initialNotes, userId }: NotesPageClientProps) {
    const [notes, setNotes] = useState(initialNotes);
    const [activeTab, setActiveTab] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Create Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isTask, setIsTask] = useState(false);
    const [deadline, setDeadline] = useState("");

    const handleCreate = async () => {
        if (!content.trim()) return;

        const optimisticId = Math.random().toString();
        const optimisticNote = {
            _id: optimisticId,
            title: title || "Note",
            content,
            isTask,
            deadline: deadline ? new Date(deadline) : undefined,
            completed: false,
            createdAt: new Date().toISOString()
        };

        setNotes([optimisticNote, ...notes]);
        setIsCreateOpen(false);
        setTitle("");
        setContent("");
        setIsTask(false);
        setDeadline("");

        const res = await createNote({
            userId,
            title,
            content,
            isTask,
            deadline
        });

        if (res.success) {
            setNotes(prev => prev.map(n => n._id === optimisticId ? res.note : n));
        } else {
            setNotes(prev => prev.filter(n => n._id !== optimisticId));
        }
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
        const original = notes;
        setNotes(prev => prev.filter(n => n._id !== id));
        const res = await deleteNote(id);
        if (!res.success) setNotes(original);
    };

    // Filter Logic
    const filteredNotes = notes.filter(note => {
        const matchesTab =
            activeTab === "all" ? true :
                activeTab === "tasks" ? note.isTask :
                    activeTab === "notes" ? !note.isTask : true;

        const matchesSearch =
            (note.title?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
            (note.content?.toLowerCase() || "").includes(searchQuery.toLowerCase());

        return matchesTab && matchesSearch;
    });

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search notes..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="flex-1 sm:flex-none gap-2">
                                <Plus className="h-4 w-4" /> Create New
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>Create New Note / Task</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                <div className="flex items-center p-3 border rounded-lg bg-muted/20 space-x-3">
                                    <Switch id="is-task" checked={isTask} onCheckedChange={setIsTask} />
                                    <div className="space-y-0.5">
                                        <Label htmlFor="is-task" className="text-base font-medium">Mark as Actionable Task?</Label>
                                        <p className="text-xs text-muted-foreground">Tasks have checkboxes and deadlines.</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Title (Optional)</Label>
                                    <Input placeholder="e.g. Catering Prep" value={title} onChange={e => setTitle(e.target.value)} />
                                </div>

                                <div className="space-y-2">
                                    <Label>Content</Label>
                                    <Textarea
                                        placeholder={isTask ? "List the steps or details..." : "Write your thoughts..."}
                                        className="resize-none min-h-[120px]"
                                        value={content}
                                        onChange={e => setContent(e.target.value)}
                                    />
                                </div>

                                {isTask && (
                                    <div className="space-y-2">
                                        <Label>Deadline</Label>
                                        <DatePicker
                                            date={deadline}
                                            setDate={(d) => setDeadline(d ? d.toISOString().split('T')[0] : "")}
                                            placeholder="Pick deadline"
                                        />
                                    </div>
                                )}

                                <Button onClick={handleCreate} className="w-full" disabled={!content.trim()}>
                                    Create {isTask ? "Task" : "Note"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Tabs Filter */}
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full sm:w-[400px] grid-cols-3">
                    <TabsTrigger value="all">All Items</TabsTrigger>
                    <TabsTrigger value="tasks">Tasks</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Grid Content */}
            {filteredNotes.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-10 border-2 border-dashed rounded-xl bg-muted/10 text-muted-foreground">
                    <StickyNote className="h-10 w-10 mb-4 opacity-20" />
                    <h3 className="text-lg font-medium">No items found</h3>
                    <p className="text-sm">Try changing your filters or create a new note.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
                    {filteredNotes.map(note => (
                        <div
                            key={note._id}
                            className={cn(
                                "group relative flex flex-col gap-3 p-5 rounded-lg border bg-card hover:shadow-lg transition-all duration-200",
                                note.completed ? "opacity-60 bg-muted/10 border-transparent" : "hover:border-primary/50",
                                note.isTask && !note.completed && note.deadline && new Date(note.deadline) < new Date() && "border-destructive/30 bg-destructive/5"
                            )}
                        >
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

                                    <div className="flex-1 min-w-0 space-y-1">
                                        <h4 className={cn("font-semibold text-base leading-tight break-words", note.completed && "line-through text-muted-foreground")}>
                                            {note.title || "Untitled"}
                                        </h4>
                                        {note.isTask && note.deadline && (
                                            <Badge variant={new Date(note.deadline) < new Date() && !note.completed ? "destructive" : "outline"} className="h-5 px-1.5 text-[10px] gap-1 font-normal">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(note.deadline), "MMM d, yyyy")}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 -mr-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDelete(note._id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>

                            <p className={cn("text-sm text-muted-foreground whitespace-pre-wrap break-words line-clamp-[8] leading-relaxed", note.completed && "line-through opacity-70")}>
                                {note.content}
                            </p>

                            <div className="mt-auto pt-3 border-t flex items-center justify-between text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                    <Clock className="h-3 w-3" /> {note.createdAt ? format(new Date(note.createdAt), "MMM d, yyyy") : 'Today'}
                                </span>
                                {note.completed && (
                                    <span className="flex items-center gap-1 text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                                        <CheckCircle2 className="h-3 w-3" /> Done
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
