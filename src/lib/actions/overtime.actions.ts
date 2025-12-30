"use server";

import connectToDB from "@/lib/db";
import { OvertimeRequest, Employee, Notification, Schedule } from "@/lib/models";
import { revalidatePath } from "next/cache";

function addHoursToTime(time: string, hoursToAdd: number): string {
    const [h, m] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m, 0, 0);
    date.setMinutes(date.getMinutes() + (hoursToAdd * 60));
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export async function createOvertimeRequest(data: {
    employeeId: string;
    scheduleId: string;
    dayDate: string;
    shiftId: string;
    shiftDetails: {
        startTime: string;
        endTime: string;
        shiftName: string;
    };
    hoursRequested: number;
    reason: string;
}) {
    try {
        await connectToDB();

        // Validation: Cannot request for future
        const today = new Date();
        const requestDate = new Date(data.dayDate); // UTC midnight usually if from date input

        // Normalize strict date comparison (ignoring time for "future day" check)
        const todayMid = new Date(today); todayMid.setHours(0, 0, 0, 0);
        const requestMid = new Date(requestDate); requestMid.setHours(0, 0, 0, 0);

        if (requestMid > todayMid) {
            return { success: false, error: "Cannot request overtime for future dates." };
        }

        // Validation: If today, shift must be over
        if (requestMid.getTime() === todayMid.getTime()) {
            const [endStats, endModifier] = data.shiftDetails.endTime.split(' '); // Handle "5:00 PM" if 12h, or "17:00" if 24h. 
            // Assuming 24h format based on previous files "startTime": "09:00"
            // If it is 24h format "09:00"
            const [h, m] = data.shiftDetails.endTime.split(':').map(Number);

            const shiftEnd = new Date(today);
            shiftEnd.setHours(h, m, 0, 0);

            if (today < shiftEnd) {
                return { success: false, error: "Cannot request overtime until your shift has ended." };
            }
        }

        const request = await OvertimeRequest.create({
            ...data,
            dayDate: new Date(data.dayDate),
            status: 'pending'
        });

        // Notify Store Manager or Admin (In real app, find relevant manager)
        // For now, no notification to specific manager logic implement, just skipping notification for now or creating generic one

        revalidatePath("/dashboard");
        return { success: true, request: JSON.parse(JSON.stringify(request)) };
    } catch (error) {
        console.error("Error creating overtime request:", error);
        return { success: false, error: "Failed to create request" };
    }
}

export async function getOvertimeRequests(filter: { employeeId?: string; storeId?: string; status?: string }) {
    try {
        await connectToDB();

        let query: any = {};
        if (filter.employeeId) query.employeeId = filter.employeeId;
        if (filter.status) query.status = filter.status;

        // If filtering by store, we would need to join with Employee or Schedule. 
        // For MVP, if employeeId is passed, we get their requests.
        // If manager gets all, we might need a separate query logic or aggregation.

        const requests = await OvertimeRequest.find(query)
            .populate('employeeId', 'firstName lastName')
            .sort({ createdAt: -1 });

        return JSON.parse(JSON.stringify(requests));
    } catch (error) {
        console.error("Error fetching overtime requests:", error);
        return [];
    }
}

export async function respondToOvertimeRequest(requestId: string, reviewerId: string, action: 'approved' | 'rejected', rejectionReason?: string) {
    try {
        await connectToDB();

        const request = await OvertimeRequest.findById(requestId);
        if (!request) return { success: false, error: "Request not found" };

        request.status = action;
        request.reviewedBy = reviewerId;
        request.reviewedAt = new Date();
        if (rejectionReason) request.rejectionReason = rejectionReason;

        await request.save();

        // If Approved, Add to Schedule
        if (action === 'approved') {
            const schedule = await Schedule.findById(request.scheduleId);
            if (schedule) {
                const requestDate = new Date(request.dayDate);
                const dayIndex = schedule.days.findIndex((d: any) =>
                    new Date(d.date).toDateString() === requestDate.toDateString()
                );

                if (dayIndex !== -1) {
                    const newEndTime = addHoursToTime(request.shiftDetails.endTime, request.hoursRequested);

                    schedule.days[dayIndex].shifts.push({
                        shiftName: "Overtime",
                        startTime: request.shiftDetails.endTime,
                        endTime: newEndTime,
                        breakMinutes: 0,
                        color: "#f97316", // Orange-500
                        employees: [request.employeeId],
                        isOvertime: true,
                    });
                    await schedule.save();
                }
            }
        }

        // Notify Employee
        await Notification.create({
            title: `Overtime Request ${action === 'approved' ? 'Approved' : 'Rejected'}`,
            message: `Your request for ${request.hoursRequested}h overtime on ${new Date(request.dayDate).toLocaleDateString()} has been ${action}.`,
            type: action === 'approved' ? 'success' : 'warning',
            category: "schedule",
            recipients: [{ userId: request.employeeId, read: false }],
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error responding to overtime request:", error);
        return { success: false, error: "Failed to process request" };
    }
}

export async function getPendingOvertimeRequests(filters: any = {}) {
    try {
        await connectToDB();

        const query: any = { status: 'pending' };

        if (filters.storeId) {
            // Find employees in that store
            const employeesInStore = await Employee.find({ storeId: filters.storeId }).select("_id");
            const empIds = employeesInStore.map(e => e._id);
            query.employeeId = { $in: empIds };
        }

        // Fetch pending
        const requests = await OvertimeRequest.find(query)
            .populate({
                path: 'employeeId',
                select: 'firstName lastName storeId',
                populate: { path: 'storeId', select: 'name' }
            })
            .sort({ createdAt: 1 }); // Oldest first

        return JSON.parse(JSON.stringify(requests));
    } catch (e) {
        console.error("Error fetching pending overtime:", e);
        return [];
    }
}
