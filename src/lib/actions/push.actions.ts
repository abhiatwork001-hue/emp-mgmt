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
    const employee = await Employee.findById(userId).select('pushSubscription');

    if (!employee?.pushSubscription) return { success: false, error: "No subscription found" };

    try {
        await webpush.sendNotification(
            employee.pushSubscription,
            JSON.stringify(payload)
        );
        return { success: true };
    } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
            // Subscription expired or no longer valid
            await Employee.findByIdAndUpdate(userId, { $unset: { pushSubscription: 1 } });
        }
        return { success: false, error: error.message };
    }
}
