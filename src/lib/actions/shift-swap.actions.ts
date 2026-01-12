"use server";

import dbConnect from "../db";
import { pusherServer } from "../pusher";
import { Schedule, ShiftSwapRequest, Employee } from "../models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { triggerNotification } from "./notification.actions";

export async function getSwapRequests(userId?: string) {
    await dbConnect();
    const query: any = {};
    if (userId) {
        query.$or = [{ requestorId: userId }, { targetUserId: userId }];
    }

    const requests = await ShiftSwapRequest.find(query)
        .populate('requestorId', 'firstName lastName image')
        .populate('targetUserId', 'firstName lastName image')
        .sort({ createdAt: -1 })
        .lean();

    return JSON.parse(JSON.stringify(requests));
}

export async function getEmployeeUpcomingShifts(employeeId: string) {
    await dbConnect();

    // Get shifts for the next 30 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);

    const schedules = await Schedule.find({
        "dateRange.endDate": { $gte: today },
        "days.shifts.employees": employeeId,
        status: 'published'
    }).lean();

    const shifts: any[] = [];

    schedules.forEach((sch: any) => {
        sch.days.forEach((day: any) => {
            const dayDate = new Date(day.date);
            if (dayDate < today || dayDate > thirtyDaysLater) return;

            day.shifts.forEach((s: any) => {
                if (s.employees.some((id: any) => id.toString() === employeeId)) {
                    shifts.push({
                        scheduleId: sch._id.toString(),
                        storeId: sch.storeId.toString(),
                        dayDate: day.date,
                        dateStr: dayDate.toLocaleDateString(),
                        shiftId: s._id.toString(),
                        shiftName: s.shiftName,
                        startTime: s.startTime,
                        endTime: s.endTime
                    });
                }
            });
        });
    });

    return JSON.parse(JSON.stringify(shifts));
}

export async function createSwapRequest(data: {
    requestorId: string;
    targetUserId: string;
    requestorShift: any;
    targetShift: any;
}) {
    await dbConnect();

    // Logic: if shift is same time and same end time AND same day then say its same shift
    const reqDate = new Date(data.requestorShift.dayDate).toDateString();
    const targetDate = new Date(data.targetShift.dayDate).toDateString();

    if (data.requestorShift.startTime === data.targetShift.startTime &&
        data.requestorShift.endTime === data.targetShift.endTime &&
        reqDate === targetDate) {
        return { success: false, error: "Identical shifts cannot be swapped." };
    }

    // Check if requestor shift has already started
    const now = new Date();
    const reqShiftStart = new Date(data.requestorShift.dayDate);
    const [h, m] = data.requestorShift.startTime.split(':').map(Number);
    reqShiftStart.setHours(h, m, 0, 0);

    if (reqShiftStart <= now) {
        return { success: false, error: "Cannot swap a shift that has already started or passed." };
    }

    const request = await ShiftSwapRequest.create({
        requestorId: data.requestorId,
        targetUserId: data.targetUserId,
        requestorShift: data.requestorShift,
        targetShift: data.targetShift,
        status: 'pending'
    });

    // Notify Target User
    const sender = await Employee.findById(data.requestorId).select("firstName lastName");
    await triggerNotification({
        title: "Shift Swap Request",
        message: `${sender?.firstName} wants to swap a shift with you.`,
        type: "info",
        category: "schedule",
        recipients: [data.targetUserId],
        senderId: data.requestorId,
        link: "/dashboard/pending-actions"
    });

    await pusherServer.trigger(`user-${data.targetUserId}`, "swap:updated", {
        requestId: request._id,
        status: 'created'
    });

    return { success: true, request: JSON.parse(JSON.stringify(request)) };
}

export async function respondToSwapRequest(requestId: string, status: 'approved' | 'rejected', userId: string) {
    await dbConnect();

    const request = await ShiftSwapRequest.findById(requestId);
    if (!request) return { success: false, error: "Request not found" };

    if (request.targetUserId.toString() !== userId) {
        return { success: false, error: "Unauthorized" };
    }

    request.status = status;
    await request.save();

    if (status === 'approved') {
        // Perform the Swap in both Schedules
        // Note: they might be in the same schedule or different ones

        const performUpdate = async (shiftInfo: any, oldEmp: string, newEmp: string) => {
            const sch = await Schedule.findById(shiftInfo.scheduleId);
            if (!sch) return;

            const dayDateStr = new Date(shiftInfo.dayDate).toDateString();
            const day = sch.days.find((d: any) => new Date(d.date).toDateString() === dayDateStr);
            if (!day) return;

            const shift = day.shifts.id(shiftInfo.shiftId);
            if (!shift) return;

            // Remove old, add new
            shift.employees = shift.employees.filter((id: any) => id.toString() !== oldEmp);
            shift.employees.push(newEmp);

            await sch.save();
            revalidatePath(`/dashboard/schedules/${sch.slug}`);
        };

        // 1. Give requestor's shift to target user
        await performUpdate(request.requestorShift, request.requestorId.toString(), request.targetUserId.toString());

        // 2. Give target user's shift to requestor
        await performUpdate(request.targetShift, request.targetUserId.toString(), request.requestorId.toString());

        // Notify Store Channel for Real-time Update
        // We assume swap is valid only within same store usually, or we update both if different.
        const scheduleIds = [request.requestorShift.scheduleId, request.targetShift.scheduleId];
        const uniqueScheduleIds = [...new Set(scheduleIds.map((id: any) => id.toString()))];

        for (const sId of uniqueScheduleIds) {
            const sch = await Schedule.findById(sId).select('storeId');
            if (sch) {
                await pusherServer.trigger(`store-${sch.storeId}`, "schedule:updated", {
                    scheduleId: sId,
                    type: "swap_approved"
                });
            }
        }
    }

    // Notify Requestor
    const responder = await Employee.findById(userId).select("firstName lastName");
    await triggerNotification({
        title: `Swap Request ${status === 'approved' ? 'Accepted' : 'Rejected'}`,
        message: `${responder?.firstName} ${status} your shift swap request.`,
        type: status === 'approved' ? 'success' : 'warning',
        category: "schedule",
        recipients: [request.requestorId.toString()],
        senderId: userId,
        link: "/dashboard/pending-actions"
    });

    await pusherServer.trigger(`user-${request.requestorId}`, "swap:updated", {
        requestId,
        status
    });

    // Trigger update for both if approved
    if (status === 'approved') {
        await pusherServer.trigger(`user-${userId}`, "swap:updated", { requestId, status });
    }

    revalidatePath("/dashboard");
    return { success: true };
}
