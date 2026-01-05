"use server";

import dbConnect from "@/lib/db";
import { Problem, Employee, Store, StoreDepartment, GlobalDepartment, IEmployee } from "@/lib/models";
import { triggerNotification } from "./notification.actions";
import { revalidatePath } from "next/cache";
import { logAction } from "./log.actions";

interface ReportProblemData {
    reporterId: string;
    recipientRole: string; // 'chef' | 'head_of_department' | 'store_department_head' | 'store_manager' | 'hr' | 'owner' | 'admin'
    priority: string;
    type: string;
    title: string;
    description: string;
    relatedStoreId?: string;
    relatedDepartmentId?: string; // Store Department ID
}

export async function reportProblem(data: ReportProblemData) {
    try {
        await dbConnect();

        // 1. Create the Problem Record
        const newProblem = await Problem.create({
            reportedBy: data.reporterId,
            recipientRole: data.recipientRole,
            title: data.title,
            priority: data.priority,
            type: data.type,
            description: data.description,
            relatedStoreId: data.relatedStoreId,
            relatedDepartmentId: data.relatedDepartmentId,
            status: "open"
        });

        // 2. Identify Recipients based on Role/Context
        let recipientIds: string[] = [];
        const reporter = await Employee.findById(data.reporterId).lean() as any;
        if (!reporter) throw new Error("Reporter not found");

        const storeId = data.relatedStoreId || reporter.storeId;
        const deptId = data.relatedDepartmentId || reporter.storeDepartmentId;

        // Helper to find employees by role
        const findByRole = async (role: string) => {
            const regex = new RegExp(`^${role}$`, 'i');
            const employees = await Employee.find({ roles: { $in: [regex] }, active: true }).select('_id');
            return employees.map(e => e._id.toString());
        };

        if (data.recipientRole === 'owner') {
            recipientIds = await findByRole('owner');
            const admins = await findByRole('admin');
            recipientIds = [...new Set([...recipientIds, ...admins])];
        } else if (data.recipientRole === 'hr') {
            recipientIds = await findByRole('hr');
        } else if (data.recipientRole === 'store_manager') {
            if (storeId) {
                const store = await Store.findById(storeId).select('managers subManagers');
                if (store) {
                    recipientIds = [
                        ...(store.managers || []).map((id: any) => id.toString()),
                        ...(store.subManagers || []).map((id: any) => id.toString())
                    ];
                }
            }
        } else if (data.recipientRole === 'store_department_head') {
            if (deptId) {
                const dept = await StoreDepartment.findById(deptId).select('headOfDepartment subHead');
                if (dept) {
                    recipientIds = [
                        ...(dept.headOfDepartment || []).map((id: any) => id.toString()),
                        ...(dept.subHead || []).map((id: any) => id.toString())
                    ];
                }
            }
        } else if (data.recipientRole === 'head_of_department') {
            if (deptId) {
                const storeDept = await StoreDepartment.findById(deptId).select('globalDepartmentId');
                if (storeDept && storeDept.globalDepartmentId) {
                    const globalDept = await GlobalDepartment.findById(storeDept.globalDepartmentId).select('departmentHead subHead');
                    if (globalDept) {
                        recipientIds = [
                            ...(globalDept.departmentHead || []).map((id: any) => id.toString()),
                            ...(globalDept.subHead || []).map((id: any) => id.toString())
                        ];
                    }
                }
            }
        } else if (data.recipientRole === 'chef') {
            recipientIds = await findByRole('chef');
            const headChefs = await findByRole('head_chef');
            recipientIds = [...new Set([...recipientIds, ...headChefs])];
        } else if (data.recipientRole === 'admin') {
            recipientIds = await findByRole('admin');
        }

        // 3. Send Notifications
        if (recipientIds.length > 0) {
            await triggerNotification({
                title: `Problem Reported: ${data.priority.toUpperCase()}`,
                message: `${reporter.firstName} reported a ${data.priority} priority ${data.type} issue: ${data.description.substring(0, 50)}...`,
                type: data.priority === 'high' ? 'error' : 'warning',
                category: 'system',
                recipients: recipientIds,
                senderId: data.reporterId,
                link: `/dashboard/problems/${newProblem._id}`,
                relatedStoreId: storeId?.toString(),
            });
        }

        // Log Action
        await logAction({
            action: 'REPORT_PROBLEM',
            performedBy: data.reporterId,
            targetId: newProblem._id,
            targetModel: 'Problem',
            details: {
                priority: data.priority,
                type: data.type,
                storeId: storeId?.toString()
            }
        });

        revalidatePath('/dashboard');
        return { success: true, problem: JSON.parse(JSON.stringify(newProblem)) };

    } catch (error) {
        console.error("Error reporting problem:", error);
        return { success: false, error: "Failed to report problem" };
    }
}

export async function getProblemById(id: string) {
    try {
        await dbConnect();
        const problem = await Problem.findById(id)
            .populate('reportedBy', 'firstName lastName image email')
            .populate('storeId', 'name')
            .populate('resolvedBy', 'firstName lastName image')
            .lean();
        return JSON.parse(JSON.stringify(problem));
    } catch (error) {
        return null;
    }
}

export async function addComment(problemId: string, userId: string, text: string, images?: string[]) {
    try {
        await dbConnect();
        const user = await Employee.findById(userId).select('firstName lastName image');
        if (!user) throw new Error("User not found");

        const comment = {
            userId,
            userName: `${user.firstName} ${user.lastName}`,
            userImage: user.image,
            text,
            files: images || [],
            createdAt: new Date()
        };

        const problem = await Problem.findByIdAndUpdate(
            problemId,
            { $push: { comments: comment } },
            { new: true }
        );

        // Log Action
        await logAction({
            action: 'PROBLEM_COMMENT',
            performedBy: userId,
            targetId: problemId,
            targetModel: 'Problem',
            details: { text: text.substring(0, 100) }
        });

        revalidatePath(`/dashboard/problems/${problemId}`);
        return { success: true, comment };
    } catch (error) {
        console.error("Failed to add comment:", error);
        return { success: false, error: "Failed to add comment" };
    }
}

export async function resolveProblem(problemId: string, userId: string, notes?: string) {
    try {
        await dbConnect();

        // 1. Fetch first to verify permission
        const existingProblem = await Problem.findById(problemId);
        if (!existingProblem) return { success: false, error: "Problem not found" };

        if (existingProblem.reportedBy.toString() !== userId) {
            return { success: false, error: "Only the original reporter can resolve this problem." };
        }

        const problem = await Problem.findByIdAndUpdate(
            problemId,
            {
                status: "resolved",
                resolvedBy: userId,
                resolvedAt: new Date(),
                resolutionNotes: notes
            },
            { new: true }
        );

        // Log Action
        await logAction({
            action: 'SOLVE_PROBLEM',
            performedBy: userId,
            targetId: problemId,
            targetModel: 'Problem',
            details: { notes: notes?.substring(0, 100) }
        });

        revalidatePath(`/dashboard/problems/${problemId}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to resolve" };
    }
}

interface GetProblemsOptions {
    userId: string;
    role: string; // 'admin', 'store_manager', 'employee', etc.
    storeId?: string; // For store managers
    departmentId?: string; // For department heads
    status?: 'open' | 'resolved' | 'all';
}

export async function getProblems(options: GetProblemsOptions) {
    try {
        await dbConnect();
        const { userId, storeId, departmentId, status } = options;

        // Fetch full employee to get all roles
        const employee = await Employee.findById(userId).select('roles role storeId storeDepartmentId');
        const roles = employee?.roles?.map((r: string) => r.toLowerCase().replace(/ /g, '_')) || [];
        if (employee?.role) roles.push(employee.role.toLowerCase().replace(/ /g, '_'));
        const uniqueRoles = Array.from(new Set(roles as string[]));

        const query: any = {};

        // 1. Status Filter
        if (status && status !== 'all') {
            query.status = status;
        }

        // 2. Role-Based Access Control
        const isGlobalStaff = uniqueRoles.some(r => ['owner', 'admin', 'hr', 'tech', 'super_user'].includes(r));
        const isStoreManager = uniqueRoles.includes('store_manager');
        const isDeptHead = uniqueRoles.some(r => ['store_department_head', 'department_head'].includes(r));

        if (isGlobalStaff) {
            // See ALL problems
        } else if (isStoreManager && storeId) {
            // See problems related to their store
            query.$or = [
                { relatedStoreId: storeId },
                { reportedBy: userId } // And their own reports
            ];
        } else if (isDeptHead && departmentId) {
            // See problems related to their department
            query.$or = [
                { relatedDepartmentId: departmentId },
                { reportedBy: userId }
            ];
        } else {
            // Regular employees only see their reports
            query.reportedBy = userId;
        }

        const problems = await Problem.find(query)
            .sort({ createdAt: -1 })
            .populate('reportedBy', 'firstName lastName image')
            //.populate('relatedStoreId', 'name') // Assuming we want store name
            .limit(50) // Reasonable limit
            .lean();

        return JSON.parse(JSON.stringify(problems));
    } catch (error) {
        console.error("Failed to fetch problems:", error);
        return [];
    }
}
