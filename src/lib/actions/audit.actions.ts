"use server";

import dbConnect from "@/lib/db";
import { ActionLog, Employee } from "@/lib/models";
import { getAugmentedRolesAndPermissions } from "@/lib/auth-utils";

interface GetAuditLogsParams {
    userId: string;
    page?: number;
    limit?: number;
    filters?: any;
}

export async function getAuditLogs({ userId, page = 1, limit = 20, filters = {} }: GetAuditLogsParams) {
    try {
        await dbConnect();

        const employee = await Employee.findById(userId).populate('storeId').lean() as any;
        if (!employee) return { success: false, error: "Unauthorized" };

        const { roles } = getAugmentedRolesAndPermissions(employee, null);

        const isSuperAdmin = roles.includes('tech') || roles.includes('super_user');
        const isOwner = roles.includes('owner');
        const isHR = roles.includes('hr');
        const isAdmin = roles.includes('admin');

        let query: any = { ...filters };

        // --- RBAC LOGIC ---
        if (isSuperAdmin) {
            // unrestricted
        } else if (isOwner || isHR || isAdmin) {
            // Restricted View:
            // 1. Operational Events Only
            query.action = {
                $in: [
                    'VACATION_REQUEST', 'VACATION_APPROVED', 'VACATION_REJECTED',
                    'ABSENCE_REQUEST', 'ABSENCE_APPROVED', 'ABSENCE_REJECTED',
                    'SHIFT_SWAP_REQUEST', 'SHIFT_SWAP_APPROVED', 'SHIFT_SWAP_REJECTED',
                    'REPORT_PROBLEM',
                    'NOTICE_CREATED', 'NOTICE_UPDATED'
                ]
            };
            // 2. EXPLICITLY EXCLUDE MESSAGES (Redundant with action list above, but good for safety)
            query.targetModel = { $ne: 'Message' };

        } else {
            // Regular employees see nothing (or maybe their own?)
            // For now, strict:
            return { success: false, error: "Access Denied" };
        }

        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            ActionLog.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('performedBy', 'firstName lastName image email')
                .populate('storeId', 'name slug')
                .lean(),
            ActionLog.countDocuments(query)
        ]);

        return {
            success: true,
            logs: JSON.parse(JSON.stringify(logs)),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };

    } catch (error) {
        console.error("Error fetching audit logs:", error);
        return { success: false, error: "Failed to fetch logs" };
    }
}
