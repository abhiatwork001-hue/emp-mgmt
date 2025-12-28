"use client";

import { format } from "date-fns";
import {
    Calendar, CheckCircle2, Circle, MessageSquare, CheckSquare
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { updateTaskStatus } from "@/lib/actions/task.actions";
import { cn } from "@/lib/utils";

interface TaskCardProps {
    task: any;
    currentUserId: string;
    onClick?: () => void;
}

export function TaskCard({ task, currentUserId, onClick }: TaskCardProps) {
    // Map priorities to border colors for the accent bar
    const priorityColors: Record<string, string> = {
        low: "bg-slate-400",
        medium: "bg-blue-500",
        high: "bg-orange-500",
        critical: "bg-red-500"
    };

    // Map priority to badge styles if still needed, or use simpler text
    const priorityBadgeStyles: Record<string, string> = {
        low: "bg-slate-100 text-slate-700",
        medium: "bg-blue-100 text-blue-700",
        high: "bg-orange-100 text-orange-700",
        critical: "bg-red-100 text-red-700"
    };

    const accentColor = priorityColors[task.priority] || "bg-slate-400";

    const handleStatusChange = async (e: React.MouseEvent, newStatus: string) => {
        e.stopPropagation();
        await updateTaskStatus(task._id, newStatus, currentUserId);
    };

    const isCompleted = task.completedBy?.some((cb: any) => cb.userId === currentUserId) || task.status === 'completed';
    const isAssigned = task.assignedTo?.some((a: any) => {
        const id = a.id?._id || a.id;
        return id?.toString() === currentUserId;
    });

    const completionCount = task.todos?.filter((t: any) => t.completedBy?.includes(currentUserId) || t.completed).length || 0; // Support legacy "completed" flag if present
    const totalCount = task.todos?.length || 0;
    const progress = totalCount > 0 ? (completionCount / totalCount) * 100 : 0;

    return (
        <Card
            className={cn(
                "group relative overflow-hidden transition-all duration-200 hover:shadow-lg cursor-pointer",
                isCompleted ? "opacity-60 bg-muted/40 grayscale-[0.5]" : "bg-card hover:-translate-y-0.5"
            )}
            onClick={onClick}
        >
            <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", accentColor)} />

            <CardContent className="p-4 pl-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            {/* Priority Label for clarity */}
                            <span className={cn(
                                "text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm",
                                "bg-muted text-muted-foreground"
                            )}>
                                {task.priority}
                            </span>
                            {task.deadline && (
                                <span className={cn(
                                    "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-sm",
                                    new Date(task.deadline) < new Date() ? "bg-red-50 text-red-600" : "bg-muted text-muted-foreground"
                                )}>
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(task.deadline), 'MMM d')}
                                </span>
                            )}
                        </div>
                        <h4 className={cn(
                            "text-sm font-semibold leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors",
                            isCompleted && "line-through text-muted-foreground"
                        )}>
                            {task.title}
                        </h4>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        disabled={!isAssigned}
                        className={cn(
                            "h-8 w-8 shrink-0 rounded-full hover:bg-transparent -mr-2 -mt-2",
                            isCompleted ? "text-green-600" : "text-muted-foreground/30 hover:text-green-600"
                        )}
                        onClick={(e) => handleStatusChange(e, isCompleted ? 'todo' : 'completed')}
                    >
                        {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6 stroke-[1.5]" />}
                    </Button>
                </div>

                {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {task.description}
                    </p>
                )}

                {/* Footer Metadata */}
                <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-3">
                        {totalCount > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <CheckSquare className="h-3.5 w-3.5" />
                                <span>{completionCount}/{totalCount}</span>
                                <div className="w-12 h-1 bg-muted rounded-full ml-1 overflow-hidden">
                                    <div className="h-full bg-primary/70" style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                        )}

                        {!totalCount && task.comments && task.comments.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>{task.comments.length}</span>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
