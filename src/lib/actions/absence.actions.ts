"use server";

import dbConnect from "@/lib/db";
import {
    AbsenceRequest,
    AbsenceRecord,
    Employee,
    IAbsenceRequest,
    IAbsenceRecord
} from "@/lib/models";
import { revalidatePath } from "next/cache";

export type AbsenceRequestData = Partial<IAbsenceRequest>;

// --- Requests ---

export async function createAbsenceRequest(data: AbsenceRequestData) {
    await dbConnect();

    // Auto-approve logic could go here if configured (e.g. sick days auto-approved)
    // For now, all are pending.

    const newRequest = await AbsenceRequest.create({
        ...data,
        status: 'pending',
        createdAt: new Date()
    });

    revalidatePath("/dashboard/absences");
    revalidatePath(`/dashboard/employees/${data.employeeId}`);
    return JSON.parse(JSON.stringify(newRequest));
}

export async function getAllAbsenceRequests(filters: any = {}) {
    await dbConnect();
    const query: any = {};

    if (filters.status) query.status = filters.status;
    if (filters.employeeId) query.employeeId = filters.employeeId;

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

    revalidatePath("/dashboard/absences");
    revalidatePath(`/dashboard/employees/${request.employeeId}`);
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

    revalidatePath("/dashboard/absences");
    revalidatePath(`/dashboard/employees/${request.employeeId}`);
    return JSON.parse(JSON.stringify(request));
}
