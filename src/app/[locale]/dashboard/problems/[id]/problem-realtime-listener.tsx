"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { pusherClient } from "@/lib/pusher";

export function ProblemRealtimeListener({ problemId }: { problemId: string }) {
    const router = useRouter();

    useEffect(() => {
        const channel = pusherClient.subscribe(`problem-${problemId}`);

        const handleUpdate = (data: any) => {
            console.log("Problem update:", data);
            router.refresh();
        };

        channel.bind('comment:new', handleUpdate);
        channel.bind('problem:updated', handleUpdate);

        return () => {
            channel.unbind_all();
            pusherClient.unsubscribe(`problem-${problemId}`);
        };
    }, [problemId, router]);

    return null;
}
