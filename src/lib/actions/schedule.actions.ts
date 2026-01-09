"use server";

import dbConnect from "@/lib/db";
import { Schedule, StoreDepartment, Employee, Store, AbsenceRecord, ShiftCoverageRequest, ShiftSwapRequest, VacationRecord } from "@/lib/models";
import { pusherServer } from "@/lib/pusher";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { triggerNotification } from "@/lib/actions/notification.actions";
import { getEmployeeById } from "@/lib/actions/employee.actions"; // Import employee fetcher
import { logAction } from "./log.actions";
import { slugify, getISOWeekNumber } from "@/lib/utils";
import * as crypto from "crypto";

const MANAGE_SCHEDULE_ROLES = ["store_manager", "store_department_head", "department_head", "admin", "owner", "super_user", "hr", "tech"];

async function checkSchedulePermission(userId: string) {
    const employee = await getEmployeeById(userId);
    const roles = (employee?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
    if (!roles.some((r: string) => MANAGE_SCHEDULE_ROLES.includes(r))) {
        throw new Error("Unauthorized: You do not have permission to manage schedules.");
    }
}

export async function getSchedules(storeId: string, departmentId?: string, year?: number, week?: number) {
    await dbConnect();
    const query: any = { storeId };

    if (departmentId) query.storeDepartmentId = departmentId;
    if (year) query.year = year;
    if (week) query.weekNumber = week;

    const schedules = await Schedule.find(query)
        .populate("storeDepartmentId", "name")
        .populate("createdBy", "firstName lastName")
        .sort({ year: -1, weekNumber: -1 })
        .lean();

    return JSON.parse(JSON.stringify(schedules));
}

export async function getScheduleById(id: string) {
    await dbConnect();
    const schedule = await Schedule.findById(id)
        .populate("storeId", "name")
        .populate("storeDepartmentId", "name")
        .populate("createdBy", "firstName lastName")
        .populate({
            path: "days.shifts.employees",
            select: "firstName lastName image positionId contract",
            populate: { path: "positionId", select: "name" }
        })
        .populate("approvalHistory.changedBy", "firstName lastName")
        .lean();

    if (!schedule) return null;

    // Fetch absences for the schedule's week (for employees in this department/store)
    // We can filter by employees in the schedule or just all valid absences during this week
    const absences = await AbsenceRecord.find({
        date: { $gte: schedule.dateRange.startDate, $lte: schedule.dateRange.endDate },
    }).lean() as any[];

    // Include vacations as well
    const vacations = await VacationRecord.find({
        $or: [
            { from: { $lte: schedule.dateRange.endDate }, to: { $gte: schedule.dateRange.startDate } }
        ]
    }).lean();

    // Transform vacations into discrete "absence-like" objects for each day in the schedule range
    vacations.forEach((v: any) => {
        const start = new Date(Math.max(new Date(v.from).getTime(), new Date(schedule.dateRange.startDate).getTime()));
        const end = new Date(Math.min(new Date(v.to).getTime(), new Date(schedule.dateRange.endDate).getTime()));

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            absences.push({
                employeeId: v.employeeId.toString(),
                date: new Date(d),
                type: 'vacation',
                isVacation: true
            });
        }
    });

    // Ensure Mon-Sun structure (UTC)
    const daysMap = new Map();
    schedule.days.forEach((day: any) => {
        const dateStr = new Date(day.date).toISOString().split('T')[0];
        daysMap.set(dateStr, day);
    });

    const currentD = new Date(schedule.dateRange.startDate);
    const dayDow = currentD.getUTCDay() || 7;
    currentD.setUTCDate(currentD.getUTCDate() - dayDow + 1); // Set to Monday
    currentD.setUTCHours(0, 0, 0, 0);
    const monday = new Date(currentD);

    const fullDays = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setUTCDate(monday.getUTCDate() + i);
        const dStr = d.toISOString().split('T')[0];

        if (daysMap.has(dStr)) {
            fullDays.push(daysMap.get(dStr));
        } else {
            fullDays.push({
                date: d,
                isHoliday: false,
                holidayName: "",
                shifts: [],
                events: []
            });
        }
    }
    schedule.days = fullDays;

    return JSON.parse(JSON.stringify({ ...schedule, absences }));
}

export async function getScheduleBySlug(slug: string) {
    await dbConnect();
    const schedule = await Schedule.findOne({ slug })
        .populate("storeId", "name")
        .populate("storeDepartmentId", "name")
        .populate("createdBy", "firstName lastName")
        .populate({
            path: "days.shifts.employees",
            select: "firstName lastName image positionId contract",
            populate: { path: "positionId", select: "name" }
        })
        .populate("approvalHistory.changedBy", "firstName lastName")
        .lean();

    if (!schedule) return null;

    const absences = await AbsenceRecord.find({
        date: { $gte: schedule.dateRange.startDate, $lte: schedule.dateRange.endDate },
    }).lean() as any[];

    // Include vacations as well
    const vacations = await VacationRecord.find({
        $or: [
            { from: { $lte: schedule.dateRange.endDate }, to: { $gte: schedule.dateRange.startDate } }
        ]
    }).lean();

    // Transform vacations into discrete objects for each day
    vacations.forEach((v: any) => {
        const start = new Date(Math.max(new Date(v.from).getTime(), new Date(schedule.dateRange.startDate).getTime()));
        const end = new Date(Math.min(new Date(v.to).getTime(), new Date(schedule.dateRange.endDate).getTime()));

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            absences.push({
                employeeId: v.employeeId.toString(),
                date: new Date(d),
                type: 'vacation',
                isVacation: true
            });
        }
    });

    // Ensure Mon-Sun structure (UTC)
    const daysMap = new Map();
    schedule.days.forEach((day: any) => {
        const dateStr = new Date(day.date).toISOString().split('T')[0];
        daysMap.set(dateStr, day);
    });

    const currentD = new Date(schedule.dateRange.startDate);
    const dayDow = currentD.getUTCDay() || 7;
    currentD.setUTCDate(currentD.getUTCDate() - dayDow + 1);
    currentD.setUTCHours(0, 0, 0, 0);
    const monday = new Date(currentD);

    const fullDays = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setUTCDate(monday.getUTCDate() + i);
        const dStr = d.toISOString().split('T')[0];

        if (daysMap.has(dStr)) {
            fullDays.push(daysMap.get(dStr));
        } else {
            fullDays.push({
                date: d,
                isHoliday: false,
                holidayName: "",
                shifts: [],
                events: []
            });
        }
    }
    schedule.days = fullDays;

    return JSON.parse(JSON.stringify({ ...schedule, absences }));
}

export async function createSchedule(data: any) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");
    await checkSchedulePermission((session.user as any).id);

    const scheduleData = { ...data };
    if (!scheduleData.slug) {
        const dept = await StoreDepartment.findById(data.storeDepartmentId).select('slug');
        let baseSlug = slugify(`${data.year}-w${data.weekNumber}-${dept?.slug || 'dept'}`);
        let slug = baseSlug;
        while (await Schedule.findOne({ slug })) {
            slug = `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`;
        }
        scheduleData.slug = slug;
    }

    const newSchedule = await new Schedule(scheduleData).save();

    await logAction({
        action: 'CREATE_SCHEDULE',
        performedBy: (session.user as any).id,
        storeId: newSchedule.storeId.toString(),
        targetId: newSchedule._id,
        targetModel: 'Schedule',
        details: { weekNumber: newSchedule.weekNumber, year: newSchedule.year }
    });

    await pusherServer.trigger(`store-${newSchedule.storeId}`, "schedule:updated", {
        scheduleId: newSchedule._id,
        status: 'created'
    });

    revalidatePath(`/dashboard/schedules/${newSchedule.slug}`);
    revalidatePath("/dashboard/schedules");
    return JSON.parse(JSON.stringify(newSchedule));
}

export async function updateSchedule(id: string, data: any) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");
    await checkSchedulePermission((session.user as any).id);

    // 1. Fetch current for Diffing
    const currentSchedule = await Schedule.findById(id).populate({
        path: "days.shifts.employees",
        select: "firstName lastName"
    }).lean();

    // 2. Perform Update
    const updated = await Schedule.findByIdAndUpdate(id, data, { new: true })
        .populate("storeId", "name")
        .populate("storeDepartmentId", "name")
        .populate({
            path: "days.shifts.employees",
            select: "firstName lastName image positionId contract",
            populate: { path: "positionId", select: "name" }
        })
        .lean();

    // 3. Calc Diff (Basic)
    let changes: string[] = [];
    if (currentSchedule && data.days) {
        try {
            data.days.forEach((newDay: any, i: number) => {
                const oldDay = currentSchedule.days[i];
                if (!oldDay) return;

                const dateStr = new Date(newDay.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });

                // Check Holidays
                if (newDay.isHoliday !== oldDay.isHoliday) {
                    changes.push(`${dateStr}: Marked as ${newDay.isHoliday ? 'Closed' : 'Open'}`);
                }

                // Check Shifts (Count or basic details)
                // This is a naive diff. Ideally we track individual shift IDs but shifts are subdocs.
                // We'll compare formatted strings of shifts to detect changes.
                const fmt = (s: any) => `${s.startTime}-${s.endTime} (${s.employees?.length || 0})`;

                const oldShifts = oldDay.shifts.map(fmt).sort().join(',');
                const newShifts = newDay.shifts.map(fmt).sort().join(',');

                if (oldShifts !== newShifts) {
                    // Dig deeper if needed, or just say "Shifts changed"
                    const added = newDay.shifts.length - oldDay.shifts.length;
                    if (added > 0) changes.push(`${dateStr}: Added ${added} shift(s)`);
                    else if (added < 0) changes.push(`${dateStr}: Removed ${Math.abs(added)} shift(s)`);
                    else changes.push(`${dateStr}: Modified shifts`);
                }
            });
        } catch (e) {
            console.error("Diff calc error", e);
            changes.push("Complex update occurred");
        }
    }

    if (changes.length === 0 && data.days) changes.push("Minor adjustments");

    await logAction({
        action: 'UPDATE_SCHEDULE',
        performedBy: (session.user as any).id,
        storeId: updated.storeId?._id?.toString() || updated.storeId?.toString(),
        targetId: id,
        targetModel: 'Schedule',
        details: { status: updated.status, changes: changes.slice(0, 10) } // Limit log size
    });

    await pusherServer.trigger(`store-${updated.storeId?._id || updated.storeId}`, "schedule:updated", {
        scheduleId: id,
        status: 'updated'
    });

    revalidatePath(`/dashboard/schedules/${updated.slug}`);
    revalidatePath("/dashboard/schedules");

    // Notification: If updating a pending schedule, notify Approvers
    if (updated.status === 'pending' || updated.status === 'review') {
        try {
            const actor = await Employee.findById((session.user as any).id).select("firstName lastName");
            const actorName = actor ? `${actor.firstName} ${actor.lastName}` : "Someone";
            const storeName = (updated.storeId as any)?.name || "Store";
            const deptName = (updated.storeDepartmentId as any)?.name || "Department";

            const approvers = await Employee.find({
                roles: { $in: [/^hr$/i, /^owner$/i] },
                active: true
            }).select("_id");

            const recipientIds = approvers.map(a => a._id.toString()).filter(id => id !== (session.user as any).id);

            if (recipientIds.length > 0) {
                await triggerNotification({
                    title: "Pending Schedule Updated",
                    message: `${actorName} updated the pending schedule for ${deptName} at ${storeName}.`,
                    type: "info",
                    category: "schedule",
                    recipients: recipientIds,
                    link: `/dashboard/browsing/schedules/${updated.slug}`,
                    senderId: (session.user as any).id,
                    relatedStoreId: (updated.storeId as any)?._id,
                    relatedDepartmentId: (updated.storeDepartmentId as any)?._id
                });
            }
        } catch (e) {
            console.error("Failed to notify on schedule update:", e);
        }
    }

    return JSON.parse(JSON.stringify(updated));
}

export async function updateScheduleStatus(id: string, status: string, userId: string, comment?: string, notify: boolean = true) {
    await dbConnect();
    await checkSchedulePermission(userId);

    // Strict Permissions for Approval/Rejection/Publishing
    if (['approved', 'rejected', 'published'].includes(status)) {
        const actor = await getEmployeeById(userId);
        const roles = (actor?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
        // Allowing Admin/Owner/HR/Tech ONLY as per strict request
        const hasAuthority = roles.some((r: string) => ['hr', 'owner', 'admin', 'tech'].includes(r));

        // EXCEPTION: Allow Store Managers to "Publish" if they are reverting a Draft to Published (Cancel Edit)
        // Check if the current schedule is in 'draft' status.
        // We need to fetch the schedule first to check current status.
        const currentSchedule = await Schedule.findById(id).select('status createdBy savedBy');

        const isRevertingDraft = currentSchedule?.status === 'draft' && status === 'published';
        const isManager = roles.includes('store_manager');
        const isCreator = currentSchedule?.createdBy?.toString() === userId;

        if (!hasAuthority && !(isRevertingDraft && (isManager || isCreator))) {
            throw new Error(`Permission Denied: Only HR, Owners, Admin, or Tech can ${status} schedules.`);
        }

        // Feature: Prevent Approving/Publishing Empty Schedules
        // If status is 'approved' or 'published', we must ensure there is at least one shift with employees
        if (status === 'approved' || status === 'published') {
            // We need full schedule data to check shifts
            const fullSchedule = await Schedule.findById(id).lean();

            let hasShifts = false;
            if (fullSchedule && fullSchedule.days && Array.isArray(fullSchedule.days)) {
                for (const day of fullSchedule.days) {
                    if (day.shifts && day.shifts.length > 0) {
                        // Check if at least one shift has employees assigned (or just exists, user said "empty and there is noone and no shifts")
                        // "when schedule is empty and there is noone and no shifts"
                        // We can check if any shift exists.
                        hasShifts = true;
                        break;
                    }
                }
            }

            if (!hasShifts) {
                throw new Error(`Cannot ${status} an empty schedule. Please add shifts before approving.`);
            }
        }
    }

    const update: any = {
        status,
        $push: {
            approvalHistory: {
                status,
                changedBy: userId,
                comment,
                createdAt: new Date()
            }
        }
    };

    const updated = await Schedule.findByIdAndUpdate(id, update, { new: true })
        .populate("storeId", "name")
        .populate("storeDepartmentId", "name")
        .populate("createdBy", "firstName lastName")
        .populate({
            path: "days.shifts.employees",
            select: "firstName lastName image positionId contract",
            populate: { path: "positionId", select: "name" }
        })
        .lean();

    // Log Action
    const logType = (status === 'review' || status === 'pending') ? 'SEND_FOR_APPROVAL' :
        (status === 'rejected' ? 'REJECT_SCHEDULE' :
            (status === 'published' ? 'PUBLISH_SCHEDULE' :
                (status === 'approved' ? 'APPROVE_SCHEDULE' : 'UPDATE_SCHEDULE_STATUS')));

    await logAction({
        action: logType,
        performedBy: userId,
        storeId: updated.storeId?._id?.toString() || updated.storeId?.toString(),
        targetId: id,
        targetModel: 'Schedule',
        details: { status, comment, reversion: status === 'published' && comment?.includes('Reverted') }
    });

    await pusherServer.trigger(`store-${updated.storeId?._id || updated.storeId}`, "schedule:updated", {
        scheduleId: id,
        status: status
    });

    // Trigger Real-time Update for Approvers/Admin Dashboard
    await pusherServer.trigger(`admin-updates`, "schedule:updated", {
        scheduleId: id,
        status: status
    });

    revalidatePath(`/dashboard/schedules/${updated.slug}`);

    // Notification Logic
    // Notification Logic
    if (notify) {
        try {
            const actor = await Employee.findById(userId).select("firstName lastName");
            const actorName = actor ? `${actor.firstName} ${actor.lastName}` : "Someone";

            const storeName = (updated.storeId as any)?.name || "Store";
            const deptName = (updated.storeDepartmentId as any)?.name || "Department";
            let title = "";
            let message = "";

            if (status === 'review' || status === 'pending') {
                title = "Schedule Sent for Approval";
                message = `${actorName} sent a schedule for approval for ${deptName} at ${storeName}.`;

                const approvers = await Employee.find({
                    roles: { $in: [/^hr$/i, /^owner$/i] },
                    active: true
                }).select("_id");

                const recipientIds = approvers.map(a => a._id.toString()).filter(id => id !== userId);

                if (recipientIds.length > 0) {
                    await triggerNotification({
                        title,
                        message,
                        type: "info",
                        category: "schedule",
                        recipients: recipientIds,
                        link: `/dashboard/browsing/schedules/${updated.slug}`,
                        senderId: userId,
                        relatedStoreId: (updated.storeId as any)?._id,
                        relatedDepartmentId: (updated.storeDepartmentId as any)?._id
                    });
                }

            } else if (status === 'published' || status === 'approved') {
                const isPublished = status === 'published';
                title = isPublished ? "Schedule Published" : "Schedule Approved";
                message = isPublished
                    ? `The schedule for ${deptName} at ${storeName} is now live.`
                    : `The schedule for ${deptName} at ${storeName} has been approved.`;

                const employeeIds = new Set<string>();

                if (updated.days && Array.isArray(updated.days)) {
                    updated.days.forEach((day: any) => {
                        if (day.shifts && Array.isArray(day.shifts)) {
                            day.shifts.forEach((shift: any) => {
                                if (shift.employees && Array.isArray(shift.employees)) {
                                    shift.employees.forEach((emp: any) => {
                                        const empId = emp._id ? emp._id.toString() : emp.toString();
                                        employeeIds.add(empId);
                                    });
                                }
                            });
                        }
                    });
                }

                if (updated.createdBy) {
                    const creatorId = updated.createdBy._id ? updated.createdBy._id.toString() : updated.createdBy.toString();
                    employeeIds.add(creatorId);
                }

                const recipients = Array.from(employeeIds).filter(r => r !== userId);

                console.log(`[ScheduleNotification] Status: ${status}, Recipients found: ${recipients.length}`);

                if (recipients.length > 0) {
                    await triggerNotification({
                        title,
                        message,
                        type: "success",
                        category: "schedule",
                        recipients: recipients,
                        link: `/dashboard/schedules/${updated.slug}`,
                        senderId: userId,
                        relatedStoreId: (updated.storeId as any)?._id,
                        relatedDepartmentId: (updated.storeDepartmentId as any)?._id
                    });
                }
            } else if (status === 'rejected') {
                title = "Schedule Rejected";
                message = `Your schedule for ${deptName} at ${storeName} was rejected by ${actorName}. Comment: ${comment || "None"}.`;

                if (updated.createdBy) {
                    const creatorId = updated.createdBy._id ? updated.createdBy._id.toString() : updated.createdBy.toString();
                    if (creatorId !== userId) {
                        await triggerNotification({
                            title,
                            message,
                            type: "error",
                            category: "schedule",
                            recipients: [creatorId],
                            link: `/dashboard/schedules/${updated.slug}`,
                            senderId: userId,
                            relatedStoreId: (updated.storeId as any)?._id,
                            relatedDepartmentId: (updated.storeDepartmentId as any)?._id
                        });
                    }
                }
            }
        } catch (e) {
            console.error("Error sending notification:", e);
        }
    }

    return JSON.parse(JSON.stringify(updated));
}

export async function getOrCreateSchedule(storeId: string, storeDepartmentId: string, startDate: Date, _userId?: string) {
    await dbConnect();

    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
        throw new Error("Unauthorized");
    }
    const userId = (session.user as any).id;

    // 1. Calculate Week Number and Year from startDate
    // Using ISO week date
    const date = new Date(startDate);
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    const year = date.getUTCFullYear();

    // 2. Check if exists
    const existing = await Schedule.findOne({
        storeId,
        storeDepartmentId,
        year,
        weekNumber
    });

    if (existing) {
        return JSON.parse(JSON.stringify(existing));
    }

    // 3. Create new if not
    // Calculate start and end of week (Monday to Sunday)
    const startOfWeek = new Date(date); // This 'date' is Thursday of the week due to ISO calc
    // Re-calculate start of week from the INPUT startDate to be sure, or use the ISO adjusted one?
    // The ISO calc adjusted 'date' to Thursday. Monday is Date - 3.
    const isoMonday = new Date(date);
    isoMonday.setUTCDate(isoMonday.getUTCDate() - 3);

    // However, let's trust the input startDate was likely meant to be in that week.
    // Better to stick to ISO standard weeks.

    const endOfWeek = new Date(isoMonday);
    endOfWeek.setUTCDate(endOfWeek.getUTCDate() + 6); // Sunday

    // Initialize days
    const days = [];
    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(isoMonday);
        currentDay.setUTCDate(currentDay.getUTCDate() + i);
        days.push({
            date: currentDay,
            shifts: [],
            events: []
        });
    }
    // Generate slug properly BEFORE creation to satisfy required field validation
    const dept = await StoreDepartment.findById(storeDepartmentId).select('slug');
    let baseSlug = slugify(`${year}-w${weekNumber}-${dept?.slug || 'dept'}`);
    let slug = baseSlug;
    while (await Schedule.findOne({ slug })) {
        slug = `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`;
    }

    const newSchedule = await Schedule.create({
        storeId,
        storeDepartmentId,
        weekNumber,
        year,
        slug, // Include slug here
        dateRange: {
            startDate: isoMonday,
            endDate: endOfWeek
        },
        status: 'draft',
        days,
        createdBy: userId,
        approvalHistory: [{
            status: 'draft',
            changedBy: userId,
            createdAt: new Date()
        }]
    });

    revalidatePath(`/dashboard/schedules/${newSchedule.slug}`);
    revalidatePath("/dashboard/schedules");

    return JSON.parse(JSON.stringify(newSchedule));
}



export async function copyPreviousSchedule(currentScheduleId: string, userId: string) {
    await dbConnect();
    await checkSchedulePermission(userId);

    // 1. Get current schedule as LEAN to interact with plain objects
    const currentSchedule = await Schedule.findById(currentScheduleId).lean();
    if (!currentSchedule) throw new Error("Schedule not found");

    // 2. Calculate target start date for previous week (7 days ago)
    const currentStart = new Date(currentSchedule.dateRange.startDate);
    const targetPrevStart = new Date(currentStart);
    targetPrevStart.setDate(targetPrevStart.getDate() - 7);

    // Create a fuzzy search window (+/- 12 hours) to handle potential timezone offsets
    const searchStart = new Date(targetPrevStart);
    searchStart.setHours(searchStart.getHours() - 12);

    const searchEnd = new Date(targetPrevStart);
    searchEnd.setHours(searchEnd.getHours() + 12);

    console.log(`[CopySchedule] Current Start: ${currentStart.toISOString()}, Looking for Prev Start between: ${searchStart.toISOString()} and ${searchEnd.toISOString()} `);

    // 3. Find previous schedule by DATE range
    const prevSchedule = await Schedule.findOne({
        storeId: currentSchedule.storeId,
        storeDepartmentId: currentSchedule.storeDepartmentId,
        "dateRange.startDate": {
            $gte: searchStart,
            $lte: searchEnd
        }
    }).lean();

    if (!prevSchedule) {
        throw new Error(`No schedule found for the previous week(Expected start around ${targetPrevStart.toDateString()})`);
    }

    // 4. Map shifts
    const updatedDays = currentSchedule.days.map((currentDay: any, index: number) => {
        const prevDay = prevSchedule.days[index];
        if (!prevDay) return currentDay;

        // Clone shifts strictly
        const copiedShifts = prevDay.shifts.map((s: any) => ({
            shiftName: s.shiftName,
            startTime: s.startTime,
            endTime: s.endTime,
            breakMinutes: s.breakMinutes,
            color: s.color,
            employees: s.employees,
            notes: s.notes,
        }));

        return {
            ...currentDay,
            isHoliday: prevDay.isHoliday,
            holidayName: prevDay.holidayName,
            shifts: copiedShifts
        };
    });

    // 5. Update current schedule
    const updated = await Schedule.findByIdAndUpdate(currentScheduleId, {
        days: updatedDays,
        $push: {
            approvalHistory: {
                status: currentSchedule.status,
                changedBy: userId,
                comment: `Copied from Week starting ${new Date(prevSchedule.dateRange.startDate).toLocaleDateString()} `,
                createdAt: new Date()
            }
        }
    }, { new: true })
        .populate("storeDepartmentId", "name")
        .populate("createdBy", "firstName lastName")
        .populate({
            path: "days.shifts.employees",
            select: "firstName lastName image positionId contract",
            populate: { path: "positionId", select: "name" }
        })
        .lean();

    revalidatePath(`/ dashboard / schedules / ${updated.slug} `);
    return JSON.parse(JSON.stringify(updated));
}

export async function getEmployeeScheduleView(employeeId: string, date: Date) {
    await dbConnect();

    // 1. Calculate Week/Year for the requested date
    const d = new Date(date);
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    const year = d.getUTCFullYear();

    // 2. Find ALL Schedules for this week that contain the employee
    let schedules = await Schedule.find({
        year,
        weekNumber,
        "days.shifts.employees": employeeId
    })
        .populate("storeId", "name")
        .populate("storeDepartmentId", "name")
        .lean();

    // FALLBACK: If no shifts assigned, find ANY published schedule for their store
    // This allows managers/employees to see the week structure (holidays, etc.) even with 0 shifts
    if (!schedules || schedules.length === 0) {
        const employeeData = await Employee.findById(employeeId).select('storeId dob');
        if (employeeData?.storeId) {
            schedules = await Schedule.find({
                year,
                weekNumber,
                storeId: employeeData.storeId,
                status: 'published'
            })
                .populate("storeId", "name")
                .populate("storeDepartmentId", "name")
                .lean();
        }
    }

    const employeeObj = await Employee.findById(employeeId).select('dob');
    const dob = employeeObj?.dob;

    if (!schedules || schedules.length === 0) return JSON.parse(JSON.stringify({ weekNumber, year, days: [], dob }));

    // 3. Merge Shifts
    const daysMap = new Map();

    // Initialize with all 7 days of the week ensuring Mon-Sun
    const currentD = new Date(date);
    const dayOfWeek = currentD.getDay(); // 0=Sun, 1=Mon
    // Set to Monday of this week
    // If Sunday (0), subtract 6 days. If Mon (1), subtract 0. If Tue (2), subtract 1.
    const diff = currentD.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(currentD.setDate(diff));

    const weekStart = new Date(monday);
    const weekEnd = new Date(monday);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Fetch Absences for this week
    const absences = await AbsenceRecord.find({
        employeeId: employeeId,
        date: { $lte: weekEnd, $gte: weekStart },
        status: { $ne: 'rejected' }
    }).lean();

    const absenceMap = new Map();
    absences.forEach((abs: any) => {
        const dateStr = new Date(abs.date).toISOString().split('T')[0];
        absenceMap.set(dateStr, abs);
    });

    // Fetch Vacations for this week
    const { VacationRecord } = require("@/lib/models");
    const vacations = await VacationRecord.find({
        employeeId: employeeId,
        from: { $lte: weekEnd }, // Vacation starts before or on week end
        to: { $gte: weekStart },  // Vacation ends after or on week start
        status: 'approved'        // Only show approved vacations
    }).lean();
    // A vacation might span multiple days, we need to map it to each day in the range

    for (let i = 0; i < 7; i++) {
        const loopDate = new Date(monday);
        loopDate.setDate(monday.getDate() + i);
        const dateStr = loopDate.toISOString().split('T')[0];

        const isBirthday = dob &&
            new Date(loopDate).getUTCDate() === new Date(dob).getUTCDate() &&
            new Date(loopDate).getUTCMonth() === new Date(dob).getUTCMonth();

        daysMap.set(dateStr, {
            date: loopDate,
            isHoliday: false,
            holidayName: "",
            isBirthday: !!isBirthday,
            shifts: []
        });
    }

    // Populate Vacations into daysMap (Priority: Absences > Vacations > Shifts)
    // Actually, if there is a vacation, there shouldn't be shifts usually.
    vacations.forEach((vac: any) => {
        const vStart = new Date(vac.from);
        const vEnd = new Date(vac.to);

        // Iterate through week days and check if they fall in vacation range
        for (let i = 0; i < 7; i++) {
            const loopDate = new Date(monday);
            loopDate.setDate(monday.getDate() + i);

            // Check overlap
            // We compare dates at midnight to avoid time issues
            const checkDate = new Date(loopDate);
            checkDate.setHours(0, 0, 0, 0);
            const s = new Date(vStart); s.setHours(0, 0, 0, 0);
            const e = new Date(vEnd); e.setHours(0, 0, 0, 0);

            if (checkDate >= s && checkDate <= e) {
                const dateStr = checkDate.toISOString().split('T')[0];
                const dayObj = daysMap.get(dateStr);
                if (dayObj) {
                    // Add Vacation Shift
                    dayObj.shifts.push({
                        _id: vac._id,
                        startTime: "00:00",
                        endTime: "00:00",
                        storeName: "Vacation",
                        deptName: "Vacation",
                        shiftName: "Vacation", // Simple name
                        isVacation: true, // New Flag
                        totalDays: vac.totalDays
                    });
                }
            }
        }
    });

    schedules.forEach((sch: any) => {
        const storeName = sch.storeId?.name || "Unknown Store";
        const deptName = sch.storeDepartmentId?.name || "Unknown Dept";

        sch.days.forEach((day: any) => {
            const dateStr = new Date(day.date).toISOString().split('T')[0];

            if (!daysMap.has(dateStr)) {
                // Should exist from init, but fallback
                daysMap.set(dateStr, {
                    date: day.date,
                    isHoliday: false,
                    holidayName: "",
                    shifts: []
                });
            }

            const dayObj = daysMap.get(dateStr);
            if (day.isHoliday) {
                dayObj.isHoliday = true;
                dayObj.holidayName = day.holidayName;
            }

            const absence = absenceMap.get(dateStr);

            // Check if already has vacation (vacation takes precedence over regular shifts, but absence takes precedence over vacation? usually one or other)
            // If we have vacation, we might still show absence if they were supposed to be on vacation but marked absent? unlikely.
            // Let's assume Absence > Vacation > Shift.
            // If vacation exists, we might have added it above.
            const hasVacation = dayObj.shifts.some((s: any) => s.isVacation);

            if (absence) {
                // If there's an absence record, it overrides everything including vacation (odd case but safe)
                // Filter out any vacation shift if we are adding absence? Or just add absence.
                // Let's add absence.
                const alreadyHasAbsence = dayObj.shifts.some((s: any) => s.isAbsent);
                if (!alreadyHasAbsence) {
                    dayObj.shifts.push({
                        _id: absence._id,
                        startTime: "00:00",
                        endTime: "00:00",
                        storeName: "Absent",
                        deptName: "Absent",
                        shiftName: `Absent: ${absence.reason || absence.type}`,
                        isAbsent: true,
                        absenceType: absence.type,
                        absenceStatus: absence.justification
                    });
                }
            } else if (!hasVacation) {
                // Only add regular shifts if NO Vacation AND NO Absence (implied by absence check logic if we structure right, but here we iterate schedules)
                // Wait, if absence is added, we still might process this block? No, `if (absence)` handles it.
                // But `hasVacation` check is needed.

                const userShifts = day.shifts.filter((s: any) =>
                    s.employees.some((e: any) => (e._id ? e._id.toString() : e.toString()) === employeeId)
                );

                userShifts.forEach((s: any) => {
                    dayObj.shifts.push({
                        ...s,
                        storeName,
                        deptName,
                        scheduleId: sch._id,
                        storeId: sch.storeId?._id || sch.storeId,
                        storeDepartmentId: sch.storeDepartmentId?._id || sch.storeDepartmentId
                    });
                });
            }
        });
    });

    const sortedDays = Array.from(daysMap.values()).sort((a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Find the most relevant schedule for the "Full Schedule" link
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const primarySchedule = schedules.find((s: any) => {
        const start = new Date(s.dateRange.startDate);
        const end = new Date(s.dateRange.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return targetDate >= start && targetDate <= end;
    }) || schedules[0];

    return JSON.parse(JSON.stringify({
        weekNumber,
        year,
        days: sortedDays,
        primaryScheduleSlug: primarySchedule?.slug,
        dob
    }));
}

export async function getDashboardData(date: Date = new Date(), storeIdFilter?: string) {
    await dbConnect();
    const { Store, StoreDepartment } = require("@/lib/models");

    // 1. Calculate Week/Year
    const d = new Date(date);
    const { week, year } = getISOWeekNumber(d);

    // 2. Fetch active Stores (apply filter if provided)
    const storeQuery: any = { active: true };
    if (storeIdFilter) {
        storeQuery._id = storeIdFilter;
    }

    const stores = await Store.find(storeQuery).lean();
    const storeIds = stores.map((s: any) => s._id);

    // 3. Fetch all Schedules for this week
    const schedules = await Schedule.find({
        storeId: { $in: storeIds },
        year,
        weekNumber: week
    }).lean();

    // 4. Structure Response & Aggregate Data
    // We fetch departments first to know the "Universe" of work
    const summary = {
        total: 0,
        inProgress: 0,
        pending: 0,
        approved: 0,
        notStarted: 0,
        totalDepartments: 0
    };

    const scheduleMap = new Map();
    schedules.forEach((sch: any) => {
        scheduleMap.set(sch.storeDepartmentId.toString(), sch);
    });

    const storesWithData = await Promise.all(stores.map(async (store: any) => {
        const departments = await StoreDepartment.find({ storeId: store._id, active: true }).lean();

        const departmentsWithSchedule = departments.map((dept: any) => {
            const sch = scheduleMap.get(dept._id.toString());
            // Calculate total hours if schedule exists
            let totalHours = 0;
            let employeeCount = 0;

            if (sch) {
                const employees = new Set();
                sch.days.forEach((day: any) => {
                    day.shifts.forEach((shift: any) => {
                        const [startH, startM] = shift.startTime.split(':').map(Number);
                        const [endH, endM] = shift.endTime.split(':').map(Number);

                        // Use a fixed date for calculation
                        const start = new Date(0);
                        start.setUTCHours(startH, startM, 0, 0);

                        const end = new Date(0);
                        end.setUTCHours(endH, endM, 0, 0);

                        let diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                        if (diff < 0) diff += 24; // Handle overnight
                        totalHours += diff;

                        shift.employees.forEach((e: any) => employees.add(e.toString()));
                    });
                });
                employeeCount = employees.size;
            }

            return {
                ...dept,
                schedule: sch ? {
                    _id: sch._id,
                    status: sch.status,
                    totalHours: Math.round(totalHours),
                    employeeCount,
                    createdBy: sch.createdBy, // You might want to populate name here if needed
                    updatedAt: sch.updatedAt
                } : null
            };
        });

        return {
            ...store,
            departments: departmentsWithSchedule
        };
    }));

    // Calculate Summary from the structured data to ensure consistency
    storesWithData.forEach((store: any) => {
        store.departments.forEach((dept: any) => {
            summary.totalDepartments++;
            if (!dept.schedule) {
                summary.notStarted++;
            } else {
                summary.total++;
                if (dept.schedule.status === 'draft') summary.inProgress++;
                else if (dept.schedule.status === 'pending' || dept.schedule.status === 'review') summary.pending++;
                else if (dept.schedule.status === 'approved' || dept.schedule.status === 'published') summary.approved++;
            }
        });
    });

    return JSON.parse(JSON.stringify({
        summary,
        stores: storesWithData,
        weekInfo: { week, year }
    }));
}

export async function getPendingSchedules(storeId?: string) {
    await dbConnect();
    const query: any = { status: 'pending' };
    if (storeId) query.storeId = storeId;

    const schedules = await Schedule.find(query)
        .populate("storeId", "name")
        .populate("storeDepartmentId", "name")
        .populate("createdBy", "firstName lastName")
        .sort({ updatedAt: -1 })
        .lean();
    return JSON.parse(JSON.stringify(schedules));
}

// --- Work History & Stats ---

export async function getEmployeeWorkHistory(employeeId: string, rangeHelper?: { start?: Date, end?: Date }) {
    await dbConnect();
    const { Schedule, ExtraHourRequest } = require("@/lib/models");

    const now = new Date();
    // Default range: Last 1 year if not specified
    const defaultStart = new Date(now);
    defaultStart.setFullYear(now.getFullYear() - 1);

    // Determine effective range for query
    // If rangeHelper is strict (calculator), we use it strictly.
    // If not (profile view), we allow fetching past 1 year to populate history navigation.
    const queryStart = rangeHelper?.start || defaultStart;
    const queryEnd = rangeHelper?.end || new Date(now.getFullYear() + 1, 0, 1); // Future buffer

    // 1. Fetch Schedules
    // We want schedules that OVERLAP with the query range.
    // Schedule range: s.startDate to s.endDate.
    // Overlap: s.startDate <= queryEnd && s.endDate >= queryStart
    const scheduleQuery = {
        "days.shifts.employees": employeeId,
        "dateRange.startDate": { $lte: queryEnd },
        "dateRange.endDate": { $gte: queryStart }
    };

    const schedules = await Schedule.find(scheduleQuery)
        .populate("storeId", "name")
        .populate("storeDepartmentId", "name")
        .lean();

    // 2. Fetch Extra Hours (Approved Overtime)
    const extraHoursQuery = {
        employeeId: employeeId,
        status: "approved",
        date: { $gte: queryStart, $lte: queryEnd }
    };

    const extraRequests = await ExtraHourRequest.find(extraHoursQuery).lean();

    // 3. Process Data
    let totalHoursToday = 0;
    let totalHoursWeek = 0;
    let totalHoursMonth = 0;
    let totalHoursYear = 0; // Calendar Year
    let rangeTotal = 0;

    const history: any[] = [];
    const currentWeekNum = getWeekNumber(now);
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Helper to calculate hours
    const calcHours = (start: string, end: string, breakMins: number = 0) => {
        const [h1, m1] = start.split(":").map(Number);
        const [h2, m2] = end.split(":").map(Number);
        let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diff < 0) diff += 24 * 60;
        diff -= breakMins;
        return Math.max(0, diff / 60);
    };

    // Helper for week number
    function getWeekNumber(d: Date) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }

    const targetStart = rangeHelper?.start?.getTime() || 0;
    const targetEnd = rangeHelper?.end?.getTime() || Infinity;

    // Process Schedules
    for (const sched of schedules) {
        for (const day of sched.days) {
            const dayDate = new Date(day.date);
            const isToday = dayDate.toDateString() === now.toDateString();
            const isThisWeek = getWeekNumber(dayDate) === currentWeekNum && dayDate.getFullYear() === currentYear;
            const isThisMonth = dayDate.getMonth() === currentMonth && dayDate.getFullYear() === currentYear;
            const isThisYear = dayDate.getFullYear() === currentYear;

            // Strict range check for calculator / filtering
            const inRange = dayDate.getTime() >= targetStart && dayDate.getTime() <= targetEnd;
            if (rangeHelper && !inRange) continue; // Skip if strict range and not in valid range

            for (const shift of day.shifts) {
                const empIds = shift.employees.map((id: any) => id.toString());
                if (empIds.includes(employeeId.toString())) {
                    const hours = calcHours(shift.startTime, shift.endTime, shift.breakMinutes);

                    if (isToday) totalHoursToday += hours;
                    if (isThisWeek) totalHoursWeek += hours;
                    if (isThisMonth) totalHoursMonth += hours;
                    if (isThisYear) totalHoursYear += hours;

                    if (inRange) rangeTotal += hours;

                    history.push({
                        type: 'shift',
                        date: day.date,
                        storeName: sched.storeId?.name,
                        deptName: sched.storeDepartmentId?.name,
                        shiftName: shift.shiftName,
                        startTime: shift.startTime,
                        endTime: shift.endTime,
                        hours: Number(hours.toFixed(2)),
                        isOvertime: shift.isOvertime,
                        scheduleId: sched._id.toString()
                    });
                }
            }
        }
    }

    // Process Approved Extra Hours
    for (const req of extraRequests) {
        const rDate = new Date(req.date);
        const hours = req.hoursRequested;

        const isToday = rDate.toDateString() === now.toDateString();
        const isThisWeek = getWeekNumber(rDate) === currentWeekNum && rDate.getFullYear() === currentYear;
        const isThisMonth = rDate.getMonth() === currentMonth && rDate.getFullYear() === currentYear;
        const isThisYear = rDate.getFullYear() === currentYear;
        const inRange = rDate.getTime() >= targetStart && rDate.getTime() <= targetEnd;

        // If we are in strict mode (rangeHelper), current stats (today/week/etc) might not be relevant
        // if the range is in the past. But let's keep accumulation consistent.
        // Actually, if rangeHelper is set, user likely only cares about `rangeTotal`.
        // But `ProfileWorkTab` calls it without rangeHelper for initial Stats + History.

        if (isToday) totalHoursToday += hours;
        if (isThisWeek) totalHoursWeek += hours;
        if (isThisMonth) totalHoursMonth += hours;
        if (isThisYear) totalHoursYear += hours;

        if (inRange || !rangeHelper) {
            if (inRange) rangeTotal += hours;

            history.push({
                type: 'extra',
                date: req.date,
                storeName: "Extra Hours", // Placeholder
                deptName: req.note || "Approved Request",
                shiftName: "Overtime",
                startTime: "-",
                endTime: "-",
                hours: Number(hours.toFixed(2)),
                isOvertime: true,
                scheduleId: req._id.toString()
            });
        }
    }

    // Sort history descending
    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
        stats: {
            day: Number(totalHoursToday.toFixed(2)),
            week: Number(totalHoursWeek.toFixed(2)),
            month: Number(totalHoursMonth.toFixed(2)),
            year: Number(totalHoursYear.toFixed(2))
        },
        rangeTotal: Number(rangeTotal.toFixed(2)),
        history
    };
}

export async function findConflictingShifts(
    employeeIds: string[],
    dateRange: { start: string, end: string },
    excludeScheduleId: string
) {
    await dbConnect();

    // Find all schedules that overlap with this date range, excluding the current one
    const schedules = await Schedule.find({
        _id: { $ne: excludeScheduleId },
        $or: [
            { "dateRange.startDate": { $lte: dateRange.end }, "dateRange.endDate": { $gte: dateRange.start } }
        ],
        "days.shifts.employees": { $in: employeeIds }
    })
        .select('days storeId status storeDepartmentId slug')
        .populate('storeId', 'name')
        .populate('storeDepartmentId', 'name')
        .lean();

    const conflicts: any[] = [];

    // Parse schedules to find exact shift conflicts
    schedules.forEach((sched: any) => {
        sched.days.forEach((day: any) => {
            day.shifts.forEach((shift: any) => {
                const affectedEmployees = shift.employees
                    // @ts-ignore
                    .filter((empId: any) => employeeIds.includes(empId.toString()));

                if (affectedEmployees.length > 0) {
                    conflicts.push({
                        date: day.date,
                        startTime: shift.startTime,
                        endTime: shift.endTime,
                        storeName: sched.storeId?.name || "Unknown Store",
                        departmentName: sched.storeDepartmentId?.name,
                        status: sched.status,
                        employeeIds: affectedEmployees,
                        slug: sched.slug
                    });
                }
            });
        });
    });

    return JSON.parse(JSON.stringify(conflicts));
}

export async function deleteSchedule(id: string, userId: string) {
    await dbConnect();
    const schedule = await Schedule.findByIdAndDelete(id);
    if (!schedule) throw new Error("Schedule not found");

    await logAction({
        action: "DELETE_SCHEDULE",
        performedBy: userId,
        targetId: id,
        targetModel: "Schedule",
        details: { weekNumber: schedule.weekNumber, year: schedule.year, storeId: schedule.storeId, departmentId: schedule.storeDepartmentId }
    });

    revalidatePath("/dashboard/schedules");
    return { success: true };
}

export async function getEmployeeSchedulesInRange(employeeId: string, startDate: Date, endDate: Date) {
    await dbConnect();

    // Query for schedules that overlap with the range
    // Schedule range: dateRange.startDate to dateRange.endDate
    const schedules = await Schedule.find({
        "days.shifts.employees": employeeId,
        "dateRange.startDate": { $lte: endDate },
        "dateRange.endDate": { $gte: startDate },
        status: "published" // Only show published schedules to non-managers or for general viewing
    })
        .populate("storeId", "name")
        .populate("storeDepartmentId", "name")
        .lean();

    const formattedShifts: any[] = [];

    // Fetch Absences for this employee in range
    const absences = await AbsenceRecord.find({
        employeeId: employeeId,
        date: { $lte: endDate, $gte: startDate },
        status: { $ne: 'rejected' } // Include pending? Maybe. Definitely approved/covered.
    }).lean();

    const absenceMap = new Map();
    absences.forEach((abs: any) => {
        const dateStr = new Date(abs.date).toISOString().split('T')[0];
        absenceMap.set(dateStr, abs);
    });

    schedules.forEach((sch: any) => {
        sch.days.forEach((day: any) => {
            const date = new Date(day.date);
            const dateStr = date.toISOString().split('T')[0];

            if (date >= startDate && date <= endDate) {
                day.shifts.forEach((shift: any) => {
                    const empParams = shift.employees.map((e: any) => e.toString());
                    if (empParams.includes(employeeId)) {

                        // Check for absence
                        const absence = absenceMap.get(dateStr);

                        if (absence) {
                            formattedShifts.push({
                                _id: absence._id, // Use absence ID
                                date: day.date,
                                start: shift.startTime,
                                end: shift.endTime,
                                store: sch.storeId?.name || "Unknown Store",
                                department: "Absent", // Override department
                                scheduleId: sch._id,
                                storeId: sch.storeId?._id || sch.storeId,
                                storeDepartmentId: sch.storeDepartmentId?._id || sch.storeDepartmentId,
                                position: "Absent",
                                shiftName: `Absent: ${absence.reason || absence.type}`,
                                isAbsent: true,
                                absenceType: absence.type,
                                absenceStatus: absence.justification // justified/unjustified
                            });
                        } else {
                            formattedShifts.push({
                                _id: shift._id || `${day.date}-${shift.startTime}-${employeeId}`,
                                date: day.date,
                                start: shift.startTime,
                                end: shift.endTime,
                                store: sch.storeId?.name || "Unknown Store",
                                department: sch.storeDepartmentId?.name || "Unknown Dept",
                                scheduleId: sch._id,
                                storeId: sch.storeId?._id || sch.storeId,
                                storeDepartmentId: sch.storeDepartmentId?._id || sch.storeDepartmentId,
                                position: "Staff", // Populate this if available in shift.employees
                                shiftName: shift.shiftName
                            });
                        }
                    }
                });
            }
        });
    });

    // Sort by date descending
    formattedShifts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return JSON.parse(JSON.stringify(formattedShifts));
}

export async function removeEmployeeFromSchedulesInRange(employeeId: string, startDate: Date, endDate: Date) {
    await dbConnect();

    // Find all schedules that overlap with the range
    const schedules = await Schedule.find({
        "dateRange.startDate": { $lte: endDate },
        "dateRange.endDate": { $gte: startDate },
        "days.shifts.employees": employeeId
    });

    for (const schedule of schedules) {
        let hasChanges = false;
        schedule.days.forEach((day: any) => {
            const dayDate = new Date(day.date);
            dayDate.setHours(0, 0, 0, 0);

            if (dayDate >= startDate && dayDate <= endDate) {
                day.shifts.forEach((shift: any) => {
                    const originalLength = shift.employees.length;
                    shift.employees = shift.employees.filter((id: any) => id.toString() !== employeeId);
                    if (shift.employees.length !== originalLength) {
                        hasChanges = true;
                    }
                });
            }
        });

        if (hasChanges) {
            await schedule.save();
            await logAction({
                action: 'CLEANUP_VACATION_SHIFTS',
                performedBy: 'system',
                storeId: schedule.storeId.toString(),
                targetId: schedule._id,
                targetModel: 'Schedule',
                details: { employeeId, startDate, endDate }
            });
        }
    }
}

export async function notifyScheduleReminders(entityIds: string[], type: 'store' | 'department') {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    // Check permission (Admin/Owner/HR/SuperUser)
    await checkSchedulePermission((session.user as any).id);

    let recipientsCount = 0;

    try {
        if (type === 'store') {
            const managers = await Employee.find({
                storeId: { $in: entityIds },
                roles: { $in: ['store_manager', 'Store Manager'] },
                active: true
            }).select('_id firstName lastName storeId');

            for (const manager of managers) {
                await triggerNotification({
                    title: "Urgent: Schedule Submission Overdue",
                    message: "Next week's schedule for your store is overdue. Please submit it immediately.",
                    type: "warning",
                    category: "schedule",
                    link: "/dashboard/schedules",
                    recipients: [manager._id.toString()],
                    senderId: (session.user as any).id,

                    relatedStoreId: manager.storeId
                });
            }
            recipientsCount = managers.length;
        } else {
            const heads = await Employee.find({
                storeDepartmentId: { $in: entityIds },
                roles: { $in: ['store_department_head', 'Department Head'] },
                active: true
            }).select('_id firstName lastName storeDepartmentId storeId');

            for (const head of heads) {
                await triggerNotification({
                    title: "Urgent: Schedule Submission Overdue",
                    message: "Next week's schedule for your department is overdue.",
                    type: "warning",
                    category: "schedule",
                    link: "/dashboard/schedules",
                    recipients: [head._id.toString()],
                    senderId: (session.user as any).id,

                    relatedStoreId: head.storeId,
                    relatedDepartmentId: head.storeDepartmentId
                });
            }
            recipientsCount = heads.length;
        }

        return { success: true, count: recipientsCount };
    } catch (e: any) {
        console.error("Failed to notify reminders", e);
        return { success: false, error: e.message };
    }
}
