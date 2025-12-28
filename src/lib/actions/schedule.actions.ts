"use server";

import dbConnect from "@/lib/db";
import { Schedule, StoreDepartment, Employee, Store, AbsenceRecord } from "@/lib/models";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { triggerNotification } from "@/lib/actions/notification.actions";

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
        // Optionally filter by employeeIds present in the schedule if performance is an issue
    }).lean();

    return JSON.parse(JSON.stringify({ ...schedule, absences }));
}

export async function createSchedule(data: any) {
    await dbConnect();
    const newSchedule = await Schedule.create(data);
    revalidatePath("/dashboard/schedules");
    return JSON.parse(JSON.stringify(newSchedule));
}

export async function updateSchedule(id: string, data: any) {
    await dbConnect();
    const updated = await Schedule.findByIdAndUpdate(id, data, { new: true }).lean();
    revalidatePath(`/dashboard/schedules/${id}`);
    revalidatePath("/dashboard/schedules");
    return JSON.parse(JSON.stringify(updated));
}

export async function updateScheduleStatus(id: string, status: string, userId: string, comment?: string) {
    await dbConnect();


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
        .lean();

    revalidatePath(`/dashboard/schedules/${id}`);

    // Notification Logic
    try {
        const actor = await Employee.findById(userId).select("firstName lastName");
        const actorName = actor ? `${actor.firstName} ${actor.lastName}` : "Someone";

        const storeName = (updated.storeId as any)?.name || "Store";
        const deptName = (updated.storeDepartmentId as any)?.name || "Department";
        let title = "";
        let message = "";

        if (status === 'pending') {
            title = "Schedule Sent for Approval";
            message = `${actorName} sent a schedule for approval from ${storeName} and ${deptName}.`;

            // Notify Store Managers
            const store = await Store.findById(updated.storeId._id || updated.storeId).lean();
            if (store) {
                const recipients = [...(store.managers || []), ...(store.subManagers || [])].map(id => id.toString());
                const finalRecipients = recipients.filter(r => r !== userId);



                if (finalRecipients.length > 0) {
                    await triggerNotification({
                        title,
                        message,
                        type: "info",
                        category: "schedule",
                        recipients: finalRecipients,
                        link: `/dashboard/schedules/${id}`,
                        senderId: userId,
                        relatedStoreId: (updated.storeId as any)?._id,
                        relatedDepartmentId: (updated.storeDepartmentId as any)?._id
                    });
                }

            }
        } else if (status === 'published') {
            title = "Schedule Published";
            message = `The schedule for ${deptName} at ${storeName} has been published by ${actorName}.`;

            const employeeIds = new Set<string>();
            updated.days.forEach((day: any) => {
                day.shifts.forEach((shift: any) => {
                    shift.employees.forEach((emp: any) => {
                        // Handle both populated and unpopulated ID
                        const empId = emp._id ? emp._id.toString() : emp.toString();
                        employeeIds.add(empId);
                    });
                });
            });
            const recipients = Array.from(employeeIds).filter(r => r !== userId);

            if (recipients.length > 0) {
                await triggerNotification({
                    title,
                    message,
                    type: "success",
                    category: "schedule",
                    recipients: recipients,
                    link: `/dashboard/schedules/${id}`,
                    senderId: userId,
                    relatedStoreId: (updated.storeId as any)?._id,
                    relatedDepartmentId: (updated.storeDepartmentId as any)?._id
                });
            }
        } else if (status === 'rejected') {
            title = "Schedule Rejected";
            message = `The schedule for ${deptName} was rejected by ${actorName}. Reason: ${comment || "No reason provided"}.`;

            if (updated.createdBy && (updated.createdBy._id ? updated.createdBy._id.toString() : updated.createdBy.toString()) !== userId) {
                await triggerNotification({
                    title,
                    message,
                    type: "error",
                    category: "schedule",
                    recipients: [updated.createdBy._id ? updated.createdBy._id.toString() : updated.createdBy.toString()],
                    link: `/dashboard/schedules/${id}`,
                    senderId: userId,
                    relatedStoreId: (updated.storeId as any)?._id,
                    relatedDepartmentId: (updated.storeDepartmentId as any)?._id
                });
            }
        }
    } catch (e) {
        console.error("Error sending notification:", e);
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

    const newSchedule = await Schedule.create({
        storeId,
        storeDepartmentId,
        weekNumber,
        year,
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

    return JSON.parse(JSON.stringify(newSchedule));
}

// Helper to get ISO week number
function getISOWeekNumber(d: Date) {
    const date = new Date(d.valueOf());
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return { week: weekNo, year: date.getUTCFullYear() };
}

export async function copyPreviousSchedule(currentScheduleId: string, userId: string) {
    await dbConnect();

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

    console.log(`[CopySchedule] Current Start: ${currentStart.toISOString()}, Looking for Prev Start between: ${searchStart.toISOString()} and ${searchEnd.toISOString()}`);

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
        throw new Error(`No schedule found for the previous week (Expected start around ${targetPrevStart.toDateString()})`);
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
                comment: `Copied from Week starting ${new Date(prevSchedule.dateRange.startDate).toLocaleDateString()}`,
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

    revalidatePath(`/dashboard/schedules/${currentScheduleId}`);
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
    const schedules = await Schedule.find({
        year,
        weekNumber,
        "days.shifts.employees": employeeId
    })
        .populate("storeId", "name")
        .populate("storeDepartmentId", "name")
        .lean();

    if (!schedules || schedules.length === 0) return null;

    // 3. Merge Shifts
    const daysMap = new Map();

    schedules.forEach((sch: any) => {
        const storeName = sch.storeId?.name || "Unknown Store";
        const deptName = sch.storeDepartmentId?.name || "Unknown Dept";

        sch.days.forEach((day: any) => {
            const dateStr = new Date(day.date).toISOString().split('T')[0];

            if (!daysMap.has(dateStr)) {
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

            const userShifts = day.shifts.filter((s: any) =>
                s.employees.some((e: any) => (e._id ? e._id.toString() : e.toString()) === employeeId)
            );

            userShifts.forEach((s: any) => {
                dayObj.shifts.push({
                    ...s,
                    storeName,
                    deptName
                });
            });
        });
    });

    const sortedDays = Array.from(daysMap.values()).sort((a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return JSON.parse(JSON.stringify({
        weekNumber,
        year,
        dateRange: schedules[0].dateRange,
        days: sortedDays
    }));
}

export async function getDashboardData(date: Date = new Date()) {
    await dbConnect();
    const { Store, StoreDepartment } = require("@/lib/models");

    // 1. Calculate Week/Year
    const d = new Date(date);
    const { week, year } = getISOWeekNumber(d);

    // 2. Fetch all active Stores & Departments
    const stores = await Store.find({ active: true }).lean();
    const storeIds = stores.map((s: any) => s._id);

    // 3. Fetch all Schedules for this week
    const schedules = await Schedule.find({
        storeId: { $in: storeIds },
        year,
        weekNumber: week
    }).lean();

    // 4. Aggregate Data
    const summary = {
        total: 0,
        inProgress: 0,
        pending: 0,
        approved: 0
    };

    // Helper map for quick schedule lookup by department
    const scheduleMap = new Map();
    schedules.forEach((sch: any) => {
        scheduleMap.set(sch.storeDepartmentId.toString(), sch);

        // Update Summary
        summary.total++;
        if (sch.status === 'draft') summary.inProgress++;
        if (sch.status === 'review') summary.pending++;
        if (sch.status === 'approved' || sch.status === 'published') summary.approved++;
    });

    // 5. Structure Response
    // We need to fetch departments for each store manually or via lookup if we want to be efficient
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
                        const start = new Date(`1970-01-01T${shift.startTime}Z`);
                        const end = new Date(`1970-01-01T${shift.endTime}Z`);
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

    return JSON.parse(JSON.stringify({
        summary,
        stores: storesWithData,
        weekInfo: { week, year }
    }));
}

