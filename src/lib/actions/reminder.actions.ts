"use server";

import connectToDB from "@/lib/db";
import { Reminder, Employee } from "@/lib/models";
import { pusherServer } from "../pusher";
import { revalidatePath } from "next/cache";

export async function createReminder(data: {
    title: string;
    description: string;
    type: string;
    priority: string;
    dueDate: string;
    targetRoles: string[];
    createdBy: string;
}) {
    try {
        await connectToDB();

        const reminder = await Reminder.create({
            ...data,
            dueDate: new Date(data.dueDate),
            isReadBy: []
        });

        revalidatePath("/dashboard");

        await pusherServer.trigger("global", "reminder:updated", {
            reminderId: reminder._id,
            status: 'created'
        });

        return { success: true, reminder: JSON.parse(JSON.stringify(reminder)) };
    } catch (error) {
        console.error("Error creating reminder:", error);
        return { success: false, error: "Failed to create reminder" };
    }
}

export async function getRemindersForUser(userId: string) {
    try {
        await connectToDB();

        const user = await Employee.findById(userId);
        if (!user) return [];

        // Find reminders that:
        // 1. Have NOT been read by this user
        // 2. Are targeting this user's role OR have no target roles (global)
        // 3. DueDate is in future or recent past (optional filter)

        const reminders = await Reminder.find({
            "isReadBy.userId": { $ne: userId }, // Not read by user
            $or: [
                { targetRoles: { $in: [user.role] } }, // Targeted role
                { targetRoles: { $size: 0 } }, // Or global (empty array)
                // Add department logic here if needed: { targetDepartments: user.storeDepartmentId }
            ]
        }).sort({ dueDate: 1 });

        return JSON.parse(JSON.stringify(reminders));
    } catch (error) {
        console.error("Error fetching reminders:", error);
        return [];
    }
}

export async function markReminderRead(reminderId: string, userId: string) {
    try {
        await connectToDB();
        await Reminder.findByIdAndUpdate(reminderId, {
            $addToSet: { isReadBy: { userId: userId, readAt: new Date() } }
        });
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}
