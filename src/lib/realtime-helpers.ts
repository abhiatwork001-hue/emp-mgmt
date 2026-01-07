/**
 * Helper utility for triggering real-time updates via Pusher
 * Use this to easily add real-time notifications to any action
 */

import { pusherServer } from "@/lib/pusher";

export async function triggerRealtimeUpdate(
    event: string,
    data: Record<string, any>,
    userIds?: string[]
) {
    try {
        // If specific users provided, notify them individually
        if (userIds && userIds.length > 0) {
            await Promise.all(
                userIds.map(userId =>
                    pusherServer.trigger(`user-${userId}`, event, data)
                )
            );
        }

        // Also trigger admin/global channel for monitoring
        await pusherServer.trigger('admin-updates', event, data);
    } catch (error) {
        console.error('Failed to trigger realtime update:', error);
    }
}

// Schedule-specific helper
export async function notifyScheduleUpdate(scheduleId: string, status: string, employeeIds: string[]) {
    await triggerRealtimeUpdate(`schedule:${status}`, { scheduleId, status }, employeeIds);
}

// Task-specific helper
export async function notifyTaskUpdate(taskId: string, action: string, userIds: string[]) {
    await triggerRealtimeUpdate(`task:${action}`, { taskId, action }, userIds);
}

// Employee-specific helper
export async function notifyEmployeeUpdate(employeeId: string, action: string) {
    await triggerRealtimeUpdate(`employee:${action}`, { employeeId, action }, [employeeId]);
}

// Notice-specific helper
export async function notifyNoticeCreated(noticeId: string, recipientIds: string[]) {
    await triggerRealtimeUpdate('notice:created', { noticeId }, recipientIds);
}
