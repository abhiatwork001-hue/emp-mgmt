"use server";

import connectToDB from "@/lib/db";
import { Schedule, ShiftSwapRequest, Employee, Notification } from "@/lib/models";
import { revalidatePath } from "next/cache";

// Fetch shifts for the current user (e.g. upcoming 2 weeks) to offer in a swap
export async function getEmployeeUpcomingShifts(userId: string) {
    try {
        await connectToDB();

        // Use string-based date comparison to avoid timezone/midnight mismatches
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const todayStr = startOfToday.toISOString().split('T')[0];

        // Query buffer: Look back 2 days just to be safe with timezone diffs on "endDate"
        const queryBuffer = new Date(startOfToday);
        queryBuffer.setDate(queryBuffer.getDate() - 2);

        // Find schedules that might contain today's or future shifts
        const schedules = await Schedule.find({
            "dateRange.endDate": { $gte: queryBuffer },
            status: "published"
        }).lean();

        const myShifts: any[] = [];

        schedules.forEach((schedule: any) => {
            schedule.days.forEach((day: any) => {
                const dayDateStr = new Date(day.date).toISOString().split('T')[0];

                // Compare Strings: "2023-12-23" >= "2023-12-23"
                if (dayDateStr >= todayStr) {
                    day.shifts.forEach((shift: any) => {
                        // Check if user is assigned
                        const assigned = shift.employees.some((e: any) => e.toString() === userId || e._id?.toString() === userId);
                        if (assigned) {
                            myShifts.push({
                                scheduleId: schedule._id,
                                dayDate: day.date,
                                shiftId: shift._id,
                                shiftName: shift.shiftName,
                                startTime: shift.startTime,
                                endTime: shift.endTime,
                                dateStr: new Date(day.date).toLocaleDateString(),
                                storeId: schedule.storeId // Include storeId for filtering
                            });
                        }
                    });
                }
            });
        });

        return JSON.parse(JSON.stringify(myShifts));
    } catch (error) {
        console.error("Error fetching employee shifts:", error);
        return [];
    }
}

export async function createSwapRequest(data: {
    requestorId: string;
    targetUserId: string;
    requestorShift: any;
    targetShift: any;
}) {
    try {
        await connectToDB();

        // 1. Validate shifts exist and users are still assigned
        // (Simplified for MVP: Assumption is UI provides valid data, but robust app would double check DB)

        const newRequest = await ShiftSwapRequest.create({
            requestorId: data.requestorId,
            targetUserId: data.targetUserId,
            requestorShift: data.requestorShift,
            targetShift: data.targetShift,
            status: 'pending'
        });

        // 2. Notify Target User
        // Need to find target user name
        const requestor = await Employee.findById(data.requestorId).select('firstName lastName');

        await Notification.create({
            title: "Shift Swap Request",
            message: `${requestor.firstName} ${requestor.lastName} wants to swap shifts with you!`,
            type: "info",
            category: "schedule",
            recipients: [{ userId: data.targetUserId, read: false }],
            link: "/dashboard",
            relatedEmployeeId: data.requestorId,
            metadata: { requestId: newRequest._id }
        });

        revalidatePath("/dashboard");
        return { success: true, request: JSON.parse(JSON.stringify(newRequest)) };

    } catch (error) {
        console.error("Error creating swap request:", error);
        return { success: false, error: "Failed to create request" };
    }
}

export async function getSwapRequests(userId: string) {
    try {
        await connectToDB();

        // Helper to check expiration
        const checkExpiration = async (req: any) => {
            if (req.status !== 'pending') return false;

            const now = new Date();

            // Check Requestor Shift
            const reqDate = new Date(req.requestorShift.dayDate);
            const [rH, rM] = req.requestorShift.startTime.split(':').map(Number);
            reqDate.setHours(rH, rM, 0, 0);

            // Check Target Shift
            const targetDate = new Date(req.targetShift.dayDate);
            const [tH, tM] = req.targetShift.startTime.split(':').map(Number);
            targetDate.setHours(tH, tM, 0, 0);

            if (now > reqDate || now > targetDate) {
                req.status = 'expired';
                await req.save();
                return true; // Expired
            }
            return false; // Active
        };

        // Incoming requests (I am target)
        // We fetch ALL pending to check expiration, not just finding clean ones, 
        // because we want to trigger the status update.
        // Actually, efficiently: find pending where target OR requestor is user.
        const allRelatedPending = await ShiftSwapRequest.find({
            $or: [{ targetUserId: userId }, { requestorId: userId }],
            status: 'pending'
        }).populate('requestorId', 'firstName lastName image')
            .populate('targetUserId', 'firstName lastName image');

        // Process expiration
        const activeRequests = [];
        for (const req of allRelatedPending) {
            const isExpired = await checkExpiration(req);
            if (!isExpired) {
                activeRequests.push(req);
            }
        }

        // Split into Incoming / Outgoing
        const incoming = activeRequests
            .filter(r => r.targetUserId._id.toString() === userId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const outgoing = activeRequests
            .filter(r => r.requestorId._id.toString() === userId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return {
            incoming: JSON.parse(JSON.stringify(incoming)),
            outgoing: JSON.parse(JSON.stringify(outgoing))
        };
    } catch (error) {
        console.error("Error fetching swap requests:", error);
        return { incoming: [], outgoing: [] };
    }
}

export async function respondToSwapRequest(requestId: string, action: 'approved' | 'rejected') {
    try {
        await connectToDB();

        const request = await ShiftSwapRequest.findById(requestId);
        if (!request) return { success: false, error: "Request not found" };
        if (request.status !== 'pending') return { success: false, error: "Request already handled" };

        if (action === 'rejected') {
            request.status = 'rejected';
            await request.save();
            // Notify Requestor
            await Notification.create({
                title: "Swap Request Rejected",
                message: "Your shift swap request was rejected.",
                type: "warning",
                recipients: [{ userId: request.requestorId, read: false }],
            });

            revalidatePath("/dashboard");
            return { success: true };
        }

        // Action is APPROVED: Execute Swap
        // We need to update TWO schedules (could be same or different)

        // 1. Update Requestor's Shift: Remove Requestor, Add Target
        // We use $pull and $addToSet or specialized logic since it's nested deep arrays

        // Find Schedule 1
        const schedule1 = await Schedule.findById(request.requestorShift.scheduleId);
        if (!schedule1) throw new Error("Schedule 1 not found");

        let found1 = false;
        // Locate shift
        for (const d of schedule1.days) {
            // Compare dates loosely or exact? Dates in DB are Date objects.
            // d.date is Date. requestorShift.dayDate is string/Date.
            if (new Date(d.date).toISOString().split('T')[0] === new Date(request.requestorShift.dayDate).toISOString().split('T')[0]) {
                const s = d.shifts.id(request.requestorShift.shiftId);
                if (s) {
                    // Perform swap in memory
                    // Remove requestorId
                    s.employees = s.employees.filter((id: any) => id.toString() !== request.requestorId.toString());
                    // Add targetUserId
                    if (!s.employees.some((id: any) => id.toString() === request.targetUserId.toString())) {
                        s.employees.push(request.targetUserId);
                    }
                    found1 = true;
                }
            }
        }

        if (found1) await schedule1.save();
        else throw new Error("Requestor shift not found in schedule");


        // 2. Update Target's Shift: Remove Target, Add Requestor
        const schedule2 = await Schedule.findById(request.targetShift.scheduleId); // Could be same doc instance if same schedule, but safe to fetch
        if (!schedule2) throw new Error("Schedule 2 not found");

        let found2 = false;
        for (const d of schedule2.days) {
            if (new Date(d.date).toISOString().split('T')[0] === new Date(request.targetShift.dayDate).toISOString().split('T')[0]) {
                const s = d.shifts.id(request.targetShift.shiftId);
                if (s) {
                    s.employees = s.employees.filter((id: any) => id.toString() !== request.targetUserId.toString());
                    if (!s.employees.some((id: any) => id.toString() === request.requestorId.toString())) {
                        s.employees.push(request.requestorId);
                    }
                    found2 = true;
                }
            }
        }

        if (found2) await schedule2.save();
        else throw new Error("Target shift not found in schedule");

        // 3. Update Request Status
        request.status = 'approved';
        await request.save();

        // 4. Notify Requestor
        await Notification.create({
            title: "Swap Request Approved!",
            message: "Your shift swap request was approved and the schedule has been updated.",
            type: "success",
            category: "schedule",
            recipients: [{ userId: request.requestorId, read: false }],
            link: "/dashboard/schedules/" + request.requestorShift.scheduleId
        });

        revalidatePath("/dashboard");
        revalidatePath(`/dashboard/schedules/${request.requestorShift.scheduleId}`);
        revalidatePath(`/dashboard/schedules/${request.targetShift.scheduleId}`);

        return { success: true };

    } catch (error) {
        console.error("Error responding to swap request:", error);
        return { success: false, error: "Failed to process swap" };
    }
}
