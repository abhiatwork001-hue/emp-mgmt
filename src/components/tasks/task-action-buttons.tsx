"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Loader2, Edit, UploadCloud } from "lucide-react";
import { updateTaskStatus, submitTaskFile } from "@/lib/actions/task.actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UploadDropzone } from "@/lib/uploadthing";

interface TaskActionButtonsProps {
    taskId: string;
    currentUserId: string;
    isCompleted: boolean;
    task?: any;
    canEdit?: boolean;
    isAssigned?: boolean;
}

export function TaskActionButtons({ taskId, currentUserId, isCompleted, task, canEdit, isAssigned = false }: TaskActionButtonsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [activeUploadRequirement, setActiveUploadRequirement] = useState<string | null>(null);
    const router = useRouter();

    const handleToggle = async () => {
        setIsLoading(true);
        const newStatus = isCompleted ? "todo" : "completed";
        // Note: Backend logic: 'completed' -> adds to completedBy. 'todo' -> removes.

        const res = await updateTaskStatus(taskId, newStatus, currentUserId);

        if (res?.success) {
            toast.success(isCompleted ? "Marked as Incomplete" : "Task Completed!");
            router.refresh();
        } else {
            toast.error("Failed to update status");
        }
        setIsLoading(false);
    };

    return (
        <div className="flex items-center gap-2">
            {canEdit && task && (
                <>
                    <Button variant="outline" onClick={() => setIsEditOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    {isEditOpen && (
                        <CreateTaskDialog
                            open={isEditOpen}
                            onOpenChange={(open) => {
                                setIsEditOpen(open);
                                if (!open) router.refresh();
                            }}
                            currentUserId={currentUserId}
                            currentUser={{ _id: currentUserId, roles: [] }}
                            taskToEdit={task}
                        />
                    )}
                </>
            )}

            {isAssigned && (
                task?.requiresSubmission && !isCompleted ? (
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="bg-primary text-primary-foreground min-w-[140px]">
                                <UploadCloud className="mr-2 h-4 w-4" /> Submit File
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Upload Required Files</DialogTitle>
                            </DialogHeader>

                            {task.requiredFileNames && task.requiredFileNames.length > 0 ? (
                                <div className="space-y-3">
                                    {task.requiredFileNames.map((reqName: string, idx: number) => {
                                        const submission = task.submissions?.find((s: any) =>
                                            (s.userId._id || s.userId).toString() === currentUserId && s.requirementName === reqName
                                        );

                                        if (activeUploadRequirement === reqName) {
                                            return (
                                                <div key={idx} className="border p-4 rounded-lg bg-muted/20">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <p className="font-medium text-sm">Uploading: {reqName}</p>
                                                        <Button variant="ghost" size="sm" onClick={() => setActiveUploadRequirement(null)}>Cancel</Button>
                                                    </div>
                                                    <UploadDropzone
                                                        endpoint="taskAttachment"
                                                        onClientUploadComplete={async (res) => {
                                                            if (res?.[0]) {
                                                                const result = await submitTaskFile(taskId, currentUserId, res[0].url, res[0].name, reqName);
                                                                if (result.success) {
                                                                    toast.success(`Uploaded ${reqName}`);
                                                                    setActiveUploadRequirement(null);
                                                                    router.refresh();
                                                                } else {
                                                                    toast.error("Submission failed");
                                                                }
                                                            }
                                                        }}
                                                        onUploadError={(error: Error) => {
                                                            toast.error(`Error: ${error.message}`);
                                                        }}
                                                        appearance={{ button: "bg-primary w-full", container: "w-full" }}
                                                    />
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={idx} className="border p-3 rounded-lg flex items-center justify-between hover:bg-muted/10 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${submission ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                                                        {submission ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">{reqName}</p>
                                                        {submission && <p className="text-xs text-muted-foreground">Uploaded</p>}
                                                    </div>
                                                </div>
                                                {submission ? (
                                                    <div className="flex gap-2">
                                                        <Button variant="ghost" size="sm" asChild>
                                                            <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer">View</a>
                                                        </Button>
                                                        <Button variant="outline" size="sm" onClick={() => setActiveUploadRequirement(reqName)}>
                                                            Replace
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button size="sm" onClick={() => setActiveUploadRequirement(reqName)}>
                                                        Upload
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-4 border-2 border-dashed rounded-lg bg-muted/20">
                                    <UploadDropzone
                                        endpoint="taskAttachment"
                                        onClientUploadComplete={async (res) => {
                                            if (res?.[0]) {
                                                const result = await submitTaskFile(taskId, currentUserId, res[0].url, res[0].name);
                                                if (result.success) {
                                                    toast.success("File submitted & Task Completed!");
                                                    router.refresh();
                                                } else {
                                                    toast.error("Submission failed");
                                                }
                                            }
                                        }}
                                        onUploadError={(error: Error) => {
                                            toast.error(`Error: ${error.message}`);
                                        }}
                                        appearance={{
                                            button: "bg-primary w-full",
                                            container: "w-full"
                                        }}
                                    />
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                ) : (
                    <Button
                        variant={isCompleted ? "outline" : "default"}
                        onClick={handleToggle}
                        disabled={isLoading}
                        className={isCompleted ? "border-green-600 text-green-700 bg-green-50 hover:bg-green-100" : "bg-primary text-primary-foreground"}
                    >
                        {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : isCompleted ? (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                        ) : (
                            <Circle className="mr-2 h-4 w-4" />
                        )}
                        {isCompleted ? "Completed" : "Mark as Complete"}
                    </Button>
                )
            )}
        </div>
    );
}
