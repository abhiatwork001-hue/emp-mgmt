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
            const managementActions = [
                // Employee Management
                'CREATE_EMPLOYEE', 'UPDATE_EMPLOYEE', 'ARCHIVE_EMPLOYEE', 'ASSIGN_EMPLOYEES_TO_STORE',
                'ASSIGN_MANAGER', 'ASSIGN_SUB_MANAGER', 'REMOVE_STORE_MANAGER',

                // Store & Department Management
                'CREATE_STORE', 'UPDATE_STORE', 'ARCHIVE_STORE',
                'CREATE_GLOBAL_DEPT', 'UPDATE_GLOBAL_DEPT', 'ARCHIVE_GLOBAL_DEPT',
                'ASSIGN_GLOBAL_DEPT_HEAD', 'ASSIGN_GLOBAL_DEPT_SUBHEAD', 'REMOVE_GLOBAL_DEPT_HEAD', 'REMOVE_GLOBAL_DEPT_SUBHEAD',
                'CREATE_STORE_DEPARTMENT', 'DELETE_STORE_DEPARTMENT', 'ASSIGN_EMPLOYEES_TO_DEPT', 'REMOVE_DEPT_EMPLOYEE',
                'ASSIGN_DEPT_HEAD', 'REMOVE_DEPT_HEAD', 'ASSIGN_DEPT_SUBHEAD', 'REMOVE_DEPT_SUBHEAD',

                // Recipe & Position Management
                'CREATE_RECIPE', 'UPDATE_RECIPE', 'ARCHIVE_RECIPE', 'DELETE_RECIPE', 'RESTORE_RECIPE',
                'CREATE_POSITION', 'UPDATE_POSITION', 'REMOVE_FROM_POSITION'
            ];

            const operationalActions = [
                // Requests & Approvals
                'VACATION_REQUEST', 'VACATION_APPROVED', 'VACATION_REJECTED',
                'ABSENCE_REQUEST', 'ABSENCE_APPROVED', 'ABSENCE_REJECTED',
                'SHIFT_SWAP_REQUEST', 'SHIFT_SWAP_APPROVED', 'SHIFT_SWAP_REJECTED',

                // Schedule Management
                'CREATE_SCHEDULE', 'UPDATE_SCHEDULE', 'SEND_FOR_APPROVAL', 'REJECT_SCHEDULE', 'APPROVE_SCHEDULE', 'PUBLISH_SCHEDULE',

                // Communication & Feedback
                'NOTICE_CREATED', 'NOTICE_UPDATED', 'NOTICE_COMMENT',
                'REPORT_PROBLEM', 'PROBLEM_COMMENT', 'SOLVE_PROBLEM',
                'COMMENT_TASK',

                ...managementActions
            ];

            const curStoreId = employee.storeId?._id?.toString() || employee.storeId?.toString();

            const orConditions: any[] = [
                {
                    action: { $in: operationalActions }
                },
                {
                    action: { $in: ['NOTICE_CREATED', 'NOTICE_UPDATED'] },
                    $or: [
                        { 'details.targetScope': 'global' },
                        { 'details.visibleToAdmin': true },
                        { 'details.targetId': curStoreId }
                    ]
                },
                {
                    action: { $in: ['CREATE_TASK', 'UPDATE_TASK', 'COMPLETE_TASK', 'SUBMIT_TASK_FILE'] },
                    $or: [
                        { 'details.isGlobal': true },
                        { performedBy: userId }, // Show if they did it
                        { 'details.storeId': curStoreId },
                        { storeId: { $exists: true, $ne: null } } // If log has a storeId (high level usually)
                    ]
                }
            ];

            query.$and = [
                { $or: orConditions },
                { targetModel: { $ne: 'Message' } }
            ];

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
        return { success: false, error: "Failed to fetch logs" };
    }
}
