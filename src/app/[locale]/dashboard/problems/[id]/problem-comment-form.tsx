"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addComment } from "@/lib/actions/problem.actions";
import { Send, Loader2, X, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { UploadButton } from "@/lib/uploadthing";

export function ProblemCommentForm({ problemId, userId }: { problemId: string, userId: string }) {
    const [text, setText] = useState("");
    const [files, setFiles] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() && files.length === 0) return;

        setIsSubmitting(true);
        try {
            const res = await addComment(problemId, userId, text, files);
            if (res.success) {
                setText("");
                setFiles([]);
                toast.success("Comment added");
            } else {
                toast.error("Failed to add comment");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-border/50">
            {files.length > 0 && (
                <div className="flex gap-2 overflow-x-auto py-2">
                    {files.map((url) => (
                        <div key={url} className="relative h-16 w-16 shrink-0 rounded-md border overflow-hidden group">
                            <img src={url} alt="attachment" className="h-full w-full object-cover" />
                            <button
                                type="button"
                                onClick={() => setFiles(prev => prev.filter(f => f !== url))}
                                className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="relative">
                <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type your comment..."
                    className="min-h-[100px] pr-24" // Make space for button if needed, but button is below
                />
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <UploadButton
                        endpoint="messageAttachment"
                        onClientUploadComplete={(res: any) => {
                            if (res) {
                                setFiles(prev => [...prev, ...res.map((r: any) => r.url)]);
                                toast.success("File attached");
                            }
                        }}
                        onUploadError={(error: Error) => {
                            toast.error(`Upload failed: ${error.message}`);
                        }}
                        appearance={{
                            button: "bg-muted hover:bg-muted/80 text-muted-foreground ut-uploading:cursor-not-allowed h-9 text-xs font-medium px-3 rounded-md border border-input",
                            allowedContent: "hidden"
                        }}
                        content={{
                            button({ ready }) {
                                if (ready) return <div className="flex items-center gap-2"><Paperclip className="h-4 w-4" /> Attach</div>;
                                return "Loading...";
                            }
                        }}
                    />
                </div>

                <Button type="submit" disabled={isSubmitting || (!text.trim() && files.length === 0)}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Post Comment
                </Button>
            </div>
        </form>
    );
}
