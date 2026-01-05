"use server";

import dbConnect from "@/lib/db";
import { Problem, Employee } from "@/lib/models";

interface GetProblemsOptions {
    userId: string;
    role: string; // 'admin', 'store_manager', 'employee', etc.
    storeId?: string; // For store managers
    status?: 'open' | 'resolved' | 'all';
}

export async function getProblems(options: GetProblemsOptions) {
    try {
        await dbConnect();
        const { userId, role, storeId, status } = options;

        const query: any = {};

        // 1. Status Filter
        if (status && status !== 'all') {
            query.status = status;
        }

        // 2. Role-Based Access Control
        if (['owner', 'admin'].includes(role)) {
            // See ALL problems
        } else if (role === 'store_manager' && storeId) {
            // See problems related to their store
            query.$or = [
                { relatedStoreId: storeId },
                { reportedBy: userId } // And their own reports
            ];
        } else if (role === 'tech') {
            // Tech sees everything
        } else {
            // Regular employees only see their own reports
            query.reportedBy = userId;
        }

        const problems = await Problem.find(query)
            .sort({ createdAt: -1 })
            .populate('reportedBy', 'firstName lastName image')
            .populate('storeId', 'name') // Assuming virtual 'storeId' maps to relatedStoreId or schema has it
            .lean();

        return JSON.parse(JSON.stringify(problems));
    } catch (error) {
        console.error("Failed to fetch problems:", error);
        return [];
    }
}
