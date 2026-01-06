"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { format } from "date-fns";
import { Search, Plus, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { NewChatDialog } from "./NewChatDialog";
import { pusherClient } from "@/lib/pusher";
import { getConversations } from "@/lib/actions/message.actions";

interface ConversationListProps {
    conversations: any[];
    currentUserId: string;
    onSelect?: () => void; // Optional callback for mobile autoclose
}

export function ConversationList({ conversations, currentUserId, onSelect }: ConversationListProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [search, setSearch] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [localConversations, setLocalConversations] = useState(conversations);

    // Synchronize local state with props (initial server load)
    useEffect(() => {
        setLocalConversations(conversations);
    }, [conversations]);

    // Refresh when path changes (to clear unread count if we just opened a chat)
    useEffect(() => {
        if (currentUserId) {
            getConversations(currentUserId).then(setLocalConversations);
        }
    }, [pathname, currentUserId]);

    // Subscribe to real-time updates
    useEffect(() => {
        if (!currentUserId) return;

        const channel = pusherClient.subscribe(`user-${currentUserId}`);

        const handleUpdate = async () => {
            const updated = await getConversations(currentUserId);
            setLocalConversations(updated);
        };

        channel.bind("message:new", handleUpdate);

        return () => {
            channel.unbind("message:new", handleUpdate);
            pusherClient.unsubscribe(`user-${currentUserId}`);
        };
    }, [currentUserId]);

    const filtered = localConversations.filter(c => {
        const otherParticipants = c.participants.filter((p: any) => p._id !== currentUserId);
        const names = c.name || otherParticipants.map((p: any) => `${p.firstName} ${p.lastName}`).join(", ");
        return names.toLowerCase().includes(search.toLowerCase());
    });

    const getDisplayName = (c: any) => {
        if (c.type === 'group' && c.name) return c.name;
        const others = c.participants.filter((p: any) => p._id !== currentUserId);
        if (others.length === 0) return "Me (Note to self)"; // Should not happen often
        return others.map((p: any) => `${p.firstName} ${p.lastName}`).join(", ");
    };

    const getDisplayImage = (c: any) => {
        const others = c.participants.filter((p: any) => p._id !== currentUserId);
        if (others.length === 1) return others[0].image;
        return null; // Group generic
    };

    const getFallback = (c: any) => {
        const name = getDisplayName(c);
        return name.substring(0, 2).toUpperCase();
    }

    return (
        <div className="flex flex-col h-full bg-background/50">
            <div className="p-4 border-b space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight">Messages</h2>
                    <Button size="icon" variant="ghost" onClick={() => setIsDialogOpen(true)} title="New Message">
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search conversations..."
                        className="pl-8 bg-muted/50"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="flex flex-col gap-1 p-2">
                    {filtered.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <p className="text-sm">No conversations found.</p>
                            <Button variant="link" onClick={() => setIsDialogOpen(true)}>Start specific chat</Button>
                        </div>
                    ) : (
                        filtered.map(c => {
                            const isActive = pathname === `/dashboard/messages/${c._id}`;
                            const name = getDisplayName(c);
                            const image = getDisplayImage(c);
                            const lastMsg = c.lastMessage?.content || "No messages yet";
                            const timestamp = c.lastMessage?.createdAt ? format(new Date(c.lastMessage.createdAt), "MMM d, h:mm a") : "";

                            return (
                                <button
                                    key={c._id}
                                    onClick={() => {
                                        router.push(`/dashboard/messages/${c._id}`);
                                        if (onSelect) onSelect();
                                    }}
                                    className={cn(
                                        "flex items-start gap-3 p-3 text-left rounded-lg transition-colors hover:bg-muted/50",
                                        isActive && "bg-muted"
                                    )}
                                >
                                    <Avatar>
                                        <AvatarImage src={image} />
                                        <AvatarFallback className={cn("bg-primary/10 text-primary")}>
                                            {c.type === 'group' ? <UsersIcon /> : getFallback(c)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0 grid gap-1">
                                        <div className="flex items-center justify-between">
                                            <span className={cn("font-semibold truncate text-sm", c.unreadCount > 0 ? "text-foreground font-bold" : "")}>{name}</span>
                                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timestamp}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={cn("text-xs truncate max-w-[80%]", c.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>{lastMsg}</p>
                                            {c.unreadCount > 0 && (
                                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                                                    {c.unreadCount > 9 ? '9+' : c.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </ScrollArea>

            <NewChatDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                currentUserId={currentUserId}
            />
        </div>
    );
}

function UsersIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    )
}
