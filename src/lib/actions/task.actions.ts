"use server";

import connectToDB from "@/lib/db";
import { Employee, Task, Store, StoreDepartment } from "@/lib/models";
import { revalidatePath } from "next/cache";
import { logAction } from "./log.actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// --- Create Task ---
import { triggerNotification } from "@/lib/actions/notification.actions";
import { pusherServer } from "../pusher";

// ... (existing imports, but inserted triggerNotification above)
import { slugify } from "@/lib/utils";
import * as crypto from "crypto";

// --- Create Task ---
export async function createTask(data: {
    title: string;
    description: string;
    priority: string;
    deadline?: string;
    assignments: { type: string; id: string }[];
    todos: string[];
    creatorId: string;
    requiresSubmission?: boolean;
    requiredFileNames?: string[];
}) {
    try {
        await connectToDB();

        // 1. Resolve Assignments into unique User IDs
        const assigneeIds = new Set<string>();

        // Also explicitly add the creator to see the task? 
        // Usually creator wants to track it. We can add them as 'reader' or just query by 'createdBy'.
        // existing getTasksForUser query: assignedTo OR createdBy? 
        // Let's check getTasksForUser... it searches 'assignedTo'. 
        // Queries should probably include createdBy user too if we want them to see it in their list.
        // But for now, let's focus on Assignees.

        for (const assignment of data.assignments) {
            if (assignment.type === 'individual') {
                assigneeIds.add(assignment.id);
            } else if (assignment.type === 'store_all') {
                const employees = await Employee.find({ storeId: assignment.id }).select('_id');
                employees.forEach(e => assigneeIds.add(e._id.toString()));
            } else if (assignment.type === 'store_managers') {
                const employees = await Employee.find({
                    storeId: assignment.id,
                    roles: { $in: ['store_manager', 'Manager'] }
                }).select('_id');
                employees.forEach(e => assigneeIds.add(e._id.toString()));
            } else if (assignment.type === 'store_department_all') {
                const employees = await Employee.find({ storeDepartmentId: assignment.id }).select('_id');
                employees.forEach(e => assigneeIds.add(e._id.toString()));
            } else if (assignment.type === 'global_all') {
                const employees = await Employee.find({}).select('_id');
                employees.forEach(e => assigneeIds.add(e._id.toString()));
            } else if (assignment.type === 'global_role') {
                const employees = await Employee.find({ roles: assignment.id }).select('_id');
                employees.forEach(e => assigneeIds.add(e._id.toString()));
            }
        }

        if (assigneeIds.size === 0) {
            return { success: false, error: "No valid assignees found." };
        }

        // 2. Create Single Shared Task
        const assignedTo = Array.from(assigneeIds).map(id => ({
            type: 'individual',
            id
        }));

        // Generate Slug
        let baseSlug = slugify(data.title);
        let slug = baseSlug;
        while (await Task.findOne({ slug })) {
            slug = `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`;
        }

        const newTask = await Task.create({
            title: data.title,
            slug: slug,
            description: data.description,
            priority: data.priority,
            deadline: data.deadline ? new Date(data.deadline) : undefined,
            createdBy: data.creatorId,
            assignedTo: assignedTo,
            todos: data.todos.map(text => ({ text, completed: false })),
            requiresSubmission: data.requiresSubmission || false,
            requiredFileNames: data.requiredFileNames || [],
            status: 'todo', // Global status
            completedBy: []
        });

        // Notification: Assignees
        try {
            const creator = await Employee.findById(data.creatorId).select("firstName lastName");
            const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : "Someone";

            const recipientIds = Array.from(assigneeIds).filter(id => id !== data.creatorId);

            if (recipientIds.length > 0) {
                await triggerNotification({
                    title: "New Task Assigned",
                    message: `${creatorName} assigned you a new task: "${data.title}"`,
                    type: "info",
                    category: "system", // or 'task' if available
                    recipients: recipientIds,
                    link: `/dashboard/tasks/${newTask.slug}`,
                    senderId: data.creatorId,
                    metadata: { taskId: newTask._id }
                });
            }
        } catch (e) {
            console.error("Task Notification Error:", e);
        }

        await logAction({
            action: 'CREATE_TASK',
            performedBy: data.creatorId,
            targetId: newTask._id.toString(),
            targetModel: 'Task',
            details: {
                title: data.title,
                isGlobal: data.assignments.some(a => a.type === 'global_all' || a.type === 'global_role'),
                storeId: data.assignments.find(a => a.type.startsWith('store'))?.id
            }
        });

        revalidatePath("/dashboard");

        await pusherServer.trigger("global", "task:updated", {
            taskId: newTask._id,
            status: 'created'
        });

        return { success: true, count: 1 };
    } catch (error) {
        console.error("Error creating task:", error);
        return { success: false, error: "Failed to create task" };
    }
}
// --- Get Tasks ---
export async function getTasksForUser(userId: string) {
    try {
        await connectToDB();
        // Determine user roles to see global tasks? 
        // For now, complex query based on assignments.

        // 1. Fetch User details for Role/Dept based checks
        const user = await Employee.findById(userId);
        if (!user) return [];

        // Since createTask resolves all group assignments (Store, Role, Dept)
        // into individual 'individual' type assignments with specific User IDs,
        // we only need to query for the user's ID in the assignedTo list.

        const tasks = await Task.find({
            $or: [
                { createdBy: userId },
                { "assignedTo.id": userId }
            ]
        })
            .populate('createdBy', 'firstName lastName image')
            .populate('assignedTo.id', 'firstName lastName image') // Populate assignee details if needed
            .sort({ createdAt: -1 });

        return JSON.parse(JSON.stringify(tasks));
    } catch (error) {
        console.error("Error fetching tasks:", error);
        return [];
    }
}

export async function getTaskById(taskId: string) {
    try {
        await connectToDB();
        const task = await Task.findById(taskId)
            .populate('createdBy', 'firstName lastName image')
            .populate('assignedTo.id', 'firstName lastName image')
            .populate('comments.userId', 'firstName lastName image') // Populate comment authors
            .lean();

        return JSON.parse(JSON.stringify(task));
    } catch (error) {
        console.error("Error fetching task:", error);
        return null;
    }
}

export async function getTaskBySlug(slug: string) {
    try {
        await connectToDB();
        const task = await Task.findOne({ slug })
            .populate('createdBy', 'firstName lastName image')
            .populate('assignedTo.id', 'firstName lastName image')
            .populate('comments.userId', 'firstName lastName image')
            .lean();

        return JSON.parse(JSON.stringify(task));
    } catch (error) {
        console.error("Error fetching task by slug:", error);
        return null;
    }
}
// --- Update Task Status (Individual Completion) ---
export async function updateTaskStatus(taskId: string, status: string, userId: string) {
    try {
        await connectToDB();

        // If user marks "completed", we add to completedBy.
        // If user marks "todo", we REMOVE from completedBy.

        let update: any = {};

        if (status === 'completed') {
            update = {
                $addToSet: {
                    completedBy: { userId, completedAt: new Date() }
                }
            };
        } else {
            // Remove from completedBy
            update = {
                $pull: {
                    completedBy: { userId: userId }
                }
            };
        }

        // We do NOT change the global 'status' field here, 
        // to prevent one user closing it for everyone.
        // Optional: If we wanted to, we could check if completedBy.length == assignedTo.length

        const updatedTask = await Task.findByIdAndUpdate(taskId, update, { new: true })
            .populate('createdBy', 'firstName lastName');

        revalidatePath("/dashboard");

        // Notification: If completed, notify Creator
        if (status === 'completed' && updatedTask) {
            try {
                const completer = await Employee.findById(userId).select("firstName lastName");
                const completerName = completer ? `${completer.firstName} ${completer.lastName}` : "Someone";

                const creatorId = updatedTask.createdBy?._id ? updatedTask.createdBy._id.toString() : updatedTask.createdBy.toString();

                if (creatorId && creatorId !== userId) {
                    await triggerNotification({
                        title: "Task Completed",
                        message: `${completerName} completed the task: "${updatedTask.title}"`,
                        type: "success",
                        category: "system",
                        recipients: [creatorId],
                        link: `/dashboard/tasks/${updatedTask.slug || taskId}`,
                        senderId: userId,
                        metadata: { taskId }
                    });
                }
            } catch (e) {
                console.error("Task Completion Notification Error:", e);
            }
        }

        await logAction({
            action: status === 'completed' ? 'COMPLETE_TASK' : 'UNCOMPLETE_TASK',
            performedBy: userId,
            targetId: taskId,
            targetModel: 'Task',
            details: {
                status,
                title: updatedTask?.title
            }
        });

        await pusherServer.trigger(`user-${userId}`, "task:updated", {
            taskId: taskId,
            status: status
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


// --- Todos ---
export async function toggleTodo(taskId: string, todoId: string, completed: boolean, userId: string) {
    try {
        await connectToDB();

        const updateOperation = completed
            ? { $addToSet: { "todos.$.completedBy": userId } }
            : { $pull: { "todos.$.completedBy": userId } };

        await Task.findOneAndUpdate(
            { "_id": taskId, "todos._id": todoId },
            updateOperation
        );

        revalidatePath("/dashboard");
        await pusherServer.trigger(`user-${userId}`, "task:updated", {
            taskId: taskId,
            status: 'updated'
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to update todo" };
    }
}

// --- Comments ---
export async function addTaskComment(taskId: string, userId: string, text: string) {
    try {
        await connectToDB();
        const user = await Employee.findById(userId);
        const userName = `${user.firstName} ${user.lastName}`;

        const task = await Task.findByIdAndUpdate(taskId, {
            $push: {
                comments: {
                    userId,
                    userName,
                    text,
                    createdAt: new Date()
                }
            }
        }, { new: true }); // Get updated

        revalidatePath("/dashboard");

        // Notification: Notify Creator + Assignees (everyone involved)
        try {
            if (task) {
                const recipients = new Set<string>();

                // Add Creator
                const creatorId = task.createdBy.toString();
                recipients.add(creatorId);

                // Add Assignees (Individual)
                task.assignedTo.forEach((a: any) => {
                    if (a.type === 'individual') recipients.add(a.id.toString());
                });

                // Exclude Commenter
                recipients.delete(userId);

                if (recipients.size > 0) {
                    await triggerNotification({
                        title: "New Comment on Task",
                        message: `${userName} commented on "${task.title}": ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`,
                        type: "info",
                        category: "system",
                        recipients: Array.from(recipients),
                        link: `/dashboard/tasks/${task.slug || taskId}`,
                        senderId: userId,
                        metadata: { taskId }
                    });
                }
            }
        } catch (e) {
            console.error("Task Comment Notification Error:", e);
        }

        // Log Action
        await logAction({
            action: 'COMMENT_TASK',
            performedBy: userId,
            targetId: taskId,
            targetModel: 'Task',
            details: { text: text.substring(0, 100) }
        });

        await pusherServer.trigger("global", "task:updated", {
            taskId: taskId,
            status: 'commented'
        });

        // Specific channel update for the page
        const comment = task.comments[task.comments.length - 1];
        await pusherServer.trigger(`task-${taskId}`, "comment:new", {
            comment: JSON.parse(JSON.stringify(comment))
        });

        return { success: true, comment: JSON.parse(JSON.stringify(comment)) };
    } catch (error) {
        return { success: false, error: "Failed to add comment" };
    }
}

// --- Update Task Details ---
export async function updateTask(taskId: string, data: {
    title: string;
    description: string;
    priority: string;
    deadline?: string;
    requiresSubmission?: boolean;
    requiredFileNames?: string[];
    todos: string[];
}) {
    try {
        await connectToDB();

        const updateData: any = {
            title: data.title,
            description: data.description,
            priority: data.priority,
            deadline: data.deadline ? new Date(data.deadline) : undefined,
            requiresSubmission: data.requiresSubmission,
            requiredFileNames: data.requiredFileNames || [],
            todos: data.todos.map(text => ({ text, completed: false }))
        };

        // Update slug if title changes
        const currentTask = await Task.findById(taskId);
        if (currentTask && data.title !== currentTask.title) {
            let baseSlug = slugify(data.title);
            let slug = baseSlug;
            while (await Task.findOne({ slug, _id: { $ne: taskId } })) {
                slug = `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`;
            }
            updateData.slug = slug;
        }

        await Task.findByIdAndUpdate(taskId, updateData);

        const session = await getServerSession(authOptions);
        if (session?.user) {
            await logAction({
                action: 'UPDATE_TASK',
                performedBy: (session.user as any).id,
                targetId: taskId,
                targetModel: 'Task',
                details: {
                    title: data.title,
                    status: (data as any).status || 'updated'
                }
            });
        }

        revalidatePath("/dashboard");
        if (session?.user) {
            await pusherServer.trigger(`user-${(session.user as any).id}`, "task:updated", {
                taskId: taskId,
                status: 'updated'
            });
        }

        return { success: true };
    } catch (error) {
        console.error("Error updating task:", error);
        return { success: false, error: "Failed to update task" };
    }
}

// --- Submissions ---
export async function submitTaskFile(taskId: string, userId: string, fileUrl: string, fileName?: string, requirementName?: string) {
    try {
        await connectToDB();

        // 1. Add Submission
        // We use { new: true } to get the updated task and check requirements
        const task = await Task.findByIdAndUpdate(taskId, {
            $push: {
                submissions: {
                    userId,
                    fileUrl,
                    fileName: fileName || "File",
                    requirementName,
                    submittedAt: new Date()
                }
            }
        }, { new: true });

        // 2. Check Completion Logic
        let shouldComplete = true;

        if (task.requiredFileNames && task.requiredFileNames.length > 0) {
            // Check if user has submitted all required files
            // submissions userId is ObjectId
            const userSubmissions = task.submissions?.filter((s: any) =>
                s.userId.toString() === userId
            ) || [];

            const submittedRequirements = new Set(
                userSubmissions.map((s: any) => s.requirementName).filter(Boolean)
            );

            // Check if all required names are in submitted set
            const allMet = task.requiredFileNames.every((req: string) => submittedRequirements.has(req));
            if (!allMet) shouldComplete = false;
        }

        if (shouldComplete) {
            await Task.findByIdAndUpdate(taskId, {
                $addToSet: {
                    completedBy: { userId, completedAt: new Date() }
                }
            });
        }

        await logAction({
            action: 'SUBMIT_TASK_FILE',
            performedBy: userId,
            targetId: taskId,
            targetModel: 'Task',
            details: { fileName, requirementName }
        });

        revalidatePath("/dashboard");
        await pusherServer.trigger(`user-${userId}`, "task:updated", {
            taskId: taskId,
            status: 'submitted'
        });

        return { success: true };
    } catch (error) {
        console.error("Submission error:", error);
        return { success: false, error: "Failed to submit file" };
    }
}
