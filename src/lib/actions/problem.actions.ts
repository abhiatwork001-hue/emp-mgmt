"use server";

import dbConnect from "@/lib/db";
import { Problem, Employee, Store, StoreDepartment, GlobalDepartment, IEmployee } from "@/lib/models";
import { triggerNotification } from "./notification.actions";
import { revalidatePath } from "next/cache";

interface ReportProblemData {
    reporterId: string;
    recipientRole: string; // 'chef' | 'head_of_department' | 'store_department_head' | 'store_manager' | 'hr' | 'owner' | 'admin'
    priority: string;
    type: string;
    description: string;
    relatedStoreId?: string;
    relatedDepartmentId?: string; // Store Department ID
}

export async function reportProblem(data: ReportProblemData) {
    try {
        await dbConnect();

        // 1. Create the Problem Record
        const newProblem = await Problem.create({
            reporter: data.reporterId,
            recipientRole: data.recipientRole,
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
            // Find users who have this role in their roles array
            // Case insensitive search
            const regex = new RegExp(`^${role}$`, 'i');
            const employees = await Employee.find({ roles: { $in: [regex] }, active: true }).select('_id');
            return employees.map(e => e._id.toString());
        };

        if (data.recipientRole === 'owner') {
            recipientIds = await findByRole('owner');
            // Also include Admins as failsafe or if requested
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
            // If no store context, maybe notify all store managers? No, that's too spammy. Stick to specific store.

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

        } else if (data.recipientRole === 'head_of_department') { // Global Head
            // We need to know WHICH global department.
            // If storeDepartmentId is present, find its parent GlobalDepartment
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
            // Find "Chef" role
            recipientIds = await findByRole('chef');
            // Also finding Head Chefs?
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
                link: '/dashboard', // Eventually link to a problem view
                relatedStoreId: storeId?.toString(),
            });
        }

        revalidatePath('/dashboard');
        return { success: true, problem: JSON.parse(JSON.stringify(newProblem)) };

    } catch (error) {
        console.error("Error reporting problem:", error);
        return { success: false, error: "Failed to report problem" };
    }
}
