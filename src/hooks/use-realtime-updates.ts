"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { pusherClient } from "@/lib/pusher";

/**
 * Universal hook to listen for all real-time updates across the application
 * Automatically refreshes page data when any relevant event occurs
 */
export function useRealtimeUpdates(userId?: string) {
    const router = useRouter();

    useEffect(() => {
        if (!userId) return;

        const channel = pusherClient.subscribe(`user-${userId}`);

        // Universal handler that refreshes the page for any update
        const handleUpdate = (data: any) => {
            console.log('Real-time update received:', data);
            router.refresh();
        };

        // Coverage events (already implemented)
        channel.bind('coverage:updated', handleUpdate);
        channel.bind('coverage:accepted', handleUpdate);
        channel.bind('coverage:declined', handleUpdate);
        channel.bind('coverage:invited', handleUpdate);
        channel.bind('coverage:finalized', handleUpdate);
        channel.bind('coverage:cancelled', handleUpdate);

        // Vacation events
        channel.bind('vacation:created', handleUpdate);
        channel.bind('vacation:approved', handleUpdate);
        channel.bind('vacation:rejected', handleUpdate);
        channel.bind('vacation:cancelled', handleUpdate);

        // Absence events
        channel.bind('absence:created', handleUpdate);
        channel.bind('absence:approved', handleUpdate);
        channel.bind('absence:rejected', handleUpdate);

        // Schedule events
        channel.bind('schedule:published', handleUpdate);
        channel.bind('schedule:approved', handleUpdate);
        channel.bind('schedule:rejected', handleUpdate);
        channel.bind('schedule:updated', handleUpdate);

        // Task events
        channel.bind('task:created', handleUpdate);
        channel.bind('task:updated', handleUpdate);
        channel.bind('task:comment_added', handleUpdate);
        channel.bind('task:assigned', handleUpdate);
        channel.bind('task:completed', handleUpdate);

        // Overtime events
        channel.bind('overtime:created', handleUpdate);
        channel.bind('overtime:approved', handleUpdate);
        channel.bind('overtime:rejected', handleUpdate);

        // Employee/Position events
        channel.bind('employee:updated', handleUpdate);
        channel.bind('employee:position_changed', handleUpdate);
        channel.bind('employee:promoted', handleUpdate);

        // Notice/Announcement events
        channel.bind('notice:created', handleUpdate);
        channel.bind('notice:updated', handleUpdate);
        channel.bind('announcement:created', handleUpdate);

        return () => {
            // Unbind all events
            channel.unbind_all();
            pusherClient.unsubscribe(`user-${userId}`);
        };
    }, [userId, router]);
}
