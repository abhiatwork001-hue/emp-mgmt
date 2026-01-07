"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { pusherClient } from "@/lib/pusher";

/**
 * Hook to listen for real-time coverage updates and refresh the page data
 * Similar to how the notification bell handles real-time updates
 */
export function useCoverageRealtime(userId?: string) {
    const router = useRouter();

    useEffect(() => {
        if (!userId) return;

        const channel = pusherClient.subscribe(`user-${userId}`);

        // Listen for coverage-related events
        const handleCoverageUpdate = (data: any) => {
            console.log('Coverage update received:', data);
            // Refresh the current page data
            router.refresh();
        };

        // Bind all coverage events
        channel.bind('coverage:updated', handleCoverageUpdate);
        channel.bind('coverage:accepted', handleCoverageUpdate);
        channel.bind('coverage:declined', handleCoverageUpdate);
        channel.bind('coverage:invited', handleCoverageUpdate);
        channel.bind('coverage:finalized', handleCoverageUpdate);
        channel.bind('coverage:cancelled', handleCoverageUpdate);

        return () => {
            channel.unbind('coverage:updated', handleCoverageUpdate);
            channel.unbind('coverage:accepted', handleCoverageUpdate);
            channel.unbind('coverage:declined', handleCoverageUpdate);
            channel.unbind('coverage:invited', handleCoverageUpdate);
            channel.unbind('coverage:finalized', handleCoverageUpdate);
            channel.unbind('coverage:cancelled', handleCoverageUpdate);
            pusherClient.unsubscribe(`user-${userId}`);
        };
    }, [userId, router]);
}
