"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { updateTaskStatus } from "@/lib/actions/task.actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface TaskActionButtonsProps {
    taskId: string;
    currentUserId: string;
    isCompleted: boolean;
}

export function TaskActionButtons({ taskId, currentUserId, isCompleted }: TaskActionButtonsProps) {
    const [isLoading, setIsLoading] = useState(false);
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
    );
}
