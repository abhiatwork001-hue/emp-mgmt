"use server";

import dbConnect from "@/lib/db";
import { Employee, AbsenceRecord, AbsenceRequest } from "@/lib/models";
import { Types } from "mongoose";
import { startOfYear, endOfYear, eachMonthOfInterval, format } from "date-fns";

export interface AbsenceAnalyticsFilter {
    storeId?: string;
    storeDepartmentId?: string;
    year: number;
}

interface StatItem {
    name: string;
    approved: number;
    pending: number;
    active: number;
    away: number;
}

interface StoreStatItem extends StatItem {
    departments: { [key: string]: StatItem };
}

export async function getAbsenceAnalytics(filters: AbsenceAnalyticsFilter) {
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
        .select("storeId storeDepartmentId firstName lastName")
        .populate("storeId", "name active")
        .populate("storeDepartmentId", "name active globalDepartmentId")
        .lean();

    const empIds = employees.map((e: any) => e._id);

    // 2. Metrics (Total Absences Approved vs Pending)
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 0, 1));

    const [approvedRecords, pendingRequests] = await Promise.all([
        AbsenceRecord.find({
            employeeId: { $in: empIds },
            date: { $gte: yearStart, $lte: yearEnd }
        }).lean(),
        AbsenceRequest.find({
            employeeId: { $in: empIds },
            status: 'pending',
            date: { $gte: yearStart, $lte: yearEnd }
        }).lean()
    ]);

    const totalApproved = approvedRecords.length;
    const totalPending = pendingRequests.length;

    // 3. Trends (Requested vs Approved)
    const monthlyTrend: { [key: string]: { approved: number, requested: number } } = {};
    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
    months.forEach(m => monthlyTrend[format(m, 'MMM')] = { approved: 0, requested: 0 });

    approvedRecords.forEach((rec: any) => {
        const mo = format(new Date(rec.date), 'MMM');
        if (monthlyTrend[mo]) monthlyTrend[mo].approved += 1;
    });

    // For requested, we count ALL requests (pending, approved, rejected) that were MADE for this year
    const allRequestsForYear = await AbsenceRequest.find({
        employeeId: { $in: empIds },
        date: { $gte: yearStart, $lte: yearEnd }
    }).lean();

    allRequestsForYear.forEach((req: any) => {
        const mo = format(new Date(req.date), 'MMM');
        if (monthlyTrend[mo]) monthlyTrend[mo].requested += 1;
    });

    const trendData = Object.entries(monthlyTrend).map(([name, data]) => ({ name, ...data }));

    const storeHierarchy: { [key: string]: StoreStatItem } = {};
    const globalDeptStats: { [key: string]: StatItem } = {};

    const awayTodaySet = new Set((await AbsenceRecord.find({
        employeeId: { $in: empIds },
        date: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lte: new Date(new Date().setHours(23, 59, 59, 999))
        }
    }).select("employeeId")).map(r => r.employeeId.toString()));

    // Get Global Dept names
    const { GlobalDepartment } = require("@/lib/models");
    const globalDepts = await GlobalDepartment.find().select("name").lean();
    const globalDeptMap = new Map<string, string>(globalDepts.map((d: any) => [d._id.toString(), String(d.name || "")]));

    employees.forEach((e: any) => {
        const isAway = awayTodaySet.has(e._id.toString());
        const empApprovedCount = approvedRecords.filter(r => r.employeeId.toString() === e._id.toString()).length;
        const empPendingCount = pendingRequests.filter(r => r.employeeId.toString() === e._id.toString()).length;

        // Store & Store Dept
        const sId = e.storeId?._id?.toString() || "unknown";
        const sName = e.storeId?.name || "Unknown Store";
        const dId = e.storeDepartmentId?._id?.toString() || "no-dept";
        const dName = e.storeDepartmentId?.name || "No Dept";

        // Skip archived stores/depts
        if (e.storeId && e.storeId.active === false) return;
        if (e.storeDepartmentId && e.storeDepartmentId.active === false) return;

        if (!storeHierarchy[sId]) {
            storeHierarchy[sId] = { name: sName, approved: 0, pending: 0, active: 0, away: 0, departments: {} };
        }
        storeHierarchy[sId].approved += empApprovedCount;
        storeHierarchy[sId].pending += empPendingCount;
        if (isAway) storeHierarchy[sId].away++; else storeHierarchy[sId].active++;

        if (!storeHierarchy[sId].departments[dId]) {
            storeHierarchy[sId].departments[dId] = { name: dName, approved: 0, pending: 0, active: 0, away: 0 };
        }
        storeHierarchy[sId].departments[dId].approved += empApprovedCount;
        storeHierarchy[sId].departments[dId].pending += empPendingCount;
        if (isAway) storeHierarchy[sId].departments[dId].away++; else storeHierarchy[sId].departments[dId].active++;

        // Global Dept
        const gId = e.storeDepartmentId?.globalDepartmentId;
        const gName = gId ? (globalDeptMap.get(gId.toString()) || "Unknown Global Dept") : "Unassigned";

        if (!globalDeptStats[gName]) globalDeptStats[gName] = { name: gName, approved: 0, pending: 0, active: 0, away: 0 };
        globalDeptStats[gName].approved += empApprovedCount;
        globalDeptStats[gName].pending += empPendingCount;
        if (isAway) globalDeptStats[gName].away++; else globalDeptStats[gName].active++;
    });

    const hierarchicalBreakdown = Object.values(storeHierarchy).map(s => ({
        ...s,
        departments: Object.values(s.departments).sort((a, b) => b.approved - a.approved)
    })).sort((a, b) => b.approved - a.approved);

    const byGlobalDept = Object.values(globalDeptStats).sort((a, b) => b.approved - a.approved);

    return {
        metrics: {
            totalApproved,
            totalPending,
            totalAway: awayTodaySet.size,
            totalActive: employees.length - awayTodaySet.size
        },
        trends: trendData,
        breakdowns: {
            hierarchical: hierarchicalBreakdown,
            byGlobalDept
        }
    };
}
