"use server";

import webpush from 'web-push';
import dbConnect from "@/lib/db";
import { Employee } from "@/lib/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Initialize web-push
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BMbpuQjO2CrTywrJlhVQF2ysCbkkNQ5Fyc56dEUmerRY3ROeBxflwXRtWYMzuB8budHdvoaJeXF1dsXN5tvGasQ';
const privateKey = process.env.VAPID_PRIVATE_KEY || 'MhCeFyPlzCtNReUuT4XHuhB8SC1XRj8qkIjbzQ5zcSY';

webpush.setVapidDetails(
    'mailto:admin@chick.com',
    publicKey,
    privateKey
);

export async function saveSubscription(subscription: any) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    await dbConnect();
    await Employee.findByIdAndUpdate((session.user as any).id, {
        pushSubscription: subscription
    });

    return { success: true };
}

export async function sendPushNotification(userId: string, payload: { title: string; body: string; url?: string }) {
    await dbConnect();
    const employee = await Employee.findById(userId).select('pushSubscription pushSubscriptionNative email');

    const results = { web: false, native: false, errors: [] as string[] };

    // 1. Web Push
    if (employee?.pushSubscription) {
        try {
            await webpush.sendNotification(
                employee.pushSubscription,
                JSON.stringify(payload)
            );
            results.web = true;
        } catch (error: any) {
            if (error.statusCode === 410 || error.statusCode === 404) {
                await Employee.findByIdAndUpdate(userId, { $unset: { pushSubscription: 1 } });
            }
            results.errors.push(`Web: ${error.message}`);
        }
    }

    // 2. Native Push (FCM)
    if (employee?.pushSubscriptionNative && employee.pushSubscriptionNative.length > 0) {
        try {
            const { firebaseAdmin } = await import("@/lib/firebase-admin");

            console.log(`[PushAction] Sending FCM to user ${employee.email} (${userId}) - Tokens: ${employee.pushSubscriptionNative.length}`);

            const response = await firebaseAdmin.messaging().sendEachForMulticast({
                tokens: employee.pushSubscriptionNative,
                notification: {
                    title: payload.title,
                    body: payload.body,
                },
                data: {
                    url: payload.url || "/dashboard",
                    // Add extra data if needed for smart routing
                }
            });

            if (response.successCount > 0) results.native = true;

            if (response.failureCount > 0) {
                console.warn(`[PushAction] FCM partial failure: ${response.failureCount} failed out of ${response.responses.length}`);
                // Optional: Remove invalid tokens here if error code matches 'messaging/registration-token-not-registered'
                // But let's keep it simple for now to avoid accidental deletion
            }

        } catch (error: any) {
            console.error("[PushAction] FCM Error:", error);
            results.errors.push(`Native: ${error.message}`);
        }
    } else {
        console.log(`[PushAction] No native tokens for user ${userId}`);
    }

    return { success: results.web || results.native, details: results };
}
