"use server";

import dbConnect from "@/lib/db";
import { Notification, Employee, IEmployee } from "@/lib/models";
import { pusherServer } from "@/lib/pusher";
import { sendPushNotification } from "./push.actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllEmployees } from "./employee.actions";

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

        // Optimization: Create a lightweight payload for Pusher (exclude recipients list which can be huge)
        const { recipients, ...notificationForPusher } = plainNotification;

        // Fetch tokens for all recipients (Optimization)
        const recipientEmployees = await Employee.find({ _id: { $in: data.recipients } })
            .select('_id email pushSubscriptionNative') // added email for debug
            .lean();

        console.log(`[Notification] Found ${recipientEmployees.length} recipients for notification: ${data.title}`);

        const recipientTokenMap = new Map();
        recipientEmployees.forEach((emp: any) => {
            if (emp.pushSubscriptionNative && emp.pushSubscriptionNative.length > 0) {
                console.log(`[Notification] User ${emp.email} (${emp._id}) has ${emp.pushSubscriptionNative.length} native tokens:`, emp.pushSubscriptionNative);
                recipientTokenMap.set(emp._id.toString(), emp.pushSubscriptionNative);
            } else {
                console.log(`[Notification] User ${emp.email} (${emp._id}) has NO native tokens.`);
            }
        });

        // 2. Trigger Pusher & FCM with retry logic
        const triggerPromises = data.recipients.map(async (userId) => {
            let retries = 3;

            while (retries > 0) {
                try {
                    // Real-time (Pusher)
                    await pusherServer.trigger(`user-${userId}`, "notification:new", {
                        ...notificationForPusher,
                        read: false
                    });

                    // Background (Web Push)
                    await sendPushNotification(userId, {
                        title: data.title,
                        body: data.message,
                        url: data.link || "/dashboard"
                    });

                    // Native Push (FCM)
                    const tokens = recipientTokenMap.get(userId);
                    if (tokens && tokens.length > 0) {
                        const { firebaseAdmin } = await import("@/lib/firebase-admin");
                        console.log(`[Notification] Sending FCM to user ${userId} with ${tokens.length} tokens.`);

                        // We use sendEachForMulticast to handle multiple devices per user
                        const response = await firebaseAdmin.messaging().sendEachForMulticast({
                            tokens: tokens,
                            notification: {
                                title: data.title,
                                body: data.message,
                            },
                            data: {
                                url: data.link || "/dashboard",
                                type: data.type || "info",
                                notificationId: notification._id.toString()
                            }
                        });
                        console.log(`[Notification] FCM Response for user ${userId}: Success=${response.successCount}, Failure=${response.failureCount}`);
                        if (response.failureCount > 0) {
                            response.responses.forEach((resp, idx) => {
                                if (!resp.success) console.error(`[Notification] FCM Failure for token ${idx}:`, resp.error);
                            });
                        }
                    }

                    return; // Success
                } catch (error) {
                    console.error(`[Notification] Trigger failed for user ${userId}:`, error);
                    retries--;
                    if (retries > 0) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
                    }
                }
            }
        });

        await Promise.allSettled(triggerPromises); // Use allSettled to not fail if some triggers fail

        return { success: true, notification: plainNotification };
    } catch (error) {
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

export async function markAllNotificationsAsRead(userId: string) {
    await dbConnect();

    await Notification.updateMany(
        { "recipients.userId": userId },
        {
            $set: {
                "recipients.$[elem].read": true,
                "recipients.$[elem].readAt": new Date()
            }
        },
        {
            arrayFilters: [{ "elem.userId": userId, "elem.read": false }]
        }
    );

    return { success: true };
}

export async function sendTestBroadcast(message: string) {
    // 1. Get all active employees
    const { employees } = await getAllEmployees();
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

// --- Native Push Tokens ---

export async function saveNativePushToken(token: string) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const userId = (session.user as any).id;

    // Add token to set if not exists
    await Employee.findByIdAndUpdate(userId, {
        $addToSet: { pushSubscriptionNative: token }
    });

    return { success: true };
}

// Helper to remove invalid tokens if needed
export async function removeNativePushToken(token: string) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) return;
    const userId = (session.user as any).id;
    await Employee.findByIdAndUpdate(userId, {
        $pull: { pushSubscriptionNative: token }
    });
}
