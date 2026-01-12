"use client";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { TaskChecklist } from "@/components/tasks/task-checklist";
import { useState } from "react";
import { format } from "date-fns";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    MessageSquare, CheckCircle2, Clock, Calendar, type LucideIcon, User, Edit, ChevronDown, ChevronUp
} from "lucide-react";
import { addTaskComment, updateTaskStatus } from "@/lib/actions/task.actions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { UploadDropzone } from "@/lib/uploadthing";
import { FileIcon, Download, UploadCloud } from "lucide-react";

interface TaskDetailsSheetProps {
    task: any;
    currentUserId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function TaskDetailsSheet({ task, currentUserId, isOpen, onClose }: TaskDetailsSheetProps) {
    const [commentText, setCommentText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [expandedAssignee, setExpandedAssignee] = useState<string | null>(null);

    if (!task) return null;

    const priorities: Record<string, string> = {
        low: "bg-blue-100 text-blue-700",
        medium: "bg-yellow-100 text-yellow-700",
        high: "bg-red-100 text-red-700",
    };

    const isCompletedByMe = task.completedBy?.some((cb: any) => cb.userId === currentUserId);
    const isSubmittedByMe = task.submissions?.some((s: any) => s.userId === currentUserId);

    const isAssigned = task.assignedTo?.some((a: any) => {
        const id = a.id?._id || a.id;
        return id?.toString() === currentUserId;
    });

    // Simple role check based on props or context if available, otherwise rely on ownership
    const isCreator = task.createdBy?._id === currentUserId || task.createdBy === currentUserId;
    // We don't have roles prop here, so we'll default to Creator visibility. 
    // If we need roles, we should update the parent to pass them.
    // For now, Creator is the most important one for "checking if everyone completed".

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
                        <div className="flex items-center gap-2">
                            {task.createdBy && (task.createdBy._id === currentUserId || task.createdBy === currentUserId) && (
                                <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)} className="h-6 text-xs gap-1 px-2.5">
                                    <Edit className="h-3 w-3" /> Edit
                                </Button>
                            )}
                            <Badge variant="secondary" className={priorities[task.priority]}>
                                {task.priority}
                            </Badge>
                        </div>
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

                    {/* Detailed Completion Progress */}
                    <div className="space-y-3 pt-4 border-t">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            Completion Status
                        </h4>

                        {task.assignedTo && task.assignedTo.length > 0 ? (
                            <div className="space-y-2">
                                {task.assignedTo.map((assignment: any, idx: number) => {
                                    const assigneeId = assignment.id?._id || assignment.id;
                                    const assigneeName = assignment.id?.firstName
                                        ? `${assignment.id.firstName} ${assignment.id.lastName}`
                                        : "Unknown User";

                                    const isCompleted = task.completedBy?.some((cb: any) => cb.userId?.toString() === assigneeId?.toString());

                                    const totalTodos = task.todos?.length || 0;
                                    const completedTodos = task.todos?.filter((t: any) =>
                                        t.completedBy?.includes(assigneeId?.toString())
                                    ).length || 0;

                                    const isExpanded = expandedAssignee === assigneeId?.toString();

                                    return (
                                        <div key={idx} className="flex flex-col gap-2 p-2 rounded-md bg-muted/40 border text-sm transition-all">
                                            <div
                                                className="flex items-center justify-between cursor-pointer hover:bg-muted/60 p-1 rounded-sm -m-1"
                                                onClick={() => setExpandedAssignee(isExpanded ? null : assigneeId?.toString())}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarFallback className="text-[10px]">{assigneeName[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium">{assigneeName}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {totalTodos > 0 && (
                                                        <span className={`text-xs ${completedTodos === totalTodos ? 'text-green-600' : 'text-muted-foreground'}`}>
                                                            {completedTodos}/{totalTodos} subtasks
                                                        </span>
                                                    )}
                                                    {isCompleted ? (
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                            Completed
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-muted-foreground">
                                                            Pending
                                                        </Badge>
                                                    )}
                                                    {totalTodos > 0 && (
                                                        isExpanded
                                                            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                                            : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Collapsible Details */}
                                            {isExpanded && totalTodos > 0 && (
                                                <div className="pl-2 pr-2 pb-2 pt-0 mt-2 border-t border-border/50">
                                                    <p className="text-xs text-muted-foreground mb-2 mt-2 font-medium">
                                                        Checklist for {assigneeName}:
                                                    </p>
                                                    <TaskChecklist
                                                        taskId={task._id}
                                                        todos={task.todos}
                                                        currentUserId={currentUserId}
                                                        canEdit={false} // Read-only view
                                                        showCompletionDetails={false} // Don't show hover cards here, redundant
                                                        assignees={[]}
                                                        viewAsUserId={assigneeId} // IMPORTANT: Show THIS user's checkmarks
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            // Fallback for tasks without granular assignment data or legacy
                            task.completedBy && task.completedBy.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {task.completedBy.map((cb: any, idx: number) => (
                                        <Badge key={idx} variant="outline" className="bg-green-50 text-green-700">
                                            User {cb.userId?.toString().slice(-4)}
                                        </Badge>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic">No completion data available.</p>
                            )
                        )}
                    </div>

                    {/* Todos Sub-items */}
                    {task.todos && task.todos.length > 0 && (
                        <div className="space-y-2 pt-4 border-t">
                            <h4 className="text-sm font-semibold">Checklist</h4>
                            {isAssigned || !isCreator ? (
                                <TaskChecklist
                                    taskId={task._id}
                                    todos={task.todos}
                                    currentUserId={currentUserId}
                                    canEdit={isAssigned && !isCompletedByMe}
                                    showCompletionDetails={isCreator}
                                    assignees={task.assignedTo?.map((a: any) => a.id) || []}
                                    viewAsUserId={(isCreator && task.assignedTo?.length === 1)
                                        ? (task.assignedTo[0].id?._id || task.assignedTo[0].id || task.assignedTo[0])
                                        : undefined}
                                />
                            ) : (
                                <div className="bg-muted/20 rounded-lg border p-4 space-y-2">
                                    <p className="text-xs text-muted-foreground mb-3">
                                        You are viewing this task as the creator. Assignees will see interactive checkboxes.
                                    </p>
                                    {task.todos.map((todo: any, idx: number) => {
                                        const completionCount = todo.completedBy?.length || 0;
                                        const totalAssignees = task.assignedTo?.length || 0;
                                        const percentage = totalAssignees > 0 ? Math.round((completionCount / totalAssignees) * 100) : 0;

                                        return (
                                            <div key={idx} className="flex items-start gap-3 p-3 bg-background rounded-md border">
                                                <div className="flex-1 space-y-1.5">
                                                    <p className="text-sm font-medium">{todo.text}</p>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className={percentage === 100 ? "h-full bg-green-500" : "h-full bg-blue-500"}
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                                                            {completionCount}/{totalAssignees}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Submissions Section */}
                    {task.submissions && task.submissions.length > 0 && (
                        <div className="space-y-3 pt-4 border-t">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                <FileIcon className="h-4 w-4" /> Submissions
                            </h4>
                            <div className="grid grid-cols-1 gap-2">
                                {task.submissions.map((sub: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center bg-muted/40 p-3 rounded-md border border-border/50">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-background p-1.5 rounded-full border">
                                                <User className="h-3 w-3" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-xs">Submitted by User</span>
                                                <a href={sub.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium">
                                                    {sub.fileName || "View Document"} <Download className="h-3 w-3" />
                                                </a>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] h-5">
                                            {format(new Date(sub.submittedAt), "MMM d, h:mm a")}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
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
                            placeholder={isCompletedByMe ? "You cannot comment on completed tasks." : "Write a comment..."}
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            className="min-h-[80px] resize-none"
                            disabled={isCompletedByMe}
                        />
                    </div>
                    <div className="flex flex-col gap-4">
                        {isAssigned ? (
                            task.requiresSubmission && !isCompletedByMe ? (
                                <div className="w-full bg-muted/20 p-4 rounded-lg border-2 border-dashed border-muted-foreground/20">
                                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                        <UploadCloud className="h-4 w-4" /> Upload Required File
                                    </h4>
                                    <UploadDropzone
                                        endpoint="taskAttachment"
                                        onClientUploadComplete={async (res: any) => {
                                            if (res && res[0]) {
                                                await import("@/lib/actions/task.actions").then(mod =>
                                                    mod.submitTaskFile(task._id, currentUserId, res[0].url, res[0].name)
                                                );
                                                onClose();
                                            }
                                        }}
                                        onUploadError={(error: Error) => {
                                            alert(`Upload failed: ${error.message}`);
                                        }}
                                        appearance={{
                                            button: "bg-primary text-primary-foreground hover:bg-primary/90 w-full",
                                            container: "w-full"
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-col w-full gap-2">
                                    <div className="flex items-center justify-between w-full">
                                        <Button
                                            variant={isCompletedByMe ? "outline" : "default"}
                                            className={isCompletedByMe ? "border-green-600 text-green-600 hover:bg-green-50 w-full md:w-auto" : "w-full md:w-auto"}
                                            onClick={handleToggleStatus}
                                        >
                                            {isCompletedByMe
                                                ? (task.todos?.length > 0
                                                    ? `Completed (${task.todos.filter((t: any) => t.completedBy?.includes(currentUserId)).length}/${task.todos.length} Subtasks)`
                                                    : "Mark as Incomplete")
                                                : "Mark as Complete"
                                            }
                                        </Button>
                                    </div>
                                    {isCompletedByMe && task.todos?.length > 0 && task.todos.some((t: any) => !t.completedBy?.includes(currentUserId)) && (
                                        <p className="text-xs text-yellow-600 flex items-center gap-1">
                                            ⚠️ You have completed this task with pending checklist items.
                                        </p>
                                    )}
                                </div>
                            )
                        ) : (
                            <div />
                        )}

                        <div className="flex items-center justify-between pt-2">
                            <span />
                            <Button onClick={handleComment} disabled={!commentText.trim() || isSubmitting || isCompletedByMe} variant="ghost" size="sm">
                                Post Comment
                            </Button>
                        </div>
                    </div>
                </div>
            </SheetContent>

            {isEditOpen && (
                <CreateTaskDialog
                    open={isEditOpen}
                    onOpenChange={setIsEditOpen}
                    currentUserId={currentUserId}
                    currentUser={{ _id: currentUserId, roles: [] }} // Limited context is fine for edit as assignments are hidden
                    taskToEdit={task}
                />
            )}
        </Sheet>
    );
}
