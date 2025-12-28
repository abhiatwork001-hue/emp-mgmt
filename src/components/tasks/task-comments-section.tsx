"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { addTaskComment } from "@/lib/actions/task.actions";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface TaskCommentsSectionProps {
    taskId: string;
    currentUserId: string;
    comments: any[];
}

export function TaskCommentsSection({ taskId, currentUserId, comments }: TaskCommentsSectionProps) {
    const [commentText, setCommentText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const handleComment = async () => {
        if (!commentText.trim()) return;
        setIsSubmitting(true);
        await addTaskComment(taskId, currentUserId, commentText);
        setCommentText("");
        setIsSubmitting(false);
        router.refresh(); // Refresh server data
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Comments ({comments.length})</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 max-h-[500px]">
                    {comments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            No comments yet. Start the conversation!
                        </div>
                    ) : (
                        comments.map((comment: any, idx: number) => (
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
                                    <p className="text-foreground/90 whitespace-pre-wrap">{comment.text}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="space-y-2 pt-2 border-t mt-auto">
                    <Textarea
                        placeholder="Write a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="min-h-[100px] resize-none"
                    />
                    <div className="flex justify-end">
                        <Button onClick={handleComment} disabled={!commentText.trim() || isSubmitting}>
                            {isSubmitting ? "Posting..." : "Post Comment"}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
