"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createDirectChat, sendMessage } from "@/lib/actions/message.actions";
import { Loader2, Send, Paperclip, X, Image as ImageIcon, FileText } from "lucide-react";
import { toast } from "sonner";
import { useUploadThing } from "@/lib/uploadthing";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface QuickMessageDialogProps {
    recipientId: string;
    recipientName: string;
    recipientImage?: string;
    trigger?: React.ReactNode;
    defaultMessage?: string;
    currentUser: any;
    onOpenChange?: (open: boolean) => void;
}

export function QuickMessageDialog({
    recipientId,
    recipientName,
    recipientImage,
    trigger,
    defaultMessage = "",
    currentUser,
    onOpenChange
}: QuickMessageDialogProps) {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState(defaultMessage);
    const [isLoading, setIsLoading] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { startUpload } = useUploadThing("messageAttachment");

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        onOpenChange?.(newOpen);
        if (!newOpen) {
            // Reset state on close
            setMessage(defaultMessage);
            setAttachments([]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSend = async () => {
        if (!message.trim() && attachments.length === 0) return;

        setIsLoading(true);
        try {
            // 1. Ensure conversation exists
            const chatRes = await createDirectChat(currentUser.id, recipientId);
            if (!chatRes.success || !chatRes.conversationId) {
                throw new Error("Failed to start conversation");
            }
            const conversationId = chatRes.conversationId;

            // 2. Upload attachments if any
            let uploadedAttachments: any[] = [];
            if (attachments.length > 0) {
                setUploading(true);
                const uploadRes = await startUpload(attachments);
                if (!uploadRes) throw new Error("Failed to upload attachments");

                uploadedAttachments = uploadRes.map(file => ({
                    type: file.type.startsWith('image/') ? 'image' : 'file',
                    url: file.url,
                    name: file.name,
                    size: file.size
                }));
                setUploading(false);
            }

            // 3. Send Message
            const res = await sendMessage(
                conversationId,
                currentUser.id,
                message,
                uploadedAttachments
            );

            if (res.success) {
                toast.success("Message sent successfully!");
                handleOpenChange(false);
            } else {
                toast.error("Failed to send message");
            }

        } catch (error) {
            console.error(error);
            toast.error("Something went wrong");
        } finally {
            setIsLoading(false);
            setUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline" size="sm">Message</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader className="flex flex-row items-center gap-3 space-y-0 border-b pb-4">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={recipientImage} />
                        <AvatarFallback>{recipientName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <DialogTitle>Message to {recipientName}</DialogTitle>
                        <span className="text-xs text-muted-foreground">Direct Message</span>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <Textarea
                        placeholder={`Type a message to ${recipientName.split(' ')[0]}...`}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="min-h-[120px] resize-none"
                    />

                    {/* Attachments List */}
                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {attachments.map((file, i) => (
                                <div key={i} className="flex items-center gap-2 bg-muted p-2 rounded-md text-xs relative group">
                                    {file.type.startsWith('image/') ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                                    <span className="max-w-[150px] truncate">{file.name}</span>
                                    <button
                                        onClick={() => removeAttachment(i)}
                                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                multiple
                                onChange={handleFileSelect}
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isLoading || uploading}
                            >
                                <Paperclip className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button onClick={handleSend} disabled={isLoading || uploading || (!message.trim() && attachments.length === 0)} className="gap-2">
                            {(isLoading || uploading) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Send
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
