"use client";

import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { pusherClient } from "@/lib/pusher";
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/actions/notification.actions";
import { useRouter, usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface NotificationBellProps {
    userId?: string;
}

export function NotificationBell({ userId }: NotificationBellProps) {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [useFallback, setUseFallback] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    // 1. Fetch initial history
    useEffect(() => {
        if (!userId) return;

        const init = async () => {
            const data = await getUserNotifications(userId);
            setNotifications(data);
            setUnreadCount(data.filter((n: any) => !n.read).length);
        };
        init();
    }, [userId]);

    // 2. Real-time Subscription with Pusher
    useEffect(() => {
        if (!userId) return;

        const channel = pusherClient.subscribe(`user-${userId}`);

        // Monitor connection state
        const checkConnection = () => {
            const state = pusherClient.connection.state;
            if (state === 'failed' || state === 'unavailable' || state === 'disconnected') {
                console.warn(`⚠️ Pusher state: ${state}, switching to polling fallback`);
                setUseFallback(true);
            } else if (state === 'connected') {
                setUseFallback(false);
            }
        };

        // Check connection more frequently
        const connectionCheck = setInterval(checkConnection, 5000);
        checkConnection(); // Initial check


        channel.bind("notification:new", (newNotif: any) => {
            // Add new notification to state
            setNotifications(prev => [newNotif, ...prev].slice(0, 20));

            // Increment unread count
            setUnreadCount(prev => prev + 1);

            // Optional: browser notification or sound
            if (Notification.permission === 'granted') {
                new Notification(newNotif.title, { body: newNotif.message });
            }
        });

        channel.bind("message:new", (data: any) => {
            const { conversationId, message } = data;

            // 1. Suppression Logic: If we are in the chat box for this conversation, don't show toast
            const activeConvId = pathname.split('/').pop();
            const isInThisChat = pathname.includes('/messages/') && activeConvId === conversationId;

            if (isInThisChat) return;

            // 2. Show In-App Toast
            const senderName = message.sender?.firstName || "Someone";
            toast(senderName, {
                description: message.content || "Sent an attachment",
                action: {
                    label: "Reply",
                    onClick: () => router.push(`/dashboard/messages/${conversationId}`)
                }
            });
        });

        channel.bind("pusher:subscription_error", (err: any) => {
            console.error(`❌ Subscription error for user-${userId}:`, err);
            setUseFallback(true);
        });


        return () => {
            clearInterval(connectionCheck);
            channel.unbind("notification:new");
            channel.unbind("message:new");
            channel.unbind("pusher:subscription_error");
        };
    }, [userId]);

    // 3. Fallback Polling (activates when Pusher fails)
    useEffect(() => {

        const pollNotifications = async () => {
            try {
                if (!userId) return;
                const data = await getUserNotifications(userId);
                setNotifications(data);
                setUnreadCount(data.filter((n: any) => !n.read).length);
            } catch (error) {
                console.error('Polling error:', error);
            }
        };

        // Poll every 30 seconds when using fallback
        const pollInterval = setInterval(pollNotifications, 30000);
        pollNotifications(); // Initial poll

        return () => clearInterval(pollInterval);
    }, [userId, useFallback]);

    const handleRead = async (id: string, link?: string) => {
        if (!userId) return;

        // Optimistic update
        setNotifications((prev) =>
            prev.map(n => n.id === id || n._id === id ? { ...n, read: true } : n)
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        await markNotificationAsRead(id, userId);

        if (link) {
            router.push(link);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className="relative">
                    <Button variant="ghost" size="icon">
                        <Bell className="h-5 w-5 text-muted-foreground" />
                    </Button>
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 h-4 w-4 bg-red-600 rounded-full text-[10px] flex items-center justify-center text-white animate-pulse">
                            {unreadCount}
                        </span>
                    )}
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end" onCloseAutoFocus={() => setUnreadCount(0)}>
                <DropdownMenuLabel className="flex justify-between items-center">
                    Notifications
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && <Badge variant="secondary">{unreadCount} new</Badge>}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2 hover:text-primary"
                            onClick={async (e) => {
                                e.stopPropagation();
                                if (userId) {
                                    await markAllNotificationsAsRead(userId);
                                    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                                    setUnreadCount(0);
                                }
                            }}
                        >
                            Mark all read
                        </Button>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No notifications
                        </div>
                    ) : (
                        notifications.map((notif: any) => (
                            <DropdownMenuItem
                                key={notif._id || notif.id}
                                className={`flex flex-col items-start p-3 cursor-pointer ${!notif.read ? 'bg-muted/50' : ''}`}
                                onClick={() => handleRead(notif._id || notif.id, notif.link)}
                            >
                                <div className="flex w-full justify-between gap-2">
                                    <div className="flex flex-col gap-0.5">
                                        <span className={`text-sm ${!notif.read ? 'font-semibold' : 'text-muted-foreground'}`}>
                                            {notif.title}
                                        </span>
                                        <span className="text-xs text-muted-foreground line-clamp-2">
                                            {notif.message}
                                        </span>
                                    </div>
                                    {!notif.read && <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1" />}
                                </div>
                                <span className="text-[10px] text-muted-foreground mt-1 self-end">
                                    {new Date(notif.createdAt).toLocaleTimeString()}
                                </span>
                            </DropdownMenuItem>
                        ))
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
