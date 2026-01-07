"use server";
import { triggerNotification } from "@/lib/actions/notification.actions";
import {
    AbsenceRequest,
    AbsenceRecord,
    Employee
} from "@/lib/models";
import connectToDB from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logAction } from "./log.actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pusherServer } from "../pusher";

const dbConnect = connectToDB;

type AbsenceRequestData = {
    employeeId: string;
    date: Date;
    reason: string;
    type?: string;
    shiftId?: string;
}

export async function createAbsenceRequest(data: AbsenceRequestData) {
    await dbConnect();

    // Auto-approve logic could go here if configured (e.g. sick days auto-approved)
    // For now, all are pending.

    const newRequest = await AbsenceRequest.create({
        ...data,
        status: 'pending',
        createdAt: new Date()
    });

    // Notification: Notify HR & Owners
    try {
        const hrAndOwners = await Employee.find({
            roles: { $in: ['HR', 'Owner', 'hr', 'owner', 'Admin', 'admin'] },
            active: true
        }).select('_id');
        const recipients = hrAndOwners.map((e: any) => e._id.toString());

        const requestor = await Employee.findById(data.employeeId).select("firstName lastName");
        const requestorName = requestor ? `${requestor.firstName} ${requestor.lastName}` : "Employee";
        const dateStr = data.date ? new Date(data.date).toLocaleDateString() : 'Unknown Date';

        if (recipients.length > 0) {
            await triggerNotification({
                title: "New Absence Reported",
                message: `${requestorName} reported an absence for ${dateStr}.`,
                type: "warning",
                category: "absence",
                recipients: recipients,
                link: "/dashboard/absences",
                metadata: { requestId: newRequest._id }
            });
        }
    } catch (notifErr) { }

    const emp = await Employee.findById(data.employeeId).select("slug");
    revalidatePath("/dashboard/absences");
    revalidatePath(`/dashboard/employees/${emp?.slug || data.employeeId}`);

    const session = await getServerSession(authOptions);
    const actorId = session?.user ? (session.user as any).id : data.employeeId;

    await logAction({
        action: 'REQUEST_ABSENCE',
        performedBy: actorId,
        targetId: newRequest._id,
        targetModel: 'AbsenceRequest',
        details: { date: data.date, reason: data.reason }
    });

    return JSON.parse(JSON.stringify(newRequest));
}

export async function getAllAbsenceRequests(filters: any = {}) {
    await dbConnect();
    const query: any = {};

    if (filters.status) query.status = filters.status;
    if (filters.employeeId) query.employeeId = filters.employeeId;
    if (filters.year) {
        const startOfYear = new Date(filters.year, 0, 1);
        const endOfYear = new Date(filters.year, 11, 31, 23, 59, 59);
        query.date = { $gte: startOfYear, $lte: endOfYear };
    }

    if (filters.storeId) {
        const employeesInStore = await Employee.find({ storeId: filters.storeId }).select("_id");
        const empIds = employeesInStore.map(e => e._id);
        if (query.employeeId) {
            if (!empIds.some(id => id.toString() === query.employeeId.toString())) {
                return [];
            }
        } else {
            query.employeeId = { $in: empIds };
        }
    }

    const requests = await AbsenceRequest.find(query)
        .populate("employeeId", "firstName lastName image email")
        .populate("approvedBy", "firstName lastName")
        .sort({ createdAt: -1 })
        .lean();

    return JSON.parse(JSON.stringify(requests));
}

export async function approveAbsenceRequest(requestId: string, approverId: string, payload: { justification?: string, type?: string } = {}) {
    await dbConnect();

    const request = await AbsenceRequest.findById(requestId);
    if (!request) throw new Error("Request not found");
    if (request.status !== 'pending') throw new Error("Request is not pending");

    const absenceType = payload.type || request.type || "Unspecified";
    const justification = payload.justification || "Justified"; // Default?

    // 1. Create Absence Record
    const record = await AbsenceRecord.create({
        employeeId: request.employeeId,
        date: request.date,
        reason: request.reason || absenceType,
        type: absenceType,
        justification: justification,
        shiftRef: request.shiftId ? { scheduleId: request.shiftId } : undefined,
        approvedBy: approverId // Use the approverId passed to the function
    });

    // 2. Link to Employee
    await Employee.findByIdAndUpdate(request.employeeId, {
        $push: { absences: record._id }
    });

    // 3. Update Request Status
    request.status = 'approved';
    request.approvedBy = approverId as any;
    request.type = absenceType;
    request.justification = justification as any;
    await request.save();

    // Trigger Real-time Update for Approvers/Admin Dashboard
    await pusherServer.trigger(`admin-updates`, "absence:updated", {
        requestId: request._id,
        status: 'approved',
        employeeId: request.employeeId
    });

    // Trigger Real-time Update for Employee
    await pusherServer.trigger(`user-${request.employeeId}`, "absence:approved", {
        requestId: request._id
    });

    // Notification: Notify Employee
    try {
        await triggerNotification({
            title: "Absence Approved",
            message: `Your absence report for ${new Date(request.date).toLocaleDateString()} has been approved.`,
            type: "info",
            category: "absence",
            recipients: [request.employeeId.toString()],
            link: "/dashboard/profile?tab=work",
            metadata: { requestId: request._id }
        });
    } catch (e) { }

    const emp = await Employee.findById(request.employeeId).select("slug");
    revalidatePath("/dashboard/absences");
    revalidatePath(`/dashboard/employees/${emp?.slug || request.employeeId}`);

    const session = await getServerSession(authOptions);
    if (session?.user) {
        await logAction({
            action: 'APPROVE_ABSENCE',
            performedBy: (session.user as any).id,
            targetId: request._id,
            targetModel: 'AbsenceRequest',
            details: { employeeId: request.employeeId, date: request.date }
        });
    }

    return JSON.parse(JSON.stringify(request));
}

export async function getEmployeeAbsences(employeeId: string) {
    await dbConnect();
    // Get both Records (approved history) and Requests (pending) 
    // to block dates effectively.

    const [records, requests] = await Promise.all([
        AbsenceRecord.find({ employeeId }).lean(),
        AbsenceRequest.find({ employeeId, status: 'pending' }).lean()
    ]);

    return {
        records: JSON.parse(JSON.stringify(records)),
        requests: JSON.parse(JSON.stringify(requests))
    };
}

export async function rejectAbsenceRequest(requestId: string, reviewerId: string, reason?: string) {
    await dbConnect();

    const request = await AbsenceRequest.findById(requestId);
    if (!request) throw new Error("Request not found");

    request.status = 'rejected';
    request.approvedBy = reviewerId as any;
    // Store rejection reason? request.reason is user reason. 
    // Schema doesn't have rejection reason field explicitly in AbsenceRequest, it has 'reason' (user provided).
    // Let's assume we don't overwrite user reason. Maybe append?
    // AbsenceRequest schema: reason: string.
    // For now, simple status update.
    await request.save();

    // Trigger Real-time Update for Approvers/Admin Dashboard
    await pusherServer.trigger(`admin-updates`, "absence:updated", {
        requestId: request._id,
        status: 'rejected',
        employeeId: request.employeeId
    });

    // Trigger Real-time Update for Employee
    await pusherServer.trigger(`user-${request.employeeId}`, "absence:rejected", {
        requestId: request._id
    });

    // Notification: Notify Employee
    try {
        await triggerNotification({
            title: "Absence Rejected",
            message: `Your absence report for ${new Date(request.date).toLocaleDateString()} has been rejected.`,
            type: "error",
            category: "absence",
            recipients: [request.employeeId.toString()],
            link: "/dashboard/profile?tab=work",
            metadata: { requestId: request._id }
        });
    } catch (e) { }

    const emp = await Employee.findById(request.employeeId).select("slug");
    revalidatePath("/dashboard/absences");
    revalidatePath(`/dashboard/employees/${emp?.slug || request.employeeId}`);

    const session = await getServerSession(authOptions);
    if (session?.user) {
        await logAction({
            action: 'REJECT_ABSENCE',
            performedBy: (session.user as any).id,
            targetId: request._id,
            targetModel: 'AbsenceRequest',
            details: { employeeId: request.employeeId, date: request.date }
        });
    }

    return JSON.parse(JSON.stringify(request));
}

export async function cancelAbsenceRecord(recordId: string, actorId: string) {
    await dbConnect();

    // Permission check (using same logic as approve)
    const actor = await Employee.findById(actorId).select("roles");
    const roles = (actor?.roles || []).map((r: string) => r.toLowerCase());
    const isPrivileged = roles.some((r: string) => ['hr', 'owner', 'admin', 'tech', 'super_user'].includes(r));
    if (!isPrivileged) throw new Error("Unauthorized to cancel absence records");

    const record = await AbsenceRecord.findById(recordId);
    if (!record) throw new Error("Record not found");

    const employeeId = record.employeeId;

    // 1. Remove from Employee absences list
    await Employee.findByIdAndUpdate(employeeId, {
        $pull: { absences: recordId }
    });

    // 2. Find and update potential matching request to 'cancelled'
    try {
        await AbsenceRequest.findOneAndUpdate(
            {
                employeeId,
                date: record.date,
                status: 'approved'
            },
            { status: 'cancelled' }
        );
    } catch (e) {
    }

    // 3. Log Action
    await logAction({
        action: 'CANCEL_ABSENCE',
        performedBy: actorId,
        targetId: recordId,
        targetModel: 'AbsenceRecord',
        details: { employeeId, date: record.date }
    });

    // 4. Delete Record
    await AbsenceRecord.findByIdAndDelete(recordId);

    await pusherServer.trigger(`admin-updates`, "absence:cancelled", {
        recordId,
        employeeId
    });

    revalidatePath("/dashboard/absences");
    const emp = await Employee.findById(employeeId).select("slug");
    revalidatePath(`/dashboard/employees/${emp?.slug || employeeId}`);

    return { success: true };
}

export async function getPendingAbsenceRequests() {
    await dbConnect();
    const requests = await AbsenceRequest.find({ status: 'pending' })
        .populate({
            path: 'employeeId',
            select: 'firstName lastName storeId',
            populate: { path: 'storeId', select: 'name' }
        })
        .sort({ createdAt: 1 })
        .lean();
    return JSON.parse(JSON.stringify(requests));
}
