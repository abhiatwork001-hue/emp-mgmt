"use server";

import dbConnect from "../db";
import { ActionLog } from "../models";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";

interface LogData {
    action: string;
    performedBy: string;
    storeId?: string;
    targetId?: string;
    targetModel?: string;
    details?: any;
}

interface LogFilterOptions {
    startDate?: string;
    endDate?: string;
    action?: string;
    actorId?: string;
    storeId?: string;
    limit?: number;
    skip?: number;
    userId?: string; // To scope to a specific user (Employee View)
    userRoles?: string[]; // To handle Tech vs Owner/HR permissions
    targetId?: string;
}

export async function logAction(data: LogData) {
    try {
        await dbConnect();

        const isValidObjectId = mongoose.Types.ObjectId.isValid(data.performedBy);

        await ActionLog.create({
            action: data.action,
            performedBy: isValidObjectId ? data.performedBy : undefined,
            storeId: data.storeId,
            targetId: data.targetId,
            targetModel: data.targetModel,
            details: isValidObjectId ? data.details : { ...data.details, systemActor: data.performedBy }
        });

        // Uncomment if you have a log view page to revalidate
        // revalidatePath('/dashboard/admin/logs'); 
    } catch (error) {
        // Don't throw, we don't want to break the main flow if logging fails
    }
}

export async function getActionLogs(options: LogFilterOptions = {}) {
    try {
        await dbConnect();

        const query: any = {};

        // 1. Date Range Filter
        if (options.startDate || options.endDate) {
            query.createdAt = {};
            if (options.startDate) query.createdAt.$gte = new Date(options.startDate);
            if (options.endDate) query.createdAt.$lte = new Date(options.endDate);
        }

        // 2. Action Filter
        if (options.action) query.action = options.action;

        // 3. Actor Filter
        if (options.actorId) query.performedBy = options.actorId;

        // 4. Store Filter
        if (options.storeId) query.storeId = options.storeId;

        // Target Filter
        if (options.targetId) query.targetId = options.targetId;

        // 5. User Scope (Employee View)
        // If userId is provided, show logs performed by them OR targeting them
        if (options.userId) {
            query.$or = [
                { performedBy: options.userId },
                { targetId: options.userId, targetModel: 'Employee' }
            ];
        }

        // 6. Role-based Visibility (System-level)
        if (options.userRoles) {
            const roles = options.userRoles.map(r => r.toLowerCase().replace(/ /g, '_'));
            const isTech = roles.some(r => /tech|super_user|developer/i.test(r));
            const isOwnerOrHR = roles.some(r => /owner|hr|admin/i.test(r));

            if (!isTech) {
                // If not tech, exclude certain sensitive system actions or tech-only logs
                const techOnlyActions = ['DEBUG_ACTION', 'SYSTEM_MAINTENANCE', 'DELETE_MESSAGE_FOR_ME'];

                if (isOwnerOrHR) {
                    // Owners/HR/Admins see EVERYTHING except purely technical system logs AND private messaging
                    const privateActions = [
                        'SEND_MESSAGE',
                        'READ_MESSAGE',
                        'CREATE_DIRECT_CHAT',
                        'CREATE_GROUP_CHAT',
                        'TOGGLE_REACTION',
                        'DELETE_MESSAGE_FOR_EVERYONE',
                        'DELETE_CONVERSATION',
                        'TOGGLE_MUTE'
                    ];
                    query.action = { $nin: [...techOnlyActions, ...privateActions] };
                } else {
                    // Normal managers/employees only see logs relevant to them
                    if (!options.userId) {
                        query._id = null; // Effectively return nothing if no user scope
                    } else {
                        query.action = { $nin: techOnlyActions };
                    }
                }
            }
        }

        const limit = options.limit || 50;
        const skip = options.skip || 0;

        const logs = await ActionLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('performedBy', 'firstName lastName email image')
            .populate('storeId', 'name')
            .lean();

        return JSON.parse(JSON.stringify(logs));
    } catch (error) {
        return [];
    }
}
