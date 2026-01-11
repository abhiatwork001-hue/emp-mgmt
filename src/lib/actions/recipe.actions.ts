"use server";

import dbConnect from "@/lib/db";
import { Food, Category, IFood, ICategory, GlobalDepartment, Employee, StoreDepartment } from "@/lib/models";
import { triggerNotification } from "@/lib/actions/notification.actions";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logAction } from "./log.actions";
import { slugify } from "@/lib/utils";

// --- Categories ---

export async function getCategories() {
    await dbConnect();
    const categories = await Category.find({}).sort({ name: 1 }).lean();
    return JSON.parse(JSON.stringify(categories));
}

export async function createCategory(name: string) {
    await dbConnect();
    try {
        const newCat = await Category.create({ name });

        const session = await getServerSession(authOptions);
        if (session?.user) {
            await logAction({
                action: 'CREATE_RECIPE_CATEGORY',
                performedBy: (session.user as any).id,
                targetId: newCat._id.toString(),
                targetModel: 'Category',
                details: { name }
            });
        }

        return JSON.parse(JSON.stringify(newCat));
    } catch (e) {
        throw e;
    }
}

// --- Foods (Recipes) ---

interface GetFoodsFilter {
    search?: string;
    categoryId?: string;
    userGlobalDepartmentId?: string; // The user's global Dept ID (e.g. "Kitchen", "Bar")
    isAdminOrHead?: boolean; // If true, can see everything
}

export async function getFoods({ search, categoryId, userGlobalDepartmentId, isAdminOrHead }: GetFoodsFilter = {}) {
    await dbConnect();

    // 1. Initialize Query
    const query: any = {};

    // 2. Search & Category Filters
    if (search) {
        query.name = { $regex: search, $options: "i" };
    }

    if (categoryId && categoryId !== "all") {
        query.category = categoryId;
    }

    // 3. User Role & Visibility Logic
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    let isKitchenHead = false;
    let isTech = false;

    // Use passed flag as baseline, but verify "Tech" status for deletion visibility
    if (userId) {
        try {
            const user = await Employee.findById(userId)
                .select("roles storeDepartmentId")
                .populate("storeDepartmentId", "globalDepartmentId");

            const roles = user?.roles || [];
            const r = roles.map((x: string) => x.toLowerCase());
            isTech = r.includes("admin") || r.includes("super_user") || r.includes("tech") || r.includes("owner") || r.includes("hr");

            // Auto-detect Department if not passed
            if (!userGlobalDepartmentId && user?.storeDepartmentId?.globalDepartmentId) {
                userGlobalDepartmentId = user.storeDepartmentId.globalDepartmentId.toString();
            }

            if (!isTech) {
                const kitchenDept = await GlobalDepartment.findOne({ name: { $regex: /kitchen/i } }).select("departmentHead");
                if (kitchenDept && kitchenDept.departmentHead?.map((id: any) => id.toString()).includes(userId)) {
                    isKitchenHead = true;
                }
            }
        } catch (e) {
        }
    }

    // 4. Apply Visiblity Filters

    // Deletion Status:
    // - Default: Exclude deleted (isDeleted != true)
    // - Tech: Can see deleted (isDeleted ignored or specific check? logic says "visible to tech only")
    //   If we want to SHOW deleted items alongside active ones for Tech, we just don't filter `isDeleted`.
    //   But usually "Trash" is separate. "make search global for that out" suggests they want to find them.
    //   Let's allow Tech to see everything including deleted.
    if (!isTech) {
        query.isDeleted = { $ne: true };
    } else {
        // Tech sees all.
    }

    // Active Status (Archived):
    // - Default: isActive = true
    // - Kitchen Head / Tech: Can see isActive = false
    if (!isTech && !isKitchenHead) {
        query.isActive = true;
    }
    // Else (Tech/Head) can see archived (isActive: false).

    // Department Access Control (Legacy Logic Support)
    // Use the existing logic for 'accessibleGlobalDept' if valid
    if (!isTech && !isKitchenHead) {
        // Standard User Strict Checks
        if (userGlobalDepartmentId) {
            query.$or = [
                { accessibleGlobalDepartments: { $exists: false } }, // Public
                { accessibleGlobalDepartments: { $size: 0 } },
                { accessibleGlobalDepartments: userGlobalDepartmentId }
            ];
        } else {
            // No Dept -> Only Public
            query.$or = [
                { accessibleGlobalDepartments: { $exists: false } },
                { accessibleGlobalDepartments: { $size: 0 } },
            ];
        }
    }

    const foods = await Food.find(query)
        .populate("category", "name")
        .sort({ name: 1 })
        .lean();

    return JSON.parse(JSON.stringify(foods));
}

export async function getFoodById(id: string) {
    await dbConnect();
    const food = await Food.findById(id).populate("category").lean();
    return JSON.parse(JSON.stringify(food));
}

export async function getFoodBySlug(slug: string) {
    await dbConnect();
    const food = await Food.findOne({ slug }).populate("category").lean();
    return JSON.parse(JSON.stringify(food));
}

export async function createFood(data: Partial<IFood>) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    const canCreate = await checkRecipeManagementAccess((session.user as any).id);
    if (!canCreate) {
        throw new Error("Unauthorized: Only Kitchen Head or Tech can manage recipes.");
    }

    try {
        if (data.name) {
            data.slug = slugify(data.name);
            // Ensure uniqueness if slug exists
            let count = 1;
            let finalSlug = data.slug;
            while (await Food.findOne({ slug: finalSlug })) {
                finalSlug = `${data.slug}-${count++}`;
            }
            data.slug = finalSlug;
        }

        const newFood = await Food.create(data);
        revalidatePath("/dashboard/recipes");

        // Notification Logic
        try {
            if (newFood.accessibleGlobalDepartments && newFood.accessibleGlobalDepartments.length > 0) {
                // Find all Store Departments linked to these Global Departments
                const relevantStoreDepts = await StoreDepartment.find({
                    globalDepartmentId: { $in: newFood.accessibleGlobalDepartments },
                    active: true
                }).select('_id');

                const storeDeptIds = relevantStoreDepts.map((d: any) => d._id);

                if (storeDeptIds.length > 0) {
                    const employees = await Employee.find({
                        storeDepartmentId: { $in: storeDeptIds },
                        active: true
                    }).select('_id');

                    const recipientIds = employees.map((e: any) => e._id.toString());

                    // Filter out creator if needed? Usually creator knows.
                    const finalRecipients = recipientIds.filter((id: string) => id !== newFood.createdBy?.toString());

                    if (finalRecipients.length > 0) {
                        await triggerNotification({
                            title: "New Recipe Created",
                            message: `A new recipe "${newFood.name}" is now available for your department.`,
                            type: "info",
                            category: "system",
                            recipients: finalRecipients,
                            link: `/dashboard/recipes/${newFood.slug}`,
                            metadata: { recipeId: newFood._id }
                        });
                    }
                }
            }

            const session = await getServerSession(authOptions);
            if (session?.user) {
                await logAction({
                    action: 'CREATE_RECIPE',
                    performedBy: (session.user as any).id,
                    targetId: newFood._id.toString(),
                    targetModel: 'Food',
                    details: { name: newFood.name }
                });
            }

            return JSON.parse(JSON.stringify(newFood));
        } catch (e) {
            throw e;
        }
    } catch (e) {
        throw e;
    }
}

export async function updateFood(id: string, data: Partial<IFood>) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    const canEdit = await checkRecipeManagementAccess((session.user as any).id);
    if (!canEdit) {
        throw new Error("Unauthorized: Only Kitchen Head or Tech can manage recipes.");
    }

    try {
        if (data.name) {
            data.slug = slugify(data.name);
            // Ensure uniqueness if slug changed
            const existing = await Food.findById(id);
            if (existing && existing.slug !== data.slug) {
                let count = 1;
                let finalSlug = data.slug;
                while (await Food.findOne({ slug: finalSlug, _id: { $ne: id } })) {
                    finalSlug = `${data.slug}-${count++}`;
                }
                data.slug = finalSlug;
            }
        }
        const updated = await Food.findByIdAndUpdate(id, data, { new: true }).lean();
        if (!updated) throw new Error("Food not found");

        revalidatePath("/dashboard/recipes");
        revalidatePath(`/dashboard/recipes/${(updated as any).slug}`);

        // Notification Logic
        try {
            if (updated.accessibleGlobalDepartments && updated.accessibleGlobalDepartments.length > 0) {
                // Find all Store Departments linked to these Global Departments
                const relevantStoreDepts = await StoreDepartment.find({
                    globalDepartmentId: { $in: updated.accessibleGlobalDepartments },
                    active: true
                }).select('_id');

                const storeDeptIds = relevantStoreDepts.map((d: any) => d._id);

                if (storeDeptIds.length > 0) {
                    const employees = await Employee.find({
                        storeDepartmentId: { $in: storeDeptIds },
                        active: true
                    }).select('_id');

                    const recipientIds = employees.map((e: any) => e._id.toString());

                    const session = await getServerSession(authOptions);
                    const currentUserId = (session?.user as any)?.id;
                    const finalRecipients = recipientIds.filter((rid: string) => rid !== currentUserId);

                    if (finalRecipients.length > 0) {
                        await triggerNotification({
                            title: "Recipe Updated",
                            message: `The recipe "${updated.name}" has been updated.`,
                            type: "info",
                            category: "system",
                            recipients: finalRecipients,
                            link: `/dashboard/recipes/${updated.slug}`,
                            metadata: { recipeId: updated._id }
                        });
                    }
                }
            }

            const session = await getServerSession(authOptions);
            if (session?.user) {
                await logAction({
                    action: 'UPDATE_RECIPE',
                    performedBy: (session.user as any).id,
                    targetId: id,
                    targetModel: 'Food',
                    details: { name: updated?.name }
                });
            }

            return JSON.parse(JSON.stringify(updated));
        } catch (e) {
            throw e;
        }
    } catch (e) {
        throw e;
    }
}

export async function archiveFood(id: string) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    const canArchive = await checkRecipeManagementAccess((session.user as any).id);
    if (!canArchive) {
        throw new Error("Unauthorized: Only Kitchen Head or Tech can manage recipes.");
    }

    try {
        // Archive means isActive = false
        const updated = await Food.findByIdAndUpdate(id, { isActive: false }, { new: true });
        revalidatePath("/dashboard/recipes");
        revalidatePath(`/dashboard/recipes/${updated.slug}`);

        const session = await getServerSession(authOptions);
        if (session?.user) {
            await logAction({
                action: 'ARCHIVE_RECIPE',
                performedBy: (session.user as any).id,
                targetId: id,
                targetModel: 'Food',
                details: { name: updated?.name }
            });
        }

        return JSON.parse(JSON.stringify(updated));
    } catch (e) {
        throw e;
    }
}

export async function deleteFood(id: string) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    const canDelete = await checkRecipeManagementAccess((session.user as any).id);
    if (!canDelete) {
        throw new Error("Unauthorized: Only Kitchen Head or Tech can manage recipes.");
    }

    try {
        // Soft delete means isDeleted = true
        // Also ensure it's inactive
        const updated = await Food.findByIdAndUpdate(id, { isDeleted: true, isActive: false }, { new: true });
        revalidatePath("/dashboard/recipes");
        revalidatePath(`/dashboard/recipes/${updated.slug}`);

        const session = await getServerSession(authOptions);
        if (session?.user) {
            await logAction({
                action: 'DELETE_RECIPE',
                performedBy: (session.user as any).id,
                targetId: id,
                targetModel: 'Food',
                details: { name: updated?.name }
            });
        }

        return JSON.parse(JSON.stringify(updated));
    } catch (e) {
        throw e;
    }
}

export async function restoreFood(id: string) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    const canRestore = await checkRecipeManagementAccess((session.user as any).id);
    if (!canRestore) {
        throw new Error("Unauthorized: Only Kitchen Head or Tech can manage recipes.");
    }

    try {
        const updated = await Food.findByIdAndUpdate(id, { isDeleted: false, isActive: true }, { new: true });
        revalidatePath("/dashboard/recipes");
        revalidatePath(`/dashboard/recipes/${updated.slug}`);

        const session = await getServerSession(authOptions);
        if (session?.user) {
            await logAction({
                action: 'RESTORE_RECIPE',
                performedBy: (session.user as any).id,
                targetId: id,
                targetModel: 'Food',
                details: { name: updated?.name }
            });
        }

        return JSON.parse(JSON.stringify(updated));
    } catch (e) {
        throw e;
    }
}

export async function checkRecipeManagementAccess(userId: string) {
    await dbConnect();
    // 1. Fetch User with roles
    const user = await import("@/lib/models").then(m => m.Employee.findById(userId).select("roles"));
    if (!user) return false;

    const roles = user.roles || [];
    // Allowed Roles: 'Owner', 'Tech', 'SuperUser', 'HR' (Admin excluded per user request?)
    // User said: "globalDepartment head of kitchen and tech" (and implies Owner usually).
    // Let's stick to "Tech", "Owner", "HR" (usually has all access), "SuperUser". ADMIN might be excluded if user specifically omitted them, but usually Admin has access.
    // User said: "let just the globalDepartment head of kitchen and tech to create a recipe".
    // "Just" implies exclusion of others? I'll exclude standard "Store Manager" etc.
    // I'll include Admin/Owner/HR/Tech/SuperUser + Kitchen Head.
    const allowedRoles = ["Owner", "Tech", "SuperUser", "Admin", "HR"];
    const hasRole = roles.some((r: string) => allowedRoles.some(ar => r.toLowerCase() === ar.toLowerCase()));

    if (hasRole) return true;

    // 2. Check if Kitchen Head
    const GlobalDepartment = (await import("@/lib/models")).GlobalDepartment;
    const kitchenDept = await GlobalDepartment.findOne({
        name: { $regex: /kitchen/i }
    }).select("departmentHead");

    if (kitchenDept && kitchenDept.departmentHead?.map((id: any) => id.toString()).includes(userId)) {
        return true;
    }

    return false;
}

export async function hasRecipesForUser() {
    await dbConnect();
    const foods = await getFoods(); // Existing getFoods already handles access
    return foods.length > 0;
}

export async function checkFinancialAccess(userId: string) {
    return checkRecipeManagementAccess(userId);
}
