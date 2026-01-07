"use client";

import { useEffect } from "react";
import { pusherClient } from "@/lib/pusher";
import { toast } from "sonner";
import { Bell, MessageSquare } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

interface RealtimeToasterProps {
    userId?: string;
}

export function RealtimeToaster({ userId }: RealtimeToasterProps) {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!userId) return;

        const channel = pusherClient.subscribe(`user-${userId}`);

        // Handle General Notifications
        channel.bind("notification:new", (data: any) => {
            toast(data.title || "New Notification", {
                description: data.message,
                icon: <Bell className="h-4 w-4 text-primary" />,
                action: data.link ? {
                    label: "View",
                    onClick: () => router.push(data.link)
                } : undefined,
            });
        });

        // Handle Messages (similar to NotificationBell but global)
        channel.bind("message:new", (data: any) => {
            const { conversationId, message } = data;
            const senderId = message.sender?._id || message.sender;

            // Don't show toast to the sender or if already in that chat
            if (senderId === userId) return;

            const match = pathname.match(/\/messages\/([a-f\d]{24})\/?$/i);
            const activeConvId = match ? match[1] : null;
            if (activeConvId === conversationId.toString()) return;

            const senderName = message.sender?.firstName || "Someone";
            toast(`Message from ${senderName}`, {
                description: message.content || "Sent an attachment",
                icon: <MessageSquare className="h-4 w-4 text-primary" />,
                action: {
                    label: "Reply",
                    onClick: () => router.push(`/dashboard/messages/${conversationId}`)
                }
            });
        });

        return () => {
            channel.unbind("notification:new");
            channel.unbind("message:new");
            pusherClient.unsubscribe(`user-${userId}`);
        };
    }, [userId, pathname, router]);

    return null; // This component logic only
}
