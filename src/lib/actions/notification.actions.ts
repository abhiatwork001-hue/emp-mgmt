"use server";

import dbConnect from "@/lib/db";
import { Notification } from "@/lib/models";
import { pusherServer } from "@/lib/pusher";

interface NotificationTriggerData {
    title: string;
    message: string;
    type?: "info" | "success" | "warning" | "error";
    category?: "system" | "schedule" | "vacation" | "absence" | "announcement";
    recipients: string[]; // Array of Employee IDs
    link?: string;
    senderId?: string;
    relatedStoreId?: string;
    relatedDepartmentId?: string;
    metadata?: any;
}

export async function triggerNotification(data: NotificationTriggerData) {
    try {
        await dbConnect();

        // 1. Create Notification Document
        const notification = await Notification.create({
            title: data.title,
            message: data.message,
            type: data.type || "info",
            category: data.category || "system",
            link: data.link,
            senderId: data.senderId,

            // Map recipients to schema structure
            recipients: data.recipients.map(id => ({
                userId: id,
                read: false
            })),

            relatedStoreId: data.relatedStoreId,
            relatedDepartmentId: data.relatedDepartmentId,
            metadata: data.metadata
        });

        const plainNotification = JSON.parse(JSON.stringify(notification));

        // 2. Trigger Pusher Events (Fan-out)
        // We trigger an event for EACH recipient so they receive it on their private channel
        const triggerPromises = data.recipients.map(userId => {
            return pusherServer.trigger(`user-${userId}`, "notification:new", {
                ...plainNotification,
                // We format it for the frontend to look like a personal notification
                // The frontend expects { read: boolean } at the top level usually, 
                // but since we send the whole doc, the frontend selector will need to be smart 
                // OR we send a personalized payload.
                // Let's send the doc, and let frontend handle it.
            });
        });

        await Promise.all(triggerPromises);

        return { success: true, notification: plainNotification };
    } catch (error) {
        console.error("Notification Trigger Error:", error);
        return { success: false, error: "Failed to trigger notification" };
    }
}

export async function getUserNotifications(userId: string) {
    await dbConnect();
    // Find notifications where user is in recipients array
    const notifications = await Notification.find({ "recipients.userId": userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

    // Transform for frontend: Pull the specific user's read status to top level for convenience
    const transformed = notifications.map((n: any) => {
        const userRecipient = n.recipients.find((r: any) => r.userId.toString() === userId);
        return {
            ...n,
            read: userRecipient ? userRecipient.read : false,
            readAt: userRecipient ? userRecipient.readAt : null
        };
    });

    return JSON.parse(JSON.stringify(transformed));
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
    await dbConnect();

    await Notification.updateOne(
        { _id: notificationId, "recipients.userId": userId },
        {
            $set: {
                "recipients.$.read": true,
                "recipients.$.readAt": new Date()
            }
        }
    );

    return { success: true };
}
