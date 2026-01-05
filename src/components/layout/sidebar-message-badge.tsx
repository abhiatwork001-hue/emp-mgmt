"use client";

import { useEffect, useState } from "react";
import { pusherClient } from "@/lib/pusher";
import { getUnreadMessageCount } from "@/lib/actions/message.actions";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface SidebarMessageBadgeProps {
    userId?: string;
    collapsed?: boolean;
}

export function SidebarMessageBadge({ userId, collapsed }: SidebarMessageBadgeProps) {
    const [unreadCount, setUnreadCount] = useState(0);
    const pathname = usePathname();
    const isMessagesPage = pathname?.includes("/dashboard/messages");

    useEffect(() => {
        if (!userId) return;

        // Initial fetch
        const fetchCount = async () => {
            const count = await getUnreadMessageCount(userId);
            setUnreadCount(count);
        };
        fetchCount();

        // Subscribe to real-time updates
        const channel = pusherClient.subscribe(`user-${userId}`);

        const handleNewMessage = () => {
            // If we are already on the messages page, we might ideally assume it's read or will be read soon.
            // But strictly speaking, until we open that specific chat, it is unread.
            // For simplicity, we just increment. The specific chat view should decrement/mark read.
            // OR: we just re-fetch the count to be safe and accurate.
            fetchCount();
        };

        const handleBind = () => {
            // Re-fetch on connect just in case
            fetchCount();
        };

        channel.bind("message:new", handleNewMessage);
        channel.bind("pusher:subscription_succeeded", handleBind);

        return () => {
            channel.unbind("message:new", handleNewMessage);
            channel.unbind("pusher:subscription_succeeded", handleBind);
            pusherClient.unsubscribe(`user-${userId}`);
        };
    }, [userId]);

    // If on messages page, we might want to refresh count more often or listen to "read" events
    // For now, let's just stick to the basic "new message" trigger
    // Also, if we navigate TO messages page, we might want to re-check
    useEffect(() => {
        if (userId) {
            getUnreadMessageCount(userId).then(setUnreadCount);
        }
    }, [pathname, userId]);


    if (unreadCount === 0) return null;

    return (
        <div
            className={cn(
                "flex items-center justify-center rounded-full bg-red-500 text-white font-bold animate-in zoom-in-50 duration-300",
                collapsed ? "absolute -top-1 -right-1 h-4 w-4 text-[9px] ring-2 ring-background border border-background shadow-sm" : "ml-auto px-1.5 h-5 min-w-[20px] text-[10px]"
            )}
        >
            {unreadCount > 99 ? "99+" : unreadCount}
        </div>
    );
}
