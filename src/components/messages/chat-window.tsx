"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Send, ArrowLeft, MoreVertical, Phone, Video, Paperclip, X, File as FileIcon, Check, CheckCheck, Clock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sendMessage, markMessagesAsRead } from "@/lib/actions/message.actions";
import { cn } from "@/lib/utils";
import { UploadButton } from "@/lib/uploadthing";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";

interface ChatWindowProps {
    conversation: any;
    initialMessages: any[];
    currentUserId: string;
}

export function ChatWindow({ conversation, initialMessages, currentUserId }: ChatWindowProps) {
    const router = useRouter();
    const [messages, setMessages] = useState(initialMessages);
    const [newMessage, setNewMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [attachments, setAttachments] = useState<any[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on load and new message
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Update messages when initialMessages changes (server refresh)
    useEffect(() => {
        setMessages(initialMessages);

        // Check if there are any unread messages for current user
        if (conversation?._id) {
            const hasUnread = initialMessages.some((msg: any) => {
                const isMe = (msg.sender?._id || msg.sender) === currentUserId;
                if (isMe) return false;
                const readBy = msg.readBy || [];
                return !readBy.includes(currentUserId);
            });

            if (hasUnread) {
                markMessagesAsRead(conversation._id, currentUserId);
            }
        }
    }, [initialMessages, conversation._id, currentUserId]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if ((!newMessage.trim() && attachments.length === 0) || isSending) return;

        const content = newMessage.trim();
        const currentAttachments = [...attachments];

        setNewMessage("");
        setAttachments([]);
        setIsSending(true);

        // Optimistic UI
        const optimisticMsg = {
            _id: `temp-${Date.now()}`,
            content: content,
            attachments: currentAttachments,
            sender: { _id: currentUserId }, // Minimal user obj
            createdAt: new Date().toISOString(),
            readBy: [currentUserId],
            pending: true
        };
        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const res = await sendMessage(conversation._id, currentUserId, content, currentAttachments);
            if (res.success) {
                setMessages(prev => prev.map(m => m._id === optimisticMsg._id ? res.message : m));
                router.refresh();
            } else {
                setMessages(prev => prev.filter(m => m._id !== optimisticMsg._id));
            }
        } catch (err) {
            console.error(err);
            setMessages(prev => prev.filter(m => m._id !== optimisticMsg._id));
        } finally {
            setIsSending(false);
        }
    };

    const handleDownload = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Download failed", error);
            window.open(url, '_blank');
        }
    };

    // Derived Display Info
    const getDisplayName = () => {
        if (conversation.type === 'group' && conversation.name) return conversation.name;
        const others = conversation.participants.filter((p: any) => p._id !== currentUserId);
        return others.map((p: any) => `${p.firstName} ${p.lastName}`).join(", ");
    };

    const getDisplayImage = () => {
        const others = conversation.participants.filter((p: any) => p._id !== currentUserId);
        return others.length === 1 ? others[0].image : null;
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="h-16 border-b flex items-center px-4 justify-between bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => router.push('/dashboard/messages')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Avatar className="h-9 w-9 border">
                        <AvatarImage src={getDisplayImage()} />
                        <AvatarFallback>{getDisplayName().substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="grid gap-0.5">
                        <p className="font-semibold text-sm">{getDisplayName()}</p>
                        {conversation.type === 'group' && (
                            <p className="text-[10px] text-muted-foreground">{conversation.participants.length} members</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="text-muted-foreground"><Phone className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground"><Video className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground"><MoreVertical className="h-4 w-4" /></Button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                        <p>No messages yet.</p>
                        <p className="text-xs">Say hello!</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = (msg.sender?._id || msg.sender) === currentUserId;
                        const showAvatar = !isMe && (idx === 0 || messages[idx - 1].sender?._id !== msg.sender?._id);
                        const isRead = msg.readBy && msg.readBy.length > 1;

                        return (
                            <div key={msg._id} className={cn("flex w-full gap-2", isMe ? "justify-end" : "justify-start")}>
                                {!isMe && (
                                    <div className="w-8 flex-shrink-0">
                                        {showAvatar && (
                                            <Avatar className="h-8 w-8 mt-1">
                                                <AvatarImage src={msg.sender?.image} />
                                                <AvatarFallback>{msg.sender?.firstName?.[0]}</AvatarFallback>
                                            </Avatar>
                                        )}
                                    </div>
                                )}
                                <div className={cn(
                                    "max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-sm",
                                    isMe ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted rounded-bl-none"
                                )}>
                                    {!isMe && showAvatar && conversation.type === 'group' && (
                                        <p className="text-[10px] text-muted-foreground mb-1 font-semibold opacity-75">{msg.sender?.firstName}</p>
                                    )}

                                    {/* Attachments */}
                                    {msg.attachments && msg.attachments.length > 0 && (
                                        <div className="mb-2 space-y-1">
                                            {msg.attachments.map((att: any, i: number) => (
                                                <div key={i} className="rounded-lg overflow-hidden">
                                                    {att.type === 'image' ? (
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <img
                                                                    src={att.url}
                                                                    alt="Attachment"
                                                                    className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                                />
                                                            </DialogTrigger>
                                                            <DialogContent className="max-w-4xl w-full bg-transparent border-none shadow-none p-0 flex flex-col items-center justify-center">
                                                                <DialogTitle className="sr-only">Image Preview</DialogTitle>
                                                                <img src={att.url} alt="Full preview" className="max-h-[85vh] w-auto rounded-lg shadow-2xl" />
                                                                <div className="mt-4">
                                                                    <Button
                                                                        variant="secondary"
                                                                        onClick={() => window.open(att.url, '_blank')}
                                                                    >
                                                                        <Download className="mr-2 h-4 w-4" />
                                                                        Download
                                                                    </Button>
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>
                                                    ) : (
                                                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-background/20 p-2 rounded hover:bg-background/30 transition-colors">
                                                            <FileIcon className="h-4 w-4" />
                                                            <span className="underline truncate max-w-[150px]">{att.name || 'Attachment'}</span>
                                                        </a>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {msg.content && <p className="break-words leading-relaxed">{msg.content}</p>}
                                    <div className={cn("text-[9px] mt-1 flex items-center justify-end opacity-70 gap-1", isMe ? "text-primary-foreground" : "text-muted-foreground")}>
                                        {format(new Date(msg.createdAt), "h:mm a")}
                                        {msg.pending ? (
                                            <Clock className="h-3 w-3 animate-pulse" />
                                        ) : isMe && (
                                            isRead ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-background border-t">
                {attachments.length > 0 && (
                    <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                        {attachments.map((att, i) => (
                            <div key={i} className="relative group flex-shrink-0">
                                {att.type === 'image' ? (
                                    <img src={att.url} className="h-16 w-16 object-cover rounded-md border" alt="Preview" />
                                ) : (
                                    <div className="h-16 w-16 bg-muted flex flex-col items-center justify-center rounded-md border p-1">
                                        <FileIcon className="h-6 w-6 text-muted-foreground" />
                                        <span className="text-[8px] truncate max-w-full block w-full text-center">{att.name || 'File'}</span>
                                    </div>
                                )}
                                <button
                                    onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-sm opacity-100 transition-opacity hover:scale-110"
                                    type="button"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex gap-2 items-end">
                    <div className="shrink-0 relative top-1">
                        <UploadButton
                            endpoint="taskAttachment"
                            onClientUploadComplete={(res) => {
                                if (res) {
                                    const newAtts = res.map(f => ({
                                        url: f.url,
                                        type: f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 'file',
                                        name: f.name
                                    }));
                                    setAttachments(prev => [...prev, ...newAtts]);
                                }
                            }}
                            onUploadError={(error: Error) => {
                                alert(`Error: ${error.message}`);
                            }}
                            appearance={{
                                button: "bg-transparent text-muted-foreground hover:bg-muted p-2 h-10 w-10 min-w-[2.5rem] rounded-md shadow-none after:hidden border-none text-current focus-within:ring-0",
                                allowedContent: "hidden",
                                container: "w-auto m-0 p-0"
                            }}
                            content={{
                                button: <Paperclip className="h-5 w-5" />
                            }}
                        />
                    </div>

                    <form onSubmit={handleSend} className="flex-1 flex gap-2">
                        <Input
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1"
                            autoFocus
                        />
                        <Button type="submit" size="icon" disabled={(!newMessage.trim() && attachments.length === 0) || isSending}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
