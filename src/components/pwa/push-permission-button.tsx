"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { saveSubscription } from "@/lib/actions/push.actions";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BMbpuQjO2CrTywrJlhVQF2ysCbkkNQ5Fyc56dEUmerRY3ROeBxflwXRtWYMzuB8budHdvoaJeXF1dsXN5tvGasQ';

export function PushPermissionButton() {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [supported, setSupported] = useState(true);

    useEffect(() => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            setSupported(false);
            return;
        }

        navigator.serviceWorker.ready.then((registration) => {
            registration.pushManager.getSubscription().then((subscription) => {
                setIsSubscribed(!!subscription);
            });
        });
    }, []);

    async function urlBase64ToUint8Array(base64String: string) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    const subscribe = async () => {
        setLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: await urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            const result = await saveSubscription(JSON.parse(JSON.stringify(subscription)));
            if (result.success) {
                setIsSubscribed(true);
                toast.success("Notifications enabled!");
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            console.error("Subscription failed:", error);
            toast.error("Failed to enable notifications");
        } finally {
            setLoading(false);
        }
    };

    const unsubscribe = async () => {
        setLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                await saveSubscription(null);
                setIsSubscribed(false);
                toast.info("Notifications disabled");
            }
        } catch (error) {
            console.error("Unsubscription failed:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!supported) return null;

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={isSubscribed ? unsubscribe : subscribe}
            disabled={loading}
            className="rounded-xl bg-background/50 border border-border/40 backdrop-blur-md"
            title={isSubscribed ? "Disable Notifications" : "Enable Notifications"}
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSubscribed ? (
                <Bell className="h-4 w-4 text-primary fill-primary/20" />
            ) : (
                <BellOff className="h-4 w-4 text-muted-foreground" />
            )}
        </Button>
    );
}
