"use server";

import dbConnect from "@/lib/db";
import { Employee, VacationRecord, VacationRequest } from "@/lib/models";
import { Types } from "mongoose";
import { startOfYear, endOfYear, eachMonthOfInterval, format } from "date-fns";

export interface VacationAnalyticsFilter {
    storeId?: string;
    storeDepartmentId?: string;
    year: number;
}

interface VacationStatItem {
    name: string;
    taken: number;
    liability: number;
    active: number;
    vacation: number;
}

interface VacationStoreStatItem extends VacationStatItem {
    departments: { [key: string]: VacationStatItem };
}

export async function getVacationAnalytics(filters: VacationAnalyticsFilter) {
    await dbConnect();
    const { storeId, year } = filters;

    // 1. Employee Scope
    const empQuery: any = { active: true };
    if (storeId && storeId !== 'all' && storeId !== 'undefined' && storeId !== '000000000000000000000000') {
        empQuery.storeId = typeof storeId === 'string' ? new Types.ObjectId(storeId) : storeId;
    }
    if (filters.storeDepartmentId && filters.storeDepartmentId !== 'all' && typeof filters.storeDepartmentId === 'string' && filters.storeDepartmentId !== 'undefined') {
        empQuery.storeDepartmentId = new Types.ObjectId(filters.storeDepartmentId);
    }

    const employees = await Employee.find(empQuery)
        .select("vacationTracker storeId storeDepartmentId positionId firstName lastName")
        .populate("storeId", "name")
        .populate("storeDepartmentId", "name globalDepartmentId")
        .populate("positionId", "name")
        .lean();

    const empIds = employees.map((e: any) => e._id);
    const pendingReqs = await VacationRequest.find({
        employeeId: { $in: empIds },
        status: 'pending'
    }).select("totalDays").lean();
    let totalPending = pendingReqs.reduce((acc, r) => acc + (r.totalDays || 0), 0);

    // 2. Headcount Metrics
    let totalOwed = 0;
    let totalTaken = 0;
    let totalLiability = 0;

    employees.forEach((e: any) => {
        const tracker = e.vacationTracker;
        if (tracker) {
            const allocation = (tracker.defaultDays || 0) + (tracker.rolloverDays || 0);
            const taken = (tracker.usedDays || 0);
            const liability = tracker.remainingDays !== undefined ? tracker.remainingDays : (allocation - taken);

            totalOwed += allocation;
            totalTaken += taken;
            totalLiability += liability;
        }
    });

    // 3. Trends (Monthly Distribution)
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 0, 1));

    const records = await VacationRecord.find({
        employeeId: { $in: empIds },
        from: { $lte: yearEnd },
        to: { $gte: yearStart },
        status: 'approved'
    }).lean();

    const monthlyTrend: { [key: string]: { approved: number, requested: number } } = {};
    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
    months.forEach(m => monthlyTrend[format(m, 'MMM')] = { approved: 0, requested: 0 });

    records.forEach((rec: any) => {
        const start = new Date(rec.from);
        const end = new Date(rec.to);
        let loop = new Date(start);
        while (loop <= end) {
            if (loop.getFullYear() === year) {
                const mo = format(loop, 'MMM');
                if (monthlyTrend[mo]) monthlyTrend[mo].approved += 1;
            }
            loop.setDate(loop.getDate() + 1);
        }
    });

    const allRequests = await VacationRequest.find({
        employeeId: { $in: empIds },
        requestedFrom: { $lte: yearEnd },
        requestedTo: { $gte: yearStart }
    }).lean();

    allRequests.forEach((req: any) => {
        const start = new Date(req.requestedFrom);
        const end = new Date(req.requestedTo);
        let loop = new Date(start);
        while (loop <= end) {
            if (loop.getFullYear() === year) {
                const mo = format(loop, 'MMM');
                if (monthlyTrend[mo]) monthlyTrend[mo].requested += 1;
            }
            loop.setDate(loop.getDate() + 1);
        }
    });

    const trendData = Object.entries(monthlyTrend).map(([name, data]) => ({ name, ...data }));

    // 4. Hierarchical Breakdown
    const storeHierarchy: { [key: string]: VacationStoreStatItem } = {};
    const globalDeptStats: { [key: string]: VacationStatItem } = {};

    const onVacationSet = new Set((await VacationRecord.find({
        employeeId: { $in: empIds },
        from: { $lte: new Date() },
        to: { $gte: new Date() },
        status: 'approved'
    }).select("employeeId")).map(r => r.employeeId.toString()));

    const { GlobalDepartment } = require("@/lib/models");
    const globalDepts = await GlobalDepartment.find().select("name").lean();
    const globalDeptMap = new Map<string, string>(globalDepts.map((d: any) => [d._id.toString(), String(d.name || "")]));

    employees.forEach((e: any) => {
        const tracker = e.vacationTracker || {};
        const taken = tracker.usedDays || 0;
        const liability = tracker.remainingDays !== undefined ? tracker.remainingDays : ((tracker.defaultDays || 0) + (tracker.rolloverDays || 0) - taken);
        const isOnVacation = onVacationSet.has(e._id.toString());

        const sId = e.storeId?._id?.toString() || "unknown";
        const sName = e.storeId?.name || "Unknown Store";
        const dId = e.storeDepartmentId?._id?.toString() || "no-dept";
        const dName = e.storeDepartmentId?.name || "No Dept";

        if (!storeHierarchy[sId]) {
            storeHierarchy[sId] = { name: sName, taken: 0, liability: 0, active: 0, vacation: 0, departments: {} };
        }
        storeHierarchy[sId].taken += taken;
        storeHierarchy[sId].liability += liability;
        if (isOnVacation) storeHierarchy[sId].vacation++; else storeHierarchy[sId].active++;

        if (!storeHierarchy[sId].departments[dId]) {
            storeHierarchy[sId].departments[dId] = { name: dName, taken: 0, liability: 0, active: 0, vacation: 0 };
        }
        storeHierarchy[sId].departments[dId].taken += taken;
        storeHierarchy[sId].departments[dId].liability += liability;
        if (isOnVacation) storeHierarchy[sId].departments[dId].vacation++; else storeHierarchy[sId].departments[dId].active++;

        const gId = e.storeDepartmentId?.globalDepartmentId;
        const gName = gId ? (globalDeptMap.get(gId.toString()) || "Unknown Global Dept") : "Unassigned";

        if (!globalDeptStats[gName]) globalDeptStats[gName] = { name: gName, taken: 0, liability: 0, active: 0, vacation: 0 };
        globalDeptStats[gName].taken += taken;
        globalDeptStats[gName].liability += liability;
        if (isOnVacation) globalDeptStats[gName].vacation++; else globalDeptStats[gName].active++;
    });

    const hierarchicalBreakdown = Object.values(storeHierarchy).map(s => ({
        ...s,
        departments: Object.values(s.departments).sort((a, b) => b.taken - a.taken)
    })).sort((a, b) => b.taken - a.taken);

    const byGlobalDept = Object.values(globalDeptStats).sort((a, b) => b.taken - a.taken);

    return {
        metrics: {
            totalOwed,
            totalTaken,
            totalLiability,
            totalPending,
            totalOnVacation: onVacationSet.size,
            totalActive: employees.length - onVacationSet.size
        },
        trends: trendData,
        breakdowns: {
            hierarchical: hierarchicalBreakdown,
            byGlobalDept
        }
    };
}
