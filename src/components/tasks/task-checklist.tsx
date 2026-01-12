"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { toggleTodo } from "@/lib/actions/task.actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "../ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface TaskChecklistProps {
    taskId: string;
    todos: { _id: string; text: string; completed?: boolean; completedBy?: string[] }[]; // completedBy IDs
    currentUserId: string;
    canEdit: boolean;
    showCompletionDetails?: boolean;
    assignees?: any[]; // For resolving names
    viewAsUserId?: string;
}

export function TaskChecklist({ taskId, todos: initialTodos, currentUserId, canEdit, showCompletionDetails, assignees = [], viewAsUserId }: TaskChecklistProps) {
    const [todos, setTodos] = useState(initialTodos);

    const handleToggle = async (todoId: string, checked: boolean) => {
        if (!canEdit) return;

        // Optimistic Update
        const newTodos = todos.map(t => {
            if (t._id === todoId) {
                const currentCompletedBy = t.completedBy || [];
                const newCompletedBy = checked
                    ? [...currentCompletedBy, currentUserId]
                    : currentCompletedBy.filter(id => id !== currentUserId);

                return { ...t, completedBy: newCompletedBy };
            }
            return t;
        });
        setTodos(newTodos);

        try {
            const result = await toggleTodo(taskId, todoId, checked, currentUserId);
            if (!result.success) {
                setTodos(initialTodos); // Revert
                toast.error("Failed to update checklist");
            }
        } catch (error) {
            setTodos(initialTodos);
            toast.error("Failed to update checklist");
        }
    };

    if (!initialTodos || initialTodos.length === 0) return null;

    return (
        <Card className="border shadow-none">
            <CardContent className="p-0">
                <div className="divide-y divide-border">
                    {todos.map((todo) => {
                        const targetUserId = viewAsUserId || currentUserId;
                        const isChecked = todo.completedBy?.includes(targetUserId);
                        const isCompletedByMe = todo.completedBy?.includes(currentUserId); // Keep for legacy/edit check if needed?
                        // Actually if viewAsUserId is set (Creator viewing Employee), canEdit is likely false.
                        // But if canEdit IS true, we toggle for currentUserId. This might be confusing.
                        // Let's assume View Mode = Read Only.

                        const displayChecked = isChecked;
                        const completionCount = todo.completedBy?.length || 0;

                        // Resolve names for tooltip
                        const completedUsers = showCompletionDetails && todo.completedBy
                            ? assignees.filter(a => todo.completedBy?.includes(a._id || a.userId))
                            : [];

                        return (
                            <div
                                key={todo._id}
                                className={cn(
                                    "flex items-start justify-between p-4 transition-all duration-200",
                                    canEdit ? "hover:bg-muted/40 cursor-pointer" : "opacity-80",
                                    displayChecked && "bg-muted/20"
                                )}
                                onClick={() => canEdit && handleToggle(todo._id, !displayChecked)}
                            >
                                <div className="flex items-start space-x-3 w-full">
                                    <Checkbox
                                        id={todo._id}
                                        checked={displayChecked}
                                        onCheckedChange={(checked) => canEdit && handleToggle(todo._id, checked as boolean)}
                                        disabled={!canEdit}
                                        className="mt-0.5 border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className="flex-1 space-y-1">
                                        <label
                                            htmlFor={todo._id}
                                            className={cn(
                                                "text-sm leading-relaxed transition-all select-none block",
                                                displayChecked ? "line-through text-muted-foreground opacity-70" : "font-medium text-foreground",
                                                !canEdit && "cursor-default"
                                            )}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {todo.text}
                                        </label>

                                        {showCompletionDetails && (
                                            <div onClick={(e) => e.stopPropagation()} className="pt-1">
                                                <HoverCard>
                                                    <HoverCardTrigger asChild>
                                                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 hover:bg-muted cursor-help w-fit">
                                                            <Users className="h-3 w-3 text-muted-foreground" />
                                                            {completionCount} completed
                                                        </Badge>
                                                    </HoverCardTrigger>
                                                    <HoverCardContent className="w-60 p-2">
                                                        <div className="space-y-2">
                                                            <h4 className="text-xs font-semibold text-muted-foreground">Completed by:</h4>
                                                            {completedUsers.length > 0 ? (
                                                                <div className="grid grid-cols-1 gap-1">
                                                                    {completedUsers.map((u, i) => (
                                                                        <div key={i} className="text-xs flex items-center gap-2">
                                                                            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                                                            {u.firstName || u.name || "User"} {u.lastName}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-muted-foreground italic">No one yet.</p>
                                                            )}
                                                        </div>
                                                    </HoverCardContent>
                                                </HoverCard>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
