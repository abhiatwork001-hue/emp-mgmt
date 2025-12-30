"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Send, ArrowLeft, MoreVertical, Phone, Video, Paperclip, X, File as FileIcon, Check, CheckCheck, Clock, Download, Smile, Info, Trash, BellOff, Bell, Mic, StopCircle, Play, Pause, FastForward, PhoneOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sendMessage, markMessagesAsRead, toggleReaction, deleteConversation, toggleMuteConversation } from "@/lib/actions/message.actions";
import { cn } from "@/lib/utils";
import { UploadButton, useUploadThing } from "@/lib/uploadthing";
import { useCall } from "@/context/call-context";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
    ContextMenuShortcut,
} from "@/components/ui/context-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteMessageForEveryone, deleteMessageForMe } from "@/lib/actions/message.actions";

function VoicePlayer({ attachment, isMe }: { attachment: any, isMe: boolean }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play();
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) setDuration(audioRef.current.duration);
    };

    const togglePlaybackRate = () => {
        const rates = [1, 1.5, 2];
        const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
        setPlaybackRate(nextRate);
        if (audioRef.current) audioRef.current.playbackRate = nextRate;
    };

    return (
        <div className={cn(
            "flex items-center gap-3 p-3 rounded-2xl min-w-[240px] border shadow-sm",
            isMe ? "bg-primary text-primary-foreground border-primary/20" : "bg-card border-border"
        )}>
            <audio
                ref={audioRef}
                src={attachment.url}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                controlsList="nodownload"
            />
            <Button
                variant="ghost"
                size="icon"
                className={cn("h-10 w-10 rounded-full flex-shrink-0 transition-transform active:scale-95", isMe ? "bg-white/10 hover:bg-white/20 text-primary-foreground" : "bg-primary/10 hover:bg-primary/20 text-primary")}
                onClick={togglePlay}
            >
                {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-1" />}
            </Button>
            <div className="flex-1 space-y-1 py-1">
                {/* Visual Waveform Placeholder */}
                <div className="flex items-center gap-[2px] h-6 px-1">
                    {[...Array(20)].map((_, i) => {
                        const progress = (currentTime / duration) * 100 || 0;
                        const barProgress = (i / 20) * 100;
                        const isPlayed = barProgress < progress;
                        // Random-ish heights for a waveform look
                        const height = [40, 70, 50, 90, 60, 80, 40, 70, 50, 85, 45, 75, 55, 95, 65, 85, 45, 75, 50, 80][i];

                        return (
                            <div
                                key={i}
                                className={cn(
                                    "w-[3px] rounded-full transition-all duration-300",
                                    isPlayed ? (isMe ? "bg-white" : "bg-primary") : (isMe ? "bg-white/30" : "bg-muted-foreground/30")
                                )}
                                style={{ height: `${height}%` }}
                            />
                        );
                    })}
                </div>
                <div className="flex justify-between items-center text-[10px] font-medium opacity-80 px-1">
                    <span>{Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')}</span>
                    <span>{Math.floor(duration / 60)}:{(Math.floor(duration % 60)).toString().padStart(2, '0')}</span>
                </div>
            </div>
            <button
                onClick={togglePlaybackRate}
                className={cn(
                    "text-[10px] font-bold px-2 py-1 rounded-full border transition-all active:scale-90",
                    isMe
                        ? "border-white/20 hover:bg-white/10"
                        : "border-border hover:bg-muted",
                    playbackRate !== 1 && (isMe ? "bg-white/20" : "bg-primary/10 text-primary")
                )}
            >
                {playbackRate}x
            </button>
        </div>
    );
}

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
    const [pendingAudioFile, setPendingAudioFile] = useState<{ file: File; url: string; duration: number } | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [selectedMessageForMenu, setSelectedMessageForMenu] = useState<any>(null);
    const [replyingTo, setReplyingTo] = useState<any>(null);
    const [fullscreenMedia, setFullscreenMedia] = useState<{ url: string; name: string; type: string } | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const { startCall } = useCall();
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setIsMobile(window.innerWidth < 768);
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { startUpload, isUploading: isAudioUploading } = useUploadThing("taskAttachment");

    // Alert Dialog State
    const [alertConfig, setAlertConfig] = useState<{
        open: boolean;
        title: string;
        description: string;
        onConfirm: () => void;
        variant?: 'default' | 'destructive';
    }>({
        open: false,
        title: "",
        description: "",
        onConfirm: () => { },
    });

    const getDisplayName = () => {
        if (conversation.type === 'group') return conversation.name || 'Group Chat';
        const otherParticipant = conversation.participants.find((p: any) => (p._id || p) !== currentUserId);
        return otherParticipant ? `${otherParticipant.firstName} ${otherParticipant.lastName}` : 'Chat';
    };

    const getDisplayImage = () => {
        if (conversation.type === 'group') return null;
        const otherParticipant = conversation.participants.find((p: any) => (p._id || p) !== currentUserId);
        return otherParticipant?.image;
    };

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
        if ((!newMessage.trim() && attachments.length === 0 && !pendingAudioFile) || isSending) return;

        const content = newMessage.trim();
        let currentAttachments = [...attachments];

        setNewMessage("");
        setAttachments([]);
        setIsSending(true);

        // Upload pending audio file if exists
        if (pendingAudioFile) {
            try {
                const uploadRes = await startUpload([pendingAudioFile.file]);
                if (uploadRes?.[0]) {
                    currentAttachments.push({
                        url: uploadRes[0].ufsUrl || uploadRes[0].url,
                        type: 'audio',
                        name: `Voice Message (${pendingAudioFile.duration}s)`,
                    });
                }
                // Clean up blob URL
                URL.revokeObjectURL(pendingAudioFile.url);
                setPendingAudioFile(null);
            } catch (err) {
                console.error("Audio upload failed", err);
                setIsSending(false);
                return;
            }
        }

        // Optimistic UI
        const optimisticMsg = {
            _id: `temp-${Date.now()}`,
            content: content,
            attachments: currentAttachments,
            sender: { _id: currentUserId },
            createdAt: new Date().toISOString(),
            readBy: [currentUserId],
            pending: true
        };
        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const res = await sendMessage(conversation._id, currentUserId, content, currentAttachments, replyingTo?._id);
            if (res.success) {
                setMessages(prev => prev.map(m => m._id === optimisticMsg._id ? res.message : m));
                setReplyingTo(null);
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



    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setSelectedMessageForMenu(null);
        // Maybe add a toast here later if needed
    };

    const scrollToMessage = (messageId: string) => {
        const el = document.getElementById(`msg-${messageId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('bg-primary/20');
            setTimeout(() => el.classList.remove('bg-primary/20'), 2000);
        }
    };

    const handleLongPressStart = (msg: any) => {
        if (msg.isDeleted || msg.pending) return;
        longPressTimer.current = setTimeout(() => {
            setSelectedMessageForMenu(msg);
            // Vibrate if supported
            if (navigator.vibrate) navigator.vibrate(50);
        }, 500);
    };

    const handleLongPressEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const startRecording = async () => {
        try {
            // Check if getUserMedia is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert("Voice recording is not available. Please use HTTPS or a browser that supports audio recording.");
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Determine supported mime type
            let mimeType = 'audio/webm';
            if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4';
            } else if (MediaRecorder.isTypeSupported('audio/acc')) {
                mimeType = 'audio/acc';
            } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                mimeType = 'audio/webm;codecs=opus';
            }

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                const ext = mimeType.split('/')[1].split(';')[0];
                const audioFile = new File([audioBlob], `voice-message-${Date.now()}.${ext}`, { type: mimeType });
                const audioBlobUrl = URL.createObjectURL(audioBlob);
                const duration = recordingTime; // Capture duration before state reset

                // Store for preview instead of uploading immediately
                setPendingAudioFile({
                    file: audioFile,
                    url: audioBlobUrl,
                    duration: duration
                });
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Recording failed", err);
            alert("Failed to start recording. Please check your microphone permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background">
            <AlertDialog open={alertConfig.open} onOpenChange={(open) => setAlertConfig(prev => ({ ...prev, open }))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{alertConfig.title}</AlertDialogTitle>
                        <AlertDialogDescription>{alertConfig.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={alertConfig.onConfirm}
                            className={cn(alertConfig.variant === 'destructive' && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
                        >
                            Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Mobile Long-Press Menu */}
            <Dialog open={!!selectedMessageForMenu} onOpenChange={(open) => !open && setSelectedMessageForMenu(null)}>
                <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-t sm:border rounded-t-3xl sm:rounded-3xl bottom-0 sm:bottom-auto top-auto sm:top-1/2 translate-y-0 sm:-translate-y-1/2 fixed sm:relative max-h-[80vh]">
                    <DialogTitle className="sr-only">Message Options</DialogTitle>
                    <div className="p-6 space-y-6">
                        {/* Reactions on top */}
                        <div className="flex justify-between items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                            {['👍', '❤️', '😂', '😮', '😢', '😡'].map(emoji => {
                                const isSelected = selectedMessageForMenu?.reactions?.some((r: any) => (r.user?._id || r.user) === currentUserId && r.emoji === emoji);
                                return (
                                    <button
                                        key={emoji}
                                        className={cn(
                                            "text-3xl p-3 hover:bg-muted rounded-2xl transition-all active:scale-90 flex-shrink-0",
                                            isSelected && "bg-primary/20 scale-110"
                                        )}
                                        onClick={async () => {
                                            await toggleReaction(selectedMessageForMenu._id, currentUserId, emoji);
                                            setSelectedMessageForMenu(null);
                                            router.refresh();
                                        }}
                                    >
                                        {emoji}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="grid gap-2">
                            <Button
                                variant="ghost"
                                className="w-full justify-start h-14 rounded-2xl text-base gap-3"
                                onClick={() => {
                                    setReplyingTo(selectedMessageForMenu);
                                    setSelectedMessageForMenu(null);
                                }}
                            >
                                <ArrowLeft className="h-5 w-5 rotate-180 text-muted-foreground" />
                                <span>Reply</span>
                            </Button>

                            <Button
                                variant="ghost"
                                className="w-full justify-start h-14 rounded-2xl text-base gap-3"
                                onClick={() => handleCopy(selectedMessageForMenu.content)}
                            >
                                <Download className="h-5 w-5 rotate-180 text-muted-foreground" />
                                <span>Copy Text</span>
                            </Button>

                            <Button
                                variant="ghost"
                                className="w-full justify-start h-14 rounded-2xl text-base gap-3"
                                onClick={() => {
                                    setAlertConfig({
                                        open: true,
                                        title: "Delete for me?",
                                        description: "This message will be hidden from your chat window.",
                                        onConfirm: async () => {
                                            const res = await deleteMessageForMe(selectedMessageForMenu._id, currentUserId);
                                            if (res.success) router.refresh();
                                        }
                                    });
                                    setSelectedMessageForMenu(null);
                                }}
                            >
                                <Trash className="h-5 w-5 text-muted-foreground" />
                                <span>Delete for Me</span>
                            </Button>

                            {selectedMessageForMenu && (selectedMessageForMenu.sender?._id || selectedMessageForMenu.sender) === currentUserId && (
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start h-14 rounded-2xl text-base gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                        setAlertConfig({
                                            open: true,
                                            title: "Delete for everyone?",
                                            description: "This will remove the message for everyone. This action cannot be undone.",
                                            variant: 'destructive',
                                            onConfirm: async () => {
                                                const res = await deleteMessageForEveryone(selectedMessageForMenu._id, currentUserId);
                                                if (res.success) router.refresh();
                                            }
                                        });
                                        setSelectedMessageForMenu(null);
                                    }}
                                >
                                    <Trash className="h-5 w-5" />
                                    <span>Delete for Everyone</span>
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Full-Screen Media Viewer */}
            <Dialog open={!!fullscreenMedia} onOpenChange={(open) => !open && setFullscreenMedia(null)}>
                <DialogContent className="max-w-none w-screen h-[100dvh] p-0 overflow-hidden border-none bg-black/95 shadow-none z-[1000] flex flex-col items-center justify-center">
                    <DialogTitle className="sr-only">Media Viewer</DialogTitle>
                    <div className="absolute top-4 left-4 right-4 flex justify-between z-50">
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setFullscreenMedia(null)}>
                            <X className="h-6 w-6" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => fullscreenMedia && handleDownload(fullscreenMedia.url, fullscreenMedia.name)}>
                            <Download className="h-6 w-6" />
                        </Button>
                    </div>
                    {fullscreenMedia?.type === 'image' && (
                        <img src={fullscreenMedia.url} alt="full-size" className="w-full h-full object-contain" />
                    )}
                    {fullscreenMedia?.type === 'video' && (
                        <video src={fullscreenMedia.url} controls autoPlay className="w-full h-full object-contain" />
                    )}
                    <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
                        <p className="text-white/60 text-sm">{fullscreenMedia?.name}</p>
                    </div>
                </DialogContent>
            </Dialog>



            {/* Header */}
            <div className="h-16 border-b flex-shrink-0 flex items-center px-4 justify-between bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-20">
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
                    <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => {
                        const otherParticipant = conversation.type === 'group' ? null : conversation.participants.find((p: any) => (p._id || p) !== currentUserId);
                        if (otherParticipant) startCall(otherParticipant._id || otherParticipant, otherParticipant.firstName, otherParticipant.image, false);
                    }}><Phone className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => {
                        const otherParticipant = conversation.type === 'group' ? null : conversation.participants.find((p: any) => (p._id || p) !== currentUserId);
                        if (otherParticipant) startCall(otherParticipant._id || otherParticipant, otherParticipant.firstName, otherParticipant.image, true);
                    }}><Video className="h-4 w-4" /></Button>

                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground" title="Chat Info">
                                <Info className="h-4 w-4" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent>
                            <SheetHeader>
                                <SheetTitle>Conversation Info</SheetTitle>
                            </SheetHeader>
                            <div className="mt-6 h-full">
                                <Tabs defaultValue="members" className="w-full">
                                    <TabsList className="w-full">
                                        <TabsTrigger value="members" className="flex-1">Members</TabsTrigger>
                                        <TabsTrigger value="media" className="flex-1">Media</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="members" className="mt-4 space-y-4">
                                        <ScrollArea className="h-[calc(100vh-200px)]">
                                            {conversation.participants.map((p: any) => (
                                                <div key={p._id} className="flex items-center gap-3 mb-4 last:mb-0">
                                                    <Avatar>
                                                        <AvatarImage src={p.image} />
                                                        <AvatarFallback>{p.firstName?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="text-sm font-medium">{p.firstName} {p.lastName}</p>
                                                        <p className="text-xs text-muted-foreground">{p.email}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </ScrollArea>
                                    </TabsContent>
                                    <TabsContent value="media" className="mt-4">
                                        <ScrollArea className="h-[calc(100vh-200px)]">
                                            {messages.filter((m: any) => m.attachments?.length > 0).length === 0 ? (
                                                <p className="text-center text-muted-foreground text-sm py-8">No shared media</p>
                                            ) : (
                                                <div className="grid grid-cols-3 gap-2 pr-4">
                                                    {messages.filter((m: any) => m.attachments?.length > 0).flatMap((m: any) => m.attachments).map((att: any, i: number) => (
                                                        <div key={i} className="aspect-square relative rounded-md overflow-hidden bg-muted border cursor-pointer hover:opacity-90" onClick={() => setFullscreenMedia(att)}>
                                                            {att.type === 'image' ? (
                                                                <img src={att.url} alt="media" className="object-cover w-full h-full" />
                                                            ) : (
                                                                <div className="flex items-center justify-center h-full">
                                                                    <FileIcon className="h-6 w-6 text-muted-foreground" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </ScrollArea>
                                    </TabsContent>
                                </Tabs>

                                <div className="mt-8 border-t pt-6 space-y-4 px-1">
                                    <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Actions</h3>

                                    <Button
                                        variant="outline"
                                        className="w-full justify-start gap-3 h-11"
                                        onClick={async () => {
                                            const res = await toggleMuteConversation(conversation._id, currentUserId);
                                            if (res.success) {
                                                router.refresh();
                                            }
                                        }}
                                    >
                                        {(conversation.mutedBy || []).includes(currentUserId) ? (
                                            <>
                                                <Bell className="h-4 w-4 text-primary" />
                                                <span>Unmute Notifications</span>
                                            </>
                                        ) : (
                                            <>
                                                <BellOff className="h-4 w-4 text-muted-foreground" />
                                                <span>Mute Notifications</span>
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="w-full justify-start gap-3 h-11 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={async () => {
                                            if (confirm("Are you sure you want to delete this conversation for yourself? The chat history will be hidden until you receive a new message.")) {
                                                const res = await deleteConversation(conversation._id, currentUserId);
                                                if (res.success && res.redirect) {
                                                    router.push('/dashboard/messages');
                                                }
                                            }
                                        }}
                                    >
                                        <Trash className="h-4 w-4" />
                                        <span>Delete Conversation</span>
                                    </Button>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={async () => {
                                const res = await toggleMuteConversation(conversation._id, currentUserId);
                                if (res.success) router.refresh();
                            }}>
                                {(conversation.mutedBy || []).includes(currentUserId) ? (
                                    <>
                                        <Bell className="mr-2 h-4 w-4 text-primary" />
                                        <span>Unmute Notifications</span>
                                    </>
                                ) : (
                                    <>
                                        <BellOff className="mr-2 h-4 w-4" />
                                        <span>Mute Notifications</span>
                                    </>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={() => {
                                    setAlertConfig({
                                        open: true,
                                        title: "Delete conversation?",
                                        description: "This will hide the conversation from your list.",
                                        variant: 'destructive',
                                        onConfirm: async () => {
                                            const res = await deleteConversation(conversation._id, currentUserId);
                                            if (res.success && res.redirect) router.push('/dashboard/messages');
                                        }
                                    });
                                }}
                            >
                                <Trash className="mr-2 h-4 w-4" />
                                <span>Delete Conversation</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain scroll-smooth min-h-0" style={{ WebkitOverflowScrolling: 'touch' }} ref={scrollRef}>
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

                        const reactions = msg.reactions || [];
                        const groupedReactions = reactions.reduce((acc: any, r: any) => {
                            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                            return acc;
                        }, {});
                        const myReactions = reactions.filter((r: any) => (r.user?._id || r.user) === currentUserId).map((r: any) => r.emoji);

                        return (
                            <ContextMenu key={msg._id}>
                                <ContextMenuTrigger disabled={isMobile} asChild>
                                    <div
                                        className={cn("flex w-full gap-2", isMe ? "justify-end" : "justify-start")}
                                        onTouchStart={() => handleLongPressStart(msg)}
                                        onTouchEnd={handleLongPressEnd}
                                        onTouchMove={handleLongPressEnd}
                                    >
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
                                        <div id={`msg-${msg._id}`} className={cn("flex items-end gap-2 max-w-[85%] group select-none touch-none", isMe ? "flex-row-reverse" : "flex-row")}>
                                            <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                                                {!isMe && showAvatar && conversation.type === 'group' && (
                                                    <p className="text-[10px] text-muted-foreground mb-1 font-semibold opacity-75 px-1">{msg.sender?.firstName}</p>
                                                )}

                                                {/* Reply Context */}
                                                {msg.parentMessageId && (
                                                    <div
                                                        className={cn(
                                                            "mb-1 p-2 rounded-lg text-xs bg-muted/50 border-l-4 border-primary cursor-pointer max-w-[200px] truncate",
                                                            isMe ? "rounded-br-none" : "rounded-bl-none"
                                                        )}
                                                        onClick={() => scrollToMessage(msg.parentMessageId._id)}
                                                    >
                                                        <p className="font-semibold text-[10px] text-primary">{msg.parentMessageId.sender?.firstName}</p>
                                                        <div className="flex items-center gap-1 opacity-70 truncate">
                                                            {msg.parentMessageId.attachments?.length > 0 && <Paperclip className="h-3 w-3 shrink-0" />}
                                                            <p className="truncate">{msg.parentMessageId.content || (msg.parentMessageId.attachments?.length ? "Media" : "")}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {msg.isDeleted ? (
                                                    <div className={cn(
                                                        "px-4 py-2 rounded-2xl text-xs shadow-sm bg-muted text-muted-foreground italic flex items-center gap-2",
                                                        isMe ? "rounded-br-none" : "rounded-bl-none"
                                                    )}>
                                                        <Trash className="h-3 w-3" />
                                                        <span>This message was deleted</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-1">
                                                        {/* Attachments */}
                                                        {msg.attachments && msg.attachments.length > 0 && (
                                                            <div className={cn("space-y-1 mb-1 flex flex-col", isMe ? "items-end" : "items-start")}>
                                                                {msg.attachments.filter((a: any) => a.type !== 'audio').map((att: any, i: number) => (
                                                                    <div key={i} className="rounded-lg overflow-hidden border bg-muted/20 max-w-sm">
                                                                        {att.type === 'image' ? (
                                                                            <div className="cursor-pointer hover:opacity-90 transition-opacity max-h-48 overflow-hidden" onClick={() => setFullscreenMedia(att)}>
                                                                                <img src={att.url} alt="attachment" className="object-cover w-full h-full" />
                                                                            </div>
                                                                        ) : (
                                                                            <div
                                                                                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                                                                                onClick={() => handleDownload(att.url, att.name || 'file')}
                                                                            >
                                                                                <FileIcon className="h-5 w-5 text-muted-foreground" />
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="text-xs font-medium truncate">{att.name || 'document.pdf'}</p>
                                                                                </div>
                                                                                <Download className="h-4 w-4 opacity-50" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Voice Message */}
                                                        {msg.attachments?.some((a: any) => a.type === 'audio') && (
                                                            <VoicePlayer attachment={msg.attachments.find((a: any) => a.type === 'audio')} isMe={isMe} />
                                                        )}

                                                        {/* Text Content */}
                                                        {(msg.content && msg.content !== "Sent an attachment" && msg.content !== "\u200B") && (
                                                            <div className={cn(
                                                                "px-4 py-2 rounded-2xl text-sm shadow-sm",
                                                                isMe ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted rounded-bl-none"
                                                            )}>
                                                                <p className="break-words leading-relaxed">{msg.content}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Status & Timestamp */}
                                                <div className={cn("text-[9px] mt-1 flex items-center opacity-70 gap-1 px-1", isMe ? "justify-end text-muted-foreground" : "justify-start text-muted-foreground")}>
                                                    {format(new Date(msg.createdAt), "h:mm a")}
                                                    {isMe && !msg.isDeleted && (
                                                        msg.pending ? <Clock className="h-3 w-3 animate-pulse" /> : (isRead ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)
                                                    )}
                                                </div>

                                                {/* Reactions Display */}
                                                {Object.keys(groupedReactions).length > 0 && (
                                                    <div className={cn("flex gap-1 mt-1 flex-wrap", isMe ? "justify-end" : "justify-start")}>
                                                        {Object.entries(groupedReactions).map(([emoji, count]) => (
                                                            <button
                                                                key={emoji}
                                                                onClick={() => toggleReaction(msg._id, currentUserId, emoji)}
                                                                className={cn(
                                                                    "text-xs border px-1.5 py-0.5 rounded-full flex items-center gap-1 transition-colors scale-90",
                                                                    myReactions.includes(emoji) ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted/50 border-transparent hover:bg-muted"
                                                                )}
                                                            >
                                                                <span>{emoji}</span>
                                                                <span className="text-[9px] opacity-70">{count as number}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Menu (Reactions & Delete) */}
                                            <div className="flex flex-col gap-1 items-center self-center">
                                                {!msg.isDeleted && (
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex">
                                                                <Smile className="h-4 w-4 text-muted-foreground" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-1 flex gap-1 bg-background border shadow-md" side="top">
                                                            {['👍', '❤️', '😂', '😮', '😢', '😡'].map(emoji => (
                                                                <button
                                                                    key={emoji}
                                                                    className={cn("text-xl p-2 hover:bg-muted rounded-md transition-colors", myReactions.includes(emoji) && "bg-muted")}
                                                                    onClick={() => toggleReaction(msg._id, currentUserId, emoji)}
                                                                >
                                                                    {emoji}
                                                                </button>
                                                            ))}
                                                        </PopoverContent>
                                                    </Popover>
                                                )}

                                                {!msg.isDeleted && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hidden md:flex"
                                                            >
                                                                <Trash className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align={isMe ? "end" : "start"}>
                                                            <DropdownMenuItem onClick={() => {
                                                                setAlertConfig({
                                                                    open: true,
                                                                    title: "Delete for me?",
                                                                    description: "This message will be hidden from your chat window.",
                                                                    onConfirm: async () => {
                                                                        const res = await deleteMessageForMe(msg._id, currentUserId);
                                                                        if (res.success) router.refresh();
                                                                    }
                                                                });
                                                            }}>
                                                                <Trash className="mr-2 h-4 w-4" />
                                                                <span>Delete for Me</span>
                                                            </DropdownMenuItem>
                                                            {isMe && (
                                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => {
                                                                    setAlertConfig({
                                                                        open: true,
                                                                        title: "Delete for everyone?",
                                                                        description: "This will remove the message for everyone. This action cannot be undone.",
                                                                        variant: 'destructive',
                                                                        onConfirm: async () => {
                                                                            const res = await deleteMessageForEveryone(msg._id, currentUserId);
                                                                            if (res.success) router.refresh();
                                                                        }
                                                                    });
                                                                }}>
                                                                    <Trash className="mr-2 h-4 w-4" />
                                                                    <span>Delete for Everyone</span>
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                </ContextMenuTrigger>
                                <ContextMenuContent className="w-56">
                                    {!msg.isDeleted && (
                                        <>
                                            <ContextMenuItem onClick={() => setReplyingTo(msg)}>
                                                <ArrowLeft className="mr-2 h-4 w-4 rotate-180" />
                                                <span>Reply</span>
                                            </ContextMenuItem>
                                            <ContextMenuItem onClick={() => handleCopy(msg.content)}>
                                                <Download className="mr-2 h-4 w-4 rotate-180" />
                                                <span>Copy Text</span>
                                            </ContextMenuItem>
                                            <DropdownMenuSeparator />
                                            <ContextMenuItem onClick={() => {
                                                setAlertConfig({
                                                    open: true,
                                                    title: "Delete for me?",
                                                    description: "This message will be hidden from your chat window.",
                                                    onConfirm: async () => {
                                                        const res = await deleteMessageForMe(msg._id, currentUserId);
                                                        if (res.success) router.refresh();
                                                    }
                                                });
                                            }}>
                                                <Trash className="mr-2 h-4 w-4" />
                                                <span>Delete for Me</span>
                                            </ContextMenuItem>
                                            {isMe && (
                                                <ContextMenuItem className="text-destructive focus:text-destructive" onClick={() => {
                                                    setAlertConfig({
                                                        open: true,
                                                        title: "Delete for everyone?",
                                                        description: "This will remove the message for everyone. This action cannot be undone.",
                                                        variant: 'destructive',
                                                        onConfirm: async () => {
                                                            const res = await deleteMessageForEveryone(msg._id, currentUserId);
                                                            if (res.success) router.refresh();
                                                        }
                                                    });
                                                }}>
                                                    <Trash className="mr-2 h-4 w-4" />
                                                    <span>Delete for Everyone</span>
                                                </ContextMenuItem>
                                            )}
                                        </>
                                    )}
                                    {!msg.isDeleted && isMe && (
                                        <ContextMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => {
                                            setAlertConfig({
                                                open: true,
                                                title: "Delete for everyone?",
                                                description: "This will remove the message for all participants.",
                                                variant: 'destructive',
                                                onConfirm: async () => {
                                                    const res = await deleteMessageForEveryone(msg._id, currentUserId);
                                                    if (res.success) router.refresh();
                                                }
                                            });
                                        }}>
                                            <Trash className="mr-2 h-4 w-4" />
                                            <span>Delete for Everyone</span>
                                        </ContextMenuItem>
                                    )}
                                    {!msg.isDeleted && !isMe && (
                                        <ContextMenuItem onClick={() => toggleReaction(msg._id, currentUserId, '👍')}>
                                            <Smile className="mr-2 h-4 w-4" />
                                            <span>Quick React 👍</span>
                                        </ContextMenuItem>
                                    )}
                                    <ContextMenuSeparator />
                                    <ContextMenuItem onClick={async () => {
                                        const res = await toggleMuteConversation(conversation._id, currentUserId);
                                        if (res.success) router.refresh();
                                    }}>
                                        {(conversation.mutedBy || []).includes(currentUserId) ? (
                                            <>
                                                <Bell className="mr-2 h-4 w-4 text-primary" />
                                                <span>Unmute Chat</span>
                                            </>
                                        ) : (
                                            <>
                                                <BellOff className="mr-2 h-4 w-4 text-muted-foreground" />
                                                <span>Mute Notifications</span>
                                            </>
                                        )}
                                    </ContextMenuItem>
                                    <ContextMenuItem className="text-destructive" onClick={() => {
                                        setAlertConfig({
                                            open: true,
                                            title: "Delete conversation?",
                                            description: "This will hide the conversation from your list. It will reappear if you receive a new message.",
                                            variant: 'destructive',
                                            onConfirm: async () => {
                                                const res = await deleteConversation(conversation._id, currentUserId);
                                                if (res.success && res.redirect) router.push('/dashboard/messages');
                                            }
                                        });
                                    }}>
                                        <Trash className="mr-2 h-4 w-4" />
                                        <span>Delete Conversation</span>
                                    </ContextMenuItem>
                                </ContextMenuContent>
                            </ContextMenu>
                        );
                    })
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-background border-t">
                {replyingTo && (
                    <div className="flex items-center justify-between p-2 mb-2 bg-muted/50 border-l-4 border-primary rounded-lg animate-in slide-in-from-bottom-2">
                        <div className="flex-1 min-w-0 pr-4">
                            <p className="text-[10px] font-semibold text-primary">{replyingTo.sender?.firstName || 'Message'}</p>
                            <div className="flex items-center gap-1 opacity-70 truncate">
                                {replyingTo.attachments?.length > 0 && <Paperclip className="h-3 w-3 shrink-0" />}
                                <p className="text-xs truncate">{replyingTo.content || "Media"}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setReplyingTo(null)}>
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                )}
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
                {/* Audio Preview */}
                {pendingAudioFile && (
                    <div className="flex items-center gap-2 mb-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                        <audio src={pendingAudioFile.url} controls controlsList="nodownload" className="flex-1 h-10" />
                        <span className="text-xs text-primary font-medium">{Math.floor(pendingAudioFile.duration / 60)}:{(pendingAudioFile.duration % 60).toString().padStart(2, '0')}</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-destructive"
                            onClick={() => {
                                URL.revokeObjectURL(pendingAudioFile.url);
                                setPendingAudioFile(null);
                            }}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                <div className="flex gap-2 items-end">
                    <div className="shrink-0">
                        {!isRecording && !pendingAudioFile ? (
                            <div className="flex items-center gap-0.5">
                                <UploadButton
                                    endpoint="taskAttachment"
                                    onClientUploadComplete={(res) => {
                                        if (res) {
                                            const newAtts = res.map((f: any) => {
                                                let type = 'file';
                                                if (f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) type = 'image';
                                                else if (f.name.match(/\.(mp4|webm|mov|ogg)$/i)) type = 'video';

                                                return {
                                                    url: f.ufsUrl || f.url,
                                                    type: type,
                                                    name: f.name
                                                };
                                            });
                                            setAttachments(prev => [...prev, ...newAtts]);
                                        }
                                    }}
                                    appearance={{
                                        button: "bg-transparent text-muted-foreground hover:bg-muted p-1.5 h-8 w-8 md:h-10 md:w-10 md:p-2 min-w-[2rem] md:min-w-[2.5rem] max-w-[2rem] md:max-w-[2.5rem] rounded-md shadow-none after:hidden border-none text-current focus-within:ring-0",
                                        allowedContent: "hidden",
                                        container: "w-auto m-0 p-0 max-w-[2rem] md:max-w-[2.5rem]"
                                    }}
                                    content={{
                                        button: <Paperclip className="h-4 w-4 md:h-5 md:w-5" />
                                    }}
                                />
                                <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10 rounded-md text-muted-foreground hover:bg-muted" onClick={startRecording}>
                                    <Mic className="h-4 w-4 md:h-5 md:w-5" />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 animate-pulse">
                                <div className="h-2 w-2 rounded-full bg-destructive animate-ping" />
                                <span className="text-sm font-mono text-primary">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive" onClick={stopRecording}>
                                    <StopCircle className="h-5 w-5" />
                                </Button>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSend} className="flex-1 flex gap-2">
                        <Input
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            placeholder={isRecording ? "Recording..." : "Type a message..."}
                            className="flex-1"
                            disabled={isRecording || !!pendingAudioFile}
                            autoFocus
                        />
                        <Button type="submit" size="icon" disabled={(!newMessage.trim() && attachments.length === 0 && !pendingAudioFile) || isSending || isRecording}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </div>

            {/* Mobile spacer for bottom nav */}
            <div className="h-20 md:hidden" aria-hidden="true" />
        </div>
    );
}
