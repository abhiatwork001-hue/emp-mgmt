"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toggleTodo } from "@/lib/actions/task.actions";
import { toast } from "sonner";
import { CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskChecklistProps {
    taskId: string;
    todos: { _id: string; text: string; completed?: boolean; completedBy?: string[] }[]; // completedBy IDs
    currentUserId: string;
    canEdit: boolean;
}

export function TaskChecklist({ taskId, todos: initialTodos, currentUserId, canEdit }: TaskChecklistProps) {
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
                        const isCompletedByMe = todo.completedBy?.includes(currentUserId);

                        return (
                            <div
                                key={todo._id}
                                className={cn(
                                    "flex items-start space-x-3 p-4 transition-all duration-200",
                                    canEdit ? "hover:bg-muted/40 cursor-pointer" : "opacity-80",
                                    isCompletedByMe && "bg-muted/20"
                                )}
                                onClick={() => canEdit && handleToggle(todo._id, !isCompletedByMe)}
                            >
                                <Checkbox
                                    id={todo._id}
                                    checked={isCompletedByMe}
                                    onCheckedChange={(checked) => canEdit && handleToggle(todo._id, checked as boolean)}
                                    disabled={!canEdit}
                                    className="mt-0.5 border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <label
                                    htmlFor={todo._id}
                                    className={cn(
                                        "text-sm leading-relaxed transition-all select-none w-full cursor-pointer",
                                        isCompletedByMe ? "line-through text-muted-foreground opacity-70" : "font-medium text-foreground",
                                        !canEdit && "cursor-default"
                                    )}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {todo.text}
                                </label>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
