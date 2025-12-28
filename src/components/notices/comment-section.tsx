"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { Send } from "lucide-react";
import { addComment } from "@/lib/actions/notice.actions";
import { toast } from "sonner";

interface CommentSectionProps {
    noticeId: string;
    userId: string;
    comments: any[];
}

export function CommentSection({ noticeId, userId, comments }: CommentSectionProps) {
    const [text, setText] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;

        setSubmitting(true);
        try {
            const result = await addComment(noticeId, userId, text);
            if (result.success) {
                setText("");
                toast.success("Comment added");
            } else {
                toast.error("Failed to add comment");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 mt-8">
            <h3 className="text-xl font-semibold">Discussion ({comments.length})</h3>

            <div className="space-y-4 mb-8">
                {comments.length === 0 ? (
                    <p className="text-muted-foreground text-sm italic">No comments yet. Be the first to start the discussion.</p>
                ) : (
                    comments.map((comment: any) => (
                        <div key={comment._id} className="flex gap-4 p-4 rounded-lg bg-muted/40">
                            <Avatar className="h-10 w-10 border">
                                <AvatarImage src={comment.userId?.image} />
                                <AvatarFallback>{comment.userId?.firstName?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-sm">
                                        {comment.userId?.firstName} {comment.userId?.lastName}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                    </span>
                                </div>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-4">
                <Textarea
                    placeholder="Write a comment..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="flex-1 min-h-[40px]"
                />
                <Button type="submit" size="icon" disabled={submitting || !text.trim()}>
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </div>
    );
}
