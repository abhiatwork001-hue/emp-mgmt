"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BellRing, Loader2 } from "lucide-react";
import { sendTestBroadcast } from "@/lib/actions/notification.actions";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TestNotificationButton() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("This is a test notification from the admin panel.");

    const handleSend = async () => {
        setLoading(true);
        try {
            const result = await sendTestBroadcast(message);
            if (result.success) {
                toast.success("Broadcast sent successfully");
                setOpen(false);
            } else {
                toast.error("Failed to send broadcast");
            }
        } catch (error) {
            toast.error("An error occurred");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-dashed border-primary/50 text-primary hover:bg-primary/10" title="Send Test Notification">
                    <BellRing className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Send Test Notification</DialogTitle>
                    <DialogDescription>
                        This will send a push notification to ALL active employees. Use this to verify mobile notifications.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="message">Message</Label>
                        <Input
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSend} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Broadcast
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
