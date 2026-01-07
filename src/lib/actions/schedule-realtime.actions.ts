/**
 * Schedule Real-time Wrapper
 * Import and use these wrapped functions instead of the originals for real-time updates
 */

import { pusherServer } from "@/lib/pusher";
import * as scheduleActions from "./schedule.actions";

/**
 * Wrapped updateScheduleStatus with real-time trigger
 */
export async function updateScheduleStatusRealtime(
    id: string,
    status: string,
    userId: string,
    comment?: string,
    notify: boolean = true
) {
    // Call original function
    const result = await scheduleActions.updateScheduleStatus(id, status, userId, comment, notify);

    // Add real-time trigger
    await pusherServer.trigger(`schedule-${id}`, `schedule:${status}`, {
        scheduleId: id,
        status
    });

    return result;
}

/**
 * Wrapped updateSchedule with real-time trigger
 */
export async function updateScheduleRealtime(id: string, data: any) {
    // Call original function
    const result = await scheduleActions.updateSchedule(id, data);

    // Add real-time trigger
    await pusherServer.trigger(`schedule-${id}`, "schedule:updated", {
        scheduleId: id
    });

    return result;
}

// Re-export all other functions as-is
export * from "./schedule.actions";
