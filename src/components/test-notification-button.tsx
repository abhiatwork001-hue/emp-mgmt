"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { BellRing } from "lucide-react";
import { triggerNotification } from "@/lib/actions/notification.actions";

export function TestNotificationButton() {
    const { data: session } = useSession();

    const handleTest = async () => {
        if (!session?.user) return;

        await triggerNotification({
            recipients: [(session.user as any).id],
            title: "Test Notification",
            message: `This is a test at ${new Date().toLocaleTimeString()}.`,
            type: "success",
            category: "system",
            link: "#"
        });

        alert("Sent! Check the bell icon.");
    };

    return (
        <Button onClick={handleTest} variant="secondary" className="bg-blue-600 text-white hover:bg-blue-700">
            <BellRing className="mr-2 h-4 w-4" /> Test Notify
        </Button>
    );
}
