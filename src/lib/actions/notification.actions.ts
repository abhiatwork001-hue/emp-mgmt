"use server";

import dbConnect from "@/lib/db";
import { Notification } from "@/lib/models";
import { pusherServer } from "@/lib/pusher";
import { sendPushNotification } from "./push.actions";

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

        // 2. Trigger Pusher Events with retry logic
        const triggerPromises = data.recipients.map(async (userId) => {
            let retries = 3;
            let lastError;

            while (retries > 0) {
                try {
                    // Real-time (Pusher)
                    await pusherServer.trigger(`user-${userId}`, "notification:new", {
                        ...plainNotification,
                        read: false // Add read status for this specific user
                    });

                    // Background (Web Push)
                    await sendPushNotification(userId, {
                        title: data.title,
                        body: data.message,
                        url: data.link || "/dashboard"
                    });

                    return; // Success, exit retry loop
                } catch (error) {
                    lastError = error;
                    retries--;
                    console.error(`Pusher trigger failed for user ${userId}, retries left: ${retries}`, error);

                    if (retries > 0) {
                        // Wait before retry (exponential backoff)
                        await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
                    }
                }
            }

            // If all retries failed, log but don't throw (notification is still in DB)
            if (lastError) {
                console.error(`Failed to send real-time notification to user ${userId} after 3 retries:`, lastError);
            }
        });

        await Promise.allSettled(triggerPromises); // Use allSettled to not fail if some triggers fail

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

import { getAllEmployees } from "./employee.actions";

export async function sendTestBroadcast(message: string) {
    // 1. Get all active employees
    const employees = await getAllEmployees();
    const recipientIds = employees.map((e: any) => e._id);

    if (recipientIds.length === 0) return { success: false, error: "No employees found" };

    // 2. Trigger Notification
    return await triggerNotification({
        title: "System Test",
        message: message,
        type: "info",
        category: "system",
        recipients: recipientIds,
        link: "/dashboard"
    });
}
