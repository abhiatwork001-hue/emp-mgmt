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
import crypto from "crypto";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
const MANAGE_SCHEDULE_ROLES = ["store_manager", "store_department_head", "department_head", "admin", "owner", "super_user", "hr", "tech"];

// Strict Write Access Validation
export async function checkSchedulePermission(userId: string, targetStoreId?: string, targetStoreDeptId?: string) {
    const { GlobalDepartment } = await import("@/lib/models");
    const employee = await getEmployeeById(userId);
    if (!employee) throw new Error("User not found");
    // ... (rest of the function is expected to be the same, but since I'm renaming, I'll just change the function name line)

    const roles = (employee.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));

    // 1. Super Admin Roles (Full Access)
    if (roles.some((r: string) => ["admin", "owner", "hr", "tech", "super_user"].includes(r))) {
        return true;
    }

    // 2. Store Manager (Access to ALL depts in their store)
    if (roles.includes("store_manager")) {
        const userStoreId = employee.storeId?._id?.toString() || employee.storeId?.toString();
        if (targetStoreId && targetStoreId !== userStoreId) {
            const locale = await getLocale();
            redirect(`/${locale}/access-denied`);
        }
        // Store Manager can manage ANY department in their store
        return true;
    }

    // 3. Store Department Head (Access to ONLY their dept in their store)
    if (roles.includes("store_department_head")) {
        const userStoreId = employee.storeId?._id?.toString() || employee.storeId?.toString();
        const userDeptId = employee.storeDepartmentId?._id?.toString() || employee.storeDepartmentId?.toString();

        if (targetStoreId && targetStoreId !== userStoreId) {
            const locale = await getLocale();
            redirect(`/${locale}/access-denied`);
        }
        if (targetStoreDeptId && targetStoreDeptId !== userDeptId) {
            const locale = await getLocale();
            redirect(`/${locale}/access-denied`);
        }
        // If they try to create/edit, they MUST provide storeDeptId usually.
        // If checking generic permission without specific target, we pass.
        return true;
    }

    // 4. Global Department Head (Access to their Global Dept across ALL stores)
    if (roles.includes("department_head")) {
        // Find which Global Department they head
        const ledGlobalDepts = await GlobalDepartment.find({ departmentHead: userId }).select('_id');
        const ledGlobalDeptIds = ledGlobalDepts.map((d: any) => d._id.toString());

        if (ledGlobalDeptIds.length === 0) {
            const locale = await getLocale();
            redirect(`/${locale}/access-denied`);
        }

        // If targetStoreDeptId is provided, check if it belongs to one of their global depts
        if (targetStoreDeptId) {
            const targetDept = await StoreDepartment.findById(targetStoreDeptId).select('globalDepartmentId');
            if (!targetDept || !ledGlobalDeptIds.includes(targetDept.globalDepartmentId?.toString())) {
                const locale = await getLocale();
                redirect(`/${locale}/access-denied`);
            }
        }
        // Note: Global Heads can see multiple stores, so we don't restrict targetStoreId strictly unless logic demands it.
        return true;
    }

    const locale = await getLocale();
    redirect(`/${locale}/access-denied`);
}

export async function getSchedules(storeId?: string, departmentId?: string, year?: number, week?: number) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        // Not logged in -> Login
        redirect("/login");
    }

    const currentUser = await getEmployeeById((session.user as any).id);
    const roles = (currentUser?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
    const isGlobalAdmin = roles.some((r: string) => ["admin", "owner", "hr", "tech", "super_user"].includes(r));
    const isStoreManager = roles.includes("store_manager");
    const isStoreDeptHead = roles.includes("store_department_head");
    const isGlobalDeptHead = roles.includes("department_head");

    const query: any = {};

    // 1. Store Filters
    if (storeId) {
        query.storeId = storeId;
    }

    // 2. Security Scoping
    if (isGlobalAdmin) {
        // Full access
    } else if (isGlobalDeptHead) {
        // Access all stores, but only departments matching their Global Department
        const { GlobalDepartment, StoreDepartment } = await import("@/lib/models");
        const ledGlobalDepts = await GlobalDepartment.find({ departmentHead: currentUser._id }).select('_id');
        const ledGlobalDeptIds = ledGlobalDepts.map((d: any) => d._id);

        // Find all StoreDepartments linked to these GlobalDepartments
        const allowedStoreDepts = await StoreDepartment.find({ globalDepartmentId: { $in: ledGlobalDeptIds } }).distinct('_id');

        if (departmentId) {
            if (!allowedStoreDepts.find((id: any) => id.toString() === departmentId)) return [];
            query.storeDepartmentId = departmentId;
        } else {
            query.storeDepartmentId = { $in: allowedStoreDepts };
        }

    } else if (isStoreManager) {
        // Access OWN store, ALL depts
        const userStoreId = currentUser.storeId?._id?.toString() || currentUser.storeId?.toString();
        if (storeId && storeId !== userStoreId) return [];
        query.storeId = userStoreId;

    } else if (isStoreDeptHead) {
        // Access OWN store, OWN dept
        const userStoreId = currentUser.storeId?._id?.toString() || currentUser.storeId?.toString();
        const userDeptId = currentUser.storeDepartmentId?._id?.toString() || currentUser.storeDepartmentId?.toString();

        if (storeId && storeId !== userStoreId) return [];
        if (departmentId && departmentId !== userDeptId) return [];

        query.storeId = userStoreId;
        query.storeDepartmentId = userDeptId;

    } else {
        // Regular Employee: Can see OWN store, OWN dept (View Only)
        // Previously returned [], now fixed.
        const userStoreId = currentUser.storeId?._id?.toString() || currentUser.storeId?.toString();
        const userDeptId = currentUser.storeDepartmentId?._id?.toString() || currentUser.storeDepartmentId?.toString();

        if (storeId && storeId !== userStoreId) return [];
        if (departmentId && departmentId !== userDeptId) return [];

        if (!userStoreId || !userDeptId) return []; // If unassigned, see nothing

        query.storeId = userStoreId;
        query.storeDepartmentId = userDeptId;
    }

    if (departmentId && !query.storeDepartmentId) query.storeDepartmentId = departmentId;
    if (year) query.year = year;
    if (week) query.weekNumber = week;

    const schedules = await Schedule.find(query)
        .populate("storeDepartmentId", "name")
        .populate("createdBy", "firstName lastName")
        .sort({ year: -1, weekNumber: -1 })
        .lean();

    return JSON.parse(JSON.stringify(schedules));
}

// System Action: Check Deadlines
export async function checkScheduleDeadlines() {
    await dbConnect();
    const { Company } = await import("@/lib/models"); // Lazy load

    // 1. Get Companies with alerts enabled
    const companies = await Company.find({
        active: true,
        "settings.scheduleRules.alertEnabled": true
    });

    const now = new Date();
    const currentDay = now.getUTCDay(); // 0-6 (Sun-Sat)
    // Adjust to Monday=0, Sunday=6 to match UI logic usually, but let's check schema. 
    // Schema default says deadlineDay: 2 (Tuesday). User usually expects standard JS days or ISO?
    // Let's assume standard JS: 0=Sun, 1=Mon, 2=Tue...

    // We want to check NEXT WEEK's schedule status.
    // Calculate Next Week Number
    const nextWeekDate = new Date();
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    const nextWeekNum = getISOWeekNumber(nextWeekDate);
    const nextWeekYear = nextWeekDate.getFullYear();

    for (const company of companies) {
        const deadlineDay = company.settings?.scheduleRules?.deadlineDay ?? 2; // Default Tuesday

        // Only run on the deadline day (or after? safer to run on the day)
        // If we run this via CRON daily, we check if Today == DeadlineDay
        // For testing, we might want to force it, but let's respect logic.
        /* 
           NOTE: Since we don't have a real cron, this might be triggered manually or via page load. 
           We will assume the caller knows when to call it, or we check "Is Late".
           "gets alert, when stores... didnt sent schedule for approval around deadline day"
        */

        // Find all Active Store Departments
        const stores = await Store.find({ companyId: company._id, active: true }).select('_id name managers');

        for (const store of stores) {
            const depts = await StoreDepartment.find({ storeId: store._id, active: true });

            for (const dept of depts) {
                // Check if schedule exists for next week
                const schedule = await Schedule.findOne({
                    storeId: store._id,
                    storeDepartmentId: dept._id,
                    year: nextWeekYear,
                    weekNumber: nextWeekNum
                });

                // Rule: If No Schedule OR Schedule is 'draft' -> Alert
                if (!schedule || schedule.status === 'draft') {
                    // Alert needed!

                    // 1. Whom to alert?
                    // "StoreManager, StoreDepartment gets alert if they are on deadline"
                    // "Hr, owner, admins and tech gets alert when... didnt sent... around deadline"

                    // Let's notify Store Manager & Dept Head FIRST (Warning)
                    const deptHeadIds = dept.headOfDepartment?.map((id: any) => id.toString()) || [];
                    const managerIds = store.managers?.map((id: any) => id.toString()) || [];

                    const recipients = [...new Set([...deptHeadIds, ...managerIds])];

                    if (recipients.length > 0) {
                        await triggerNotification({
                            title: "Schedule Deadline Warning",
                            message: `Deadline to submit schedule for ${dept.name} (Week ${nextWeekNum}) is approaching/today!`,
                            type: "warning",
                            category: "schedule",
                            recipients: recipients,
                            link: `/dashboard/schedules`, // Todo: Link to create
                            relatedStoreId: store._id,
                            relatedDepartmentId: dept._id
                        });
                    }

                    // If we are strictly LATE (e.g. today > deadlineDay), Notify Admins
                    // But if today == deadlineDay, maybe just warn managers?
                    // User said: "Hr, owner... gets alert when... didn't sent... around deadline"
                    // Let's notify Admins too if it's strictly deadline day.

                    if (currentDay >= deadlineDay) {
                        const admins = await Employee.find({ roles: { $in: ['admin', 'hr', 'owner', 'tech'] } }).select('_id');
                        const adminIds = admins.map(a => a._id.toString());

                        await triggerNotification({
                            title: "Missing Schedule Alert",
                            message: `Store ${store.name} / ${dept.name} has not submitted Week ${nextWeekNum} schedule yet.`,
                            type: "error",
                            category: "schedule",
                            recipients: adminIds,
                            link: `/dashboard/schedules`,
                            relatedStoreId: store._id,
                            relatedDepartmentId: dept._id
                        });
                    }
                }
            }
        }
    }

    return { success: true };
}

// Strict Read Access Validation
async function validateScheduleReadAccess(userId: string, schedule: any) {
    const { GlobalDepartment, StoreDepartment } = await import("@/lib/models");
    const employee = await getEmployeeById(userId);
    if (!employee) throw new Error("User not found");

    const roles = (employee.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));

    // 1. Super Admin / Global Viewers
    if (roles.some((r: string) => ["admin", "owner", "hr", "tech", "super_user"].includes(r))) {
        return true;
    }

    const userStoreId = employee.storeId?._id?.toString() || employee.storeId?.toString();
    const userDeptId = employee.storeDepartmentId?._id?.toString() || employee.storeDepartmentId?.toString();
    const scheduleStoreId = schedule.storeId?._id?.toString() || schedule.storeId?.toString();
    const scheduleDeptId = schedule.storeDepartmentId?._id?.toString() || schedule.storeDepartmentId?.toString();

    // 2. Global Department Head
    if (roles.includes("department_head")) {
        // Can view if schedule's dept is under their Global Dept
        // Need to check the schedule's department global ID
        // To be safe/fast, we can check if the department matches one of theirs.
        // Or we can rely on `getSchedules` logic which is complex.

        const ledGlobalDepts = await GlobalDepartment.find({ departmentHead: userId }).select('_id');
        const ledGlobalDeptIds = ledGlobalDepts.map((d: any) => d._id.toString());

        // Fetch the schedule's store department to check its global ID
        const schedDept = await StoreDepartment.findById(schedule.storeDepartmentId).select('globalDepartmentId');
        if (schedDept && ledGlobalDeptIds.includes(schedDept.globalDepartmentId?.toString())) {
            return true;
        }
    }

    // 3. Store Manager
    if (roles.includes("store_manager")) {
        // Can view anything in their store
        if (scheduleStoreId === userStoreId) return true;
    }

    // 4. Store Dept Head
    if (roles.includes("store_department_head")) {
        // Can view their own dept
        if (scheduleStoreId === userStoreId && scheduleDeptId === userDeptId) return true;
    }

    // 5. Employee (Default)
    // Can view their own dept
    if (scheduleStoreId === userStoreId && scheduleDeptId === userDeptId) return true;

    const locale = await getLocale();
    redirect(`/${locale}/access-denied`);
}

export async function getScheduleById(id: string) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

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

    // Validate Read Access
    await validateScheduleReadAccess((session.user as any).id, schedule);

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
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

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

    // Validate Read Access
    await validateScheduleReadAccess((session.user as any).id, schedule);

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
    if (!session?.user) redirect("/login");

    // Validate Write Access (Pass target store and dept)
    await checkSchedulePermission((session.user as any).id, data.storeId, data.storeDepartmentId);

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
    revalidatePath("/[locale]/dashboard"); // Refresh main dashboard for real-time health updates
    return JSON.parse(JSON.stringify(newSchedule));
}

export async function updateSchedule(id: string, data: any) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    // 1. Fetch current to check context
    const currentSchedule = await Schedule.findById(id).lean();
    if (!currentSchedule) throw new Error("Schedule not found");

    // Validate using the Schedule's Store/Dept, not input data (safe)
    await checkSchedulePermission(
        (session.user as any).id,
        currentSchedule.storeId.toString(),
        currentSchedule.storeDepartmentId.toString()
    );

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

    // Add lastChanges to the update payload
    data.lastChanges = changes.slice(0, 10);

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
    revalidatePath("/[locale]/dashboard"); // Refresh main dashboard for real-time health updates

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

    const schedule = await Schedule.findById(id).select('storeId storeDepartmentId status createdBy');
    if (!schedule) throw new Error("Schedule not found");

    // Standard write check first
    await checkSchedulePermission(userId, schedule.storeId.toString(), schedule.storeDepartmentId.toString());

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
            const locale = await getLocale();
            redirect(`/${locale}/access-denied`);
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
    // If publishing, maybe we want to keep the last changes visible? Or clear them as "this is the new baseline"?
    // User wants to see "Updated". If I publish, it IS updated.
    // Let's NOT clear lastChanges here, unless we want to.
    // Actually, updateScheduleStatus is likely just changing status. The actual 'content' update happens in updateSchedule.
    // If we just approve, content didn't change.

    // Let's leave lastChanges alone in updateScheduleStatus for now, or maybe add a note?
    // The user wants "New" vs "Updated".
    // "New" = Published for the first time? Or status changed to published?
    // "Updated" = Content changed AFTER publish.

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
    revalidatePath("/[locale]/dashboard"); // Refresh main dashboard for real-time health updates

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

    // 1. Get current schedule first needed for validation
    const currentSchedule = await Schedule.findById(currentScheduleId).lean();
    if (!currentSchedule) throw new Error("Schedule not found");

    // Validate
    await checkSchedulePermission(userId, currentSchedule.storeId.toString(), currentSchedule.storeDepartmentId.toString());

    // 2. Calculate target start date for previous week (7 days ago)
    const currentStart = new Date(currentSchedule.dateRange.startDate);
    const targetPrevStart = new Date(currentStart);
    targetPrevStart.setDate(targetPrevStart.getDate() - 7);

    // Create a fuzzy search window (+/- 12 hours) to handle potential timezone offsets
    const searchStart = new Date(targetPrevStart);
    searchStart.setHours(searchStart.getHours() - 12);

    const searchEnd = new Date(targetPrevStart);
    searchEnd.setHours(searchEnd.getHours() + 12);



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

    // 1. Calculate Week/Year for the requested date using shared utility
    const { week: weekNumber, year } = getISOWeekNumber(date);



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
        const employeeData = await Employee.findById(employeeId).select('storeId storeDepartmentId dob');



        if (employeeData?.storeId) {
            const query: any = {
                year,
                weekNumber,
                storeId: employeeData.storeId,
                status: { $in: ['published', 'approved'] }
            };

            if (employeeData.storeDepartmentId) {
                query.storeDepartmentId = employeeData.storeDepartmentId;
            }

            schedules = await Schedule.find(query)
                .populate("storeId", "name")
                .populate("storeDepartmentId", "name")
                .lean();


            if (schedules?.length > 0) {

            }
        }
    }

    const employeeObj = await Employee.findById(employeeId).select('dob');
    const dob = employeeObj?.dob;

    if (!schedules || schedules.length === 0) return JSON.parse(JSON.stringify({ weekNumber, year, days: [], dob, isNew: false, isUpdated: false, lastChanges: [] }));

    // Determine Status flags based on the PRIMARY schedule (first one found)
    const primarySchedule = schedules[0];
    const now = new Date();
    const publishedAt = primarySchedule.approvalHistory?.find((h: any) => h.status === 'published')?.createdAt;
    const updatedAt = primarySchedule.updatedAt ? new Date(primarySchedule.updatedAt) : new Date(primarySchedule.createdAt || now);

    const isRecent = (date: Date) => (now.getTime() - new Date(date).getTime()) < (48 * 60 * 60 * 1000);

    // "New": Published in last 48h AND no recent content updates log
    const isNew = publishedAt && isRecent(publishedAt) && (!primarySchedule.lastChanges || primarySchedule.lastChanges.length === 0);

    // "Updated": Recent update timestamp AND has logged changes
    const isUpdated = isRecent(updatedAt) && primarySchedule.lastChanges && primarySchedule.lastChanges.length > 0;

    const lastChanges = primarySchedule.lastChanges || [];



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

    const scheduleForLink = schedules.find((s: any) => {
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
        primaryScheduleSlug: scheduleForLink?.slug || primarySchedule?.slug,
        dob,
        isNew,
        isUpdated,
        lastChanges: isUpdated ? lastChanges : []
    }));
}

export async function getDashboardData(date: Date = new Date(), storeIdFilter?: string) {
    await dbConnect();
    // Imports are at top level
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    const currentUser = await getEmployeeById((session.user as any).id);
    const roles = (currentUser?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));

    const isGlobalAdmin = roles.some((r: string) => ["admin", "owner", "hr", "tech", "super_user"].includes(r));
    const isStoreManager = roles.includes("store_manager");
    const isStoreDeptHead = roles.includes("store_department_head");
    const isGlobalDeptHead = roles.includes("department_head");



    // 1. Calculate Week/Year
    const d = new Date(date);
    const { week, year } = getISOWeekNumber(d);

    // 2. Fetch active Stores (Secured Query)
    const storeQuery: any = { active: true };
    const deptQuery: any = { active: true }; // To filter departments later

    if (isGlobalAdmin) {
        if (storeIdFilter) storeQuery._id = storeIdFilter;
    } else if (isStoreManager) {
        storeQuery._id = currentUser.storeId?._id || currentUser.storeId;
    } else if (isStoreDeptHead) {
        storeQuery._id = currentUser.storeId?._id || currentUser.storeId;
        deptQuery._id = currentUser.storeDepartmentId?._id || currentUser.storeDepartmentId; // Strict Dept Filter
    } else if (isGlobalDeptHead) {
        // Find their global departments
        const { GlobalDepartment } = await import("@/lib/models");
        const ledGlobalDepts = await GlobalDepartment.find({ departmentHead: currentUser._id }).select('_id');
        const ledGlobalDeptIds = ledGlobalDepts.map((d: any) => d._id);

        // Find authorized Store Departments
        const allowedStoreDepts = await StoreDepartment.find({ globalDepartmentId: { $in: ledGlobalDeptIds } }).distinct('_id');
        deptQuery._id = { $in: allowedStoreDepts }; // Restrict Departments

        // Don't restrict stores strictly, but stores will be filtered naturally by departments existing? 
        // No, we fetch stores then depts. We should only fetch stores that HAVE these departments to avoid empty cards?
        // Or fetch all stores and filter out empty ones later.
        if (storeIdFilter) storeQuery._id = storeIdFilter;
    } else {
        // Employee / No Role -> Show nothing or just own context?
        // Let's fallback to own store/dept same as View
        const userStoreId = currentUser.storeId?._id || currentUser.storeId;
        const userDeptId = currentUser.storeDepartmentId?._id || currentUser.storeDepartmentId;
        if (userStoreId && userDeptId) {
            storeQuery._id = userStoreId;
            deptQuery._id = userDeptId;
        } else {
            return null; // No access
        }
    }

    const stores = await Store.find(storeQuery).lean();
    const storeIds = stores.map((s: any) => s._id);

    // 3. Fetch all Schedules for this week
    // We restrict schedules to the accessible stores/depts
    const scheduleQuery: any = {
        storeId: { $in: storeIds },
        year,
        weekNumber: week
    };
    if (deptQuery._id) scheduleQuery.storeDepartmentId = deptQuery._id;



    const schedules = await Schedule.find(scheduleQuery).lean();

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
        // Apply Department Query + Store ID
        const finalDeptQuery = { ...deptQuery, storeId: store._id };
        const departments = await StoreDepartment.find(finalDeptQuery).lean();

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

export async function getPendingSchedules(storeId?: string, storeDepartmentId?: any) {
    await dbConnect();
    const query: any = { status: 'pending' };
    if (storeId) query.storeId = storeId;
    if (storeDepartmentId) query.storeDepartmentId = storeDepartmentId;

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

    // Calculate Next Week
    const nextWeekDate = new Date();
    nextWeekDate.setUTCDate(nextWeekDate.getUTCDate() + 7);
    const day = nextWeekDate.getUTCDay() || 7;
    nextWeekDate.setUTCDate(nextWeekDate.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(nextWeekDate.getUTCFullYear(), 0, 1));
    const nextWeekNumber = Math.ceil((((nextWeekDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    const nextYear = nextWeekDate.getUTCFullYear();

    try {
        if (type === 'store') {
            const managers = await Employee.find({
                storeId: { $in: entityIds },
                roles: { $in: ['store_manager', 'Store Manager'] },
                active: true
            }).select('_id firstName lastName storeId');

            for (const manager of managers) {
                // Check if schedule is already published for NEXT week
                const exists = await Schedule.exists({
                    storeId: manager.storeId,
                    year: nextYear,
                    weekNumber: nextWeekNumber,
                    status: 'published'
                });

                if (!exists) {
                    await triggerNotification({
                        title: "Urgent: Schedule Submission Overdue",
                        message: `Schedule for Next Week (Week ${nextWeekNumber}) is overdue. Please publish it immediately.`,
                        type: "warning",
                        category: "schedule",
                        link: "/dashboard/schedules",
                        recipients: [manager._id.toString()],
                        senderId: (session.user as any).id,
                        relatedStoreId: manager.storeId
                    });
                }
            }
            recipientsCount = managers.length;
        } else {
            const heads = await Employee.find({
                storeDepartmentId: { $in: entityIds },
                roles: { $in: ['store_department_head', 'Department Head'] },
                active: true
            }).select('_id firstName lastName storeDepartmentId storeId');

            for (const head of heads) {
                // Check if schedule is already published for NEXT week for this department
                const exists = await Schedule.exists({
                    storeId: head.storeId,
                    storeDepartmentId: head.storeDepartmentId,
                    year: nextYear,
                    weekNumber: nextWeekNumber,
                    status: 'published'
                });

                if (!exists) {
                    await triggerNotification({
                        title: "Urgent: Schedule Submission Overdue",
                        message: `Schedule for Next Week (Week ${nextWeekNumber}) for your department is overdue.`,
                        type: "warning",
                        category: "schedule",
                        link: "/dashboard/schedules",
                        recipients: [head._id.toString()],
                        senderId: (session.user as any).id,
                        relatedStoreId: head.storeId,
                        relatedDepartmentId: head.storeDepartmentId
                    });
                }
            }
            recipientsCount = heads.length;
        }

        return { success: true, count: recipientsCount };
    } catch (e: any) {
        console.error("Failed to notify reminders", e);
        return { success: false, error: e.message };
    }
}
