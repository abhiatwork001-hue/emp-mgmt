"use server";

import connectToDB from "@/lib/db";
import { Notice, Employee, StoreDepartment } from "@/lib/models";
import { pusherServer } from "../pusher";
import { revalidatePath } from "next/cache";
import { triggerNotification } from "@/lib/actions/notification.actions";
import { logAction } from "./log.actions";
import { slugify } from "@/lib/utils";
import * as crypto from "crypto";

export async function createNotice(data: {
    title: string;
    content: string;
    targetScope: string; // 'global', 'store', 'department', 'store_department', 'role_group'
    targetId?: string; // StoreId, GlobalDeptId, StoreDeptId
    targetRole?: string; // For 'role_group'
    visibleToAdmin?: boolean; // New
    expiresAt?: string; // ISO Date or undefined
    userId: string;
    attachments?: string[];
}) {
    try {
        await connectToDB();
        const user = await Employee.findById(data.userId);
        if (!user) return { success: false, error: "User not found" };

        const roles = user.roles || [];
        const isSuper = roles.some((r: string) => ["Owner", "Admin", "HR", "Super User"].includes(r));
        const isStoreManager = roles.includes("Store Manager");
        const isDeptHead = roles.includes("Department Head");
        const isStoreDeptHead = roles.includes("Store Department Head");

        // 1. Employee Restriction (Existing Logic)
        if (!isSuper && !isStoreManager && !isDeptHead && !isStoreDeptHead) {
            return { success: false, error: "Permission Denied" };
        }

        // 2. Scope Validation (Existing Logic)
        if (!isSuper) {
            if (isStoreManager) {
                const myStoreId = user.storeId?.toString();
                if (data.targetScope === 'global' || data.targetScope === 'department') {
                    return { success: false, error: "Review Access: Store Manager cannot post Global/Department wide." };
                }
                if (data.targetScope === 'store' && data.targetId !== myStoreId) {
                    return { success: false, error: "Review Access: Cannot post to other stores." };
                }
                if (data.targetScope === 'role_group' && data.targetId !== myStoreId) {
                    return { success: false, error: "Review Access: Role targeting must be scoped to your store." };
                }
                if (data.targetScope === 'store_department') {
                    const dept = await StoreDepartment.findById(data.targetId);
                    if (!dept || dept.storeId.toString() !== myStoreId) {
                        return { success: false, error: "Review Access: Target department not found or not in your store." };
                    }
                }
            }
            if (isDeptHead) {
                if (data.targetScope === 'global' || data.targetScope === 'store' || data.targetScope === 'role_group') {
                    return { success: false, error: "Review Access: Dept Heads scoped to Departments." };
                }
            }
            if (isStoreDeptHead) {
                if (data.targetScope !== 'store_department' || data.targetId !== user.storeDepartmentId?.toString()) {
                    return { success: false, error: "Review Access: Store Dept Head can only post to their own section." };
                }
            }
        }

        // Generate Slug
        let baseSlug = slugify(data.title);
        let slug = baseSlug;
        while (await Notice.findOne({ slug })) {
            slug = `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`;
        }

        const newNotice = await Notice.create({
            title: data.title,
            slug: slug,
            content: data.content,
            priority: 'normal',
            targetScope: data.targetScope,
            targetId: data.targetId || null,
            targetRole: (data.targetScope === 'role_group' || data.targetScope === 'store_department') ? data.targetRole : null,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
            createdBy: data.userId,
            attachments: data.attachments || []
        });

        // --- Notification Logic ---
        try {
            let recipientQuery: any = { active: true };

            if (data.targetScope === 'global') {
                // All employees
                recipientQuery = { active: true };
            } else if (data.targetScope === 'store') {
                if (data.targetId) recipientQuery.storeId = data.targetId;
            } else if (data.targetScope === 'store_department') {
                if (data.targetId) recipientQuery.storeDepartmentId = data.targetId;
            } else if (data.targetScope === 'role_group') {
                // Users with this role
                // Note: user.roles is an array of strings. We use Regex for case-insensitive match or exact.
                // Assuming data.targetRole is the exact string stored in roles array (e.g. "Store Manager")
                if (data.targetRole) {
                    recipientQuery.roles = data.targetRole;
                    // If scoped to store (targetId provided for role_group context)
                    if (data.targetId) {
                        recipientQuery.storeId = data.targetId;
                    }
                }
            } else if (data.targetScope === 'department') {
                // Global Department
                // Find all store departments that link to this global dept
                if (data.targetId) {
                    const linkedStoreDepts = await StoreDepartment.find({ globalDepartmentId: data.targetId }).select('_id');
                    const ids = linkedStoreDepts.map((d: any) => d._id);
                    recipientQuery.storeDepartmentId = { $in: ids };
                }
            }

            // Execute Query
            const recipients = await Employee.find(recipientQuery).select('_id');
            const recipientIds = recipients
                .map((r: any) => r._id.toString())
                .filter((id: string) => id !== data.userId); // Exclude sender

            if (recipientIds.length > 0) {
                const senderName = `${user.firstName} ${user.lastName}`;
                await triggerNotification({
                    title: `New Notice: ${data.title}`,
                    message: `${senderName} posted a new notice for ${data.targetScope.replace('_', ' ')}.`,
                    type: "info",
                    category: "announcement",
                    recipients: recipientIds,
                    link: "/dashboard", // or /dashboard/notices
                    senderId: data.userId,
                    metadata: { noticeId: newNotice._id }
                });
            }

        } catch (notifError) {
            console.error("Failed to send notice notifications:", notifError);
        }

        // Log Action
        await logAction({
            action: 'NOTICE_CREATED',
            performedBy: data.userId,
            storeId: data.targetScope === 'store' ? data.targetId : undefined,
            targetId: newNotice._id,
            targetModel: 'Notice',
            details: {
                title: data.title,
                targetScope: data.targetScope,
                targetId: data.targetId,
                visibleToAdmin: data.visibleToAdmin
            }
        });

        revalidatePath("/dashboard");

        await pusherServer.trigger("global", "notice:updated", {
            noticeId: newNotice._id,
            status: 'created'
        });

        return { success: true };
    } catch (error) {
        console.error("Create Notice Error:", error);
        return { success: false, error: "Failed to create notice" };
    }
}

export async function getNoticesForUser(userId: string) {
    console.log("getNoticesForUser called for:", userId);
    try {
        await connectToDB();

        if (!userId) {
            console.log("No userId provided");
            return [];
        }

        // Check types of imported models to ensure no circular dependency issues
        if (!Notice || !Employee || !StoreDepartment) {
            console.error("Critical: One of the models (Notice, Employee, StoreDepartment) is undefined.", { Notice: !!Notice, Employee: !!Employee, StoreDepartment: !!StoreDepartment });
            throw new Error("Internal Model Error");
        }

        // Populate storeDepartmentId to access its globalDepartmentId
        const user = await Employee.findById(userId).populate({
            path: 'storeDepartmentId',
            model: StoreDepartment,
            select: 'globalDepartmentId'
        });

        if (!user) {
            console.log("User not found in getNoticesForUser");
            return [];
        }

        const now = new Date();

        // Build Query
        // 1. Base criteria: Global or created by me or visible to admin (if admin)
        const orConditions: any[] = [
            { targetScope: 'global' },
            { createdBy: userId }
        ];

        // 2. Store Scope
        if (user.storeId) {
            orConditions.push({ targetScope: 'store', targetId: user.storeId });
        }

        // 3. Store Dept Scope
        if (user.storeDepartmentId?._id) {
            orConditions.push({
                targetScope: 'store_department',
                targetId: user.storeDepartmentId._id
            });

            // Global Dept Scope (Linked via Store Dept)
            if (user.storeDepartmentId.globalDepartmentId) {
                orConditions.push({ targetScope: 'department', targetId: user.storeDepartmentId.globalDepartmentId });
            }
        }

        // 4. Role Group Scope
        const normalizedRoles = (user.roles || []).map((r: string) => r.toLowerCase().trim());
        if (user.roles && user.roles.length > 0) {
            orConditions.push({
                targetScope: 'role_group',
                targetRole: { $in: user.roles },
                $or: [
                    { targetId: null },
                    { targetId: { $exists: false } },
                    ...(user.storeId ? [{ targetId: user.storeId }] : [])
                ]
            });
        }

        // 5. Admin Visibility
        const isAdminOrHR = normalizedRoles.some((r: string) => ['admin', 'hr', 'owner', 'super_user'].includes(r));
        if (isAdminOrHR) {
            orConditions.push({ visibleToAdmin: true });
        }

        const notices = await Notice.find({
            $and: [
                { $or: orConditions },
                { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }
            ]
        })
            .sort({ createdAt: -1 })
            .populate('createdBy', 'firstName lastName image');

        console.log(`Found ${notices.length} notices for user`);

        return JSON.parse(JSON.stringify(notices));
    } catch (error) {
        console.error("Fetch Notices Error:", error);
        // Return empty array instead of throwing to prevent client crash
        return [];
    }
}

export async function getNoticeById(noticeId: string) {
    try {
        await connectToDB();
        const notice = await Notice.findById(noticeId)
            .populate('createdBy', 'firstName lastName image')
            .populate({
                path: 'comments.userId',
                model: Employee,
                select: 'firstName lastName image'
            });

        if (!notice) return null;
        return JSON.parse(JSON.stringify(notice));
    } catch (error) {
        console.error("Get Notice Error:", error);
        return null;
    }
}

export async function getNoticeBySlug(slug: string) {
    try {
        await connectToDB();
        const notice = await Notice.findOne({ slug })
            .populate('createdBy', 'firstName lastName image')
            .populate({
                path: 'comments.userId',
                model: Employee,
                select: 'firstName lastName image'
            });

        if (!notice) return null;
        return JSON.parse(JSON.stringify(notice));
    } catch (error) {
        console.error("Get Notice By Slug Error:", error);
        return null;
    }
}

export async function addComment(noticeId: string, userId: string, content: string) {
    try {
        await connectToDB();
        const notice = await Notice.findByIdAndUpdate(
            noticeId,
            {
                $push: {
                    comments: {
                        userId: userId,
                        content: content,
                        createdAt: new Date()
                    }
                }
            },
            { new: true }
        ).populate('createdBy', 'firstName lastName');

        // Notification: Notify Creator + Previous Commenters
        try {
            if (notice) {
                const user = await Employee.findById(userId).select("firstName lastName");
                const commenterName = user ? `${user.firstName} ${user.lastName}` : "Someone";

                const recipients = new Set<string>();

                // Add Creator
                if (notice.createdBy?._id) recipients.add(notice.createdBy._id.toString());
                else if (notice.createdBy) recipients.add(notice.createdBy.toString());

                // Add Thread Participants
                if (notice.comments && notice.comments.length > 0) {
                    notice.comments.forEach((c: any) => {
                        if (c.userId) recipients.add(c.userId.toString());
                    });
                }

                // Exclude current commenter and invalid IDs
                recipients.delete(userId);

                const validRecipients = Array.from(recipients).filter(id => id);

                if (validRecipients.length > 0) {
                    await triggerNotification({
                        title: "New Comment on Notice",
                        message: `${commenterName} commented on "${notice.title}": ${content.substring(0, 30)}...`,
                        type: "info",
                        category: "announcement",
                        recipients: validRecipients,
                        link: `/dashboard/notices/${notice.slug}`, // Specific notice link
                        senderId: userId,
                        metadata: { noticeId }
                    });
                }
            }
        } catch (e) {
            console.error("Notice Comment Notification Error:", e);
        }

        // Log Action
        await logAction({
            action: 'NOTICE_COMMENT',
            performedBy: userId,
            targetId: noticeId,
            targetModel: 'Notice',
            details: { content: content.substring(0, 100) }
        });

        revalidatePath("/dashboard");

        // Specific channel update for the page
        const comment = notice.comments[notice.comments.length - 1];
        await pusherServer.trigger(`notice-${noticeId}`, "comment:new", {
            comment: JSON.parse(JSON.stringify(comment))
        });

        await pusherServer.trigger("global", "notice:updated", {
            noticeId,
            status: 'commented'
        });

        return { success: true, comment: JSON.parse(JSON.stringify(comment)) };
    } catch (error) {
        console.error("Add Comment Error:", error);
        return { success: false, error: "Failed to add comment" };
    }
}

export async function updateNotice(noticeId: string, userId: string, data: Partial<any>) {
    try {
        await connectToDB();
        const notice = await Notice.findById(noticeId);
        if (!notice) return { success: false, error: "Notice not found" };

        // Permission Check: Creator OR Admin/Owner
        const user = await Employee.findById(userId).select("roles");
        const roles = (user?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
        const hasAdminPrivileges = roles.some((r: string) => ["admin", "owner", "super_user"].includes(r));

        const isCreator = notice.createdBy ? (notice.createdBy._id ? notice.createdBy._id.toString() === userId : notice.createdBy.toString() === userId) : false;

        if (!isCreator && !hasAdminPrivileges) {
            return { success: false, error: "Unauthorized: Only creator or admin can edit." };
        }

        if (data.title) notice.title = data.title;
        if (data.content) notice.content = data.content;
        if (data.targetScope) notice.targetScope = data.targetScope;

        if (data.targetId !== undefined) notice.targetId = data.targetId || null;
        if (data.targetRole !== undefined) notice.targetRole = data.targetRole || null;

        if (data.visibleToAdmin !== undefined) notice.visibleToAdmin = data.visibleToAdmin;
        if (data.expiresAt !== undefined) notice.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

        // Update slug if title changes
        if (data.title && data.title !== notice.title) {
            let baseSlug = slugify(data.title);
            let slug = baseSlug;
            while (await Notice.findOne({ slug, _id: { $ne: noticeId } })) {
                slug = `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`;
            }
            notice.slug = slug;
        }

        await notice.save();

        // Log Action
        await logAction({
            action: 'NOTICE_UPDATED',
            performedBy: userId,
            targetId: noticeId,
            targetModel: 'Notice',
            details: { title: notice.title }
        });

        revalidatePath('/dashboard/notices');
        revalidatePath(`/dashboard/notices/${notice.slug}`);
        revalidatePath('/dashboard');

        await pusherServer.trigger("global", "notice:updated", {
            noticeId: noticeId,
            status: 'updated'
        });

        return { success: true };
    } catch (error) {
        console.error("Update Notice Error:", error);
        return { success: false, error: "Failed to update notice" };
    }
}
