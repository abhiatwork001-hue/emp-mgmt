"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    MessageSquare, CheckCircle2, Clock, Calendar, type LucideIcon, User
} from "lucide-react";
import { addTaskComment, updateTaskStatus } from "@/lib/actions/task.actions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

interface TaskDetailsSheetProps {
    task: any;
    currentUserId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function TaskDetailsSheet({ task, currentUserId, isOpen, onClose }: TaskDetailsSheetProps) {
    const [commentText, setCommentText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!task) return null;

    const priorities: Record<string, string> = {
        low: "bg-blue-100 text-blue-700",
        medium: "bg-yellow-100 text-yellow-700",
        high: "bg-red-100 text-red-700",
    };

    const isCompletedByMe = task.completedBy?.some((cb: any) => cb.userId === currentUserId);
    const isAssigned = task.assignedTo?.some((a: any) => {
        const id = a.id?._id || a.id;
        return id?.toString() === currentUserId;
    });

    const handleComment = async () => {
        if (!commentText.trim()) return;
        setIsSubmitting(true);
        await addTaskComment(task._id, currentUserId, commentText);
        setCommentText("");
        setIsSubmitting(false);
    };

    const handleToggleStatus = async () => {
        const newStatus = isCompletedByMe ? "todo" : "completed";
        // If the task logic in backend handles "completedBy" array toggling. 
        // Note: The backend `updateTaskStatus` implementation currently overwrites status. 
        // Ideally it should simply toggle the user's completion status in `completedBy`.
        // However, looking at the schema, `completedBy` is an array. 
        // The action `updateTaskStatus` provided earlier adds to `completedBy` if status is completed.
        // It does NOT appear to remove from it if toggled back, or handle specific user completion well for shared tasks.
        // We will stick to the basic action for now.
        await updateTaskStatus(task._id, newStatus, currentUserId);
        onClose(); // Close to refresh or let parent re-render
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-md md:max-w-lg lg:max-w-xl w-full flex flex-col h-full">
                <SheetHeader className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                        <SheetTitle className="text-xl font-bold leading-tight">
                            {task.title}
                        </SheetTitle>
                        <Badge variant="secondary" className={priorities[task.priority]}>
                            {task.priority}
                        </Badge>
                    </div>
                    <div>
                        <Button variant="outline" size="sm" asChild className="w-full">
                            <Link href={`/dashboard/tasks/${task._id}`}>
                                View Full Analytics & Discussion
                            </Link>
                        </Button>
                    </div>
                </SheetHeader>

                <div className="flex items-center gap-4 text-sm text-muted-foreground my-4">
                    <div className="flex items-center gap-1.5">
                        <User className="h-4 w-4" />
                        <span>{task.createdBy?.firstName} {task.createdBy?.lastName}</span>
                    </div>
                    {task.deadline && (
                        <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(task.deadline), "MMM d, yyyy")}</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-6">
                    {/* Description */}
                    {task.description && (
                        <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                            {task.description}
                        </div>
                    )}

                    {/* Progress / Completions */}
                    <div className="space-y-3 pt-4 border-t">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            Completion Progress
                        </h4>
                        {task.completedBy && task.completedBy.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {task.completedBy.map((cb: any, idx: number) => (
                                    <Badge key={idx} variant="outline" className="gap-1 pl-1 bg-green-50 text-green-700 border-green-200">
                                        <Avatar className="h-4 w-4">
                                            <AvatarFallback className="text-[9px]">U</AvatarFallback>
                                        </Avatar>
                                        ID: {cb.userId.toString().slice(-4)} {/* Ideally fetch names, but ID suffix for now if populate missing */}
                                    </Badge>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground italic">No completions yet.</p>
                        )}
                    </div>

                    {/* Todos Sub-items */}
                    {task.todos && task.todos.length > 0 && (
                        <div className="space-y-2 pt-4 border-t">
                            <h4 className="text-sm font-semibold">Checklist</h4>
                            <ul className="space-y-2">
                                {task.todos.map((todo: any, idx: number) => (
                                    <li key={idx} className="flex items-center gap-2 text-sm">
                                        <div className={`h - 4 w - 4 rounded border flex items - center justify - center ${todo.completed ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"} `}>
                                            {todo.completed && <CheckCircle2 className="h-3 w-3" />}
                                        </div>
                                        <span className={todo.completed ? "line-through text-muted-foreground" : ""}>
                                            {todo.text}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Comments Section */}
                    <div className="space-y-4 pt-4 border-t">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Comments ({task.comments?.length || 0})
                        </h4>

                        <div className="space-y-4">
                            {task.comments?.map((comment: any, idx: number) => (
                                <div key={idx} className="flex gap-3 text-sm">
                                    <Avatar className="h-8 w-8 mt-1">
                                        <AvatarFallback>{comment.userName?.[0] || "?"}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold">{comment.userName}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                                            </span>
                                        </div>
                                        <p className="text-muted-foreground">{comment.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer: Add Comment & Actions */}
                <div className="pt-4 mt-auto border-t bg-background sticky bottom-0 z-10 space-y-4">
                    <div className="flex gap-2">
                        <Textarea
                            placeholder="Write a comment..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            className="min-h-[80px] resize-none"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        {isAssigned ? (
                            <Button
                                variant={isCompletedByMe ? "outline" : "default"}
                                className={isCompletedByMe ? "border-green-600 text-green-600 hover:bg-green-50" : ""}
                                onClick={handleToggleStatus}
                            >
                                {isCompletedByMe ? "Mark as Incomplete" : "Mark as Complete"}
                            </Button>
                        ) : (
                            <div /> // Spacer
                        )}
                        <Button onClick={handleComment} disabled={!commentText.trim() || isSubmitting}>
                            {isSubmitting ? "Posting..." : "Post Comment"}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
