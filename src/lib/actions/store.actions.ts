"use server";

import { Store, IStore, Company, Employee, StoreDepartment, Position, ShiftCoverageRequest } from "@/lib/models";
import { revalidatePath } from "next/cache";
import { Types } from "mongoose";
import { logAction } from "./log.actions";
import { pusherServer } from "../pusher";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import dbConnect from "@/lib/db";

// --- Types ---
// Helper type for Create/Update payloads
type StoreData = Partial<IStore>;

// --- Actions ---

/**
 * Get all active stores
 */
export async function getAllStores() {
    await dbConnect();
    // Only return active stores by default
    const stores = await Store.find({ active: true }).select("name address translations managers").lean();
    return JSON.parse(JSON.stringify(stores));
}

/**
 * Get all active stores with stats (employee count, department count)
 */
export async function getAllStoresWithStats() {
    await dbConnect();
    // Aggregation to count departments and employees dynamically
    const stores = await Store.aggregate([
        // { $match: { active: true } }, 
        {
            $lookup: {
                from: "storedepartments",
                localField: "_id",
                foreignField: "storeId",
                as: "departments_list"
            }
        },
        // Lookup employees where storeId matches store._id
        {
            $lookup: {
                from: "employees",
                localField: "_id",
                foreignField: "storeId",
                pipeline: [{ $project: { _id: 1 } }], // Fetch only IDs for performance
                as: "employees_list"
            }
        },
        {
            $project: {
                name: 1,
                slug: 1, // Ensure slug is returned
                address: 1,
                active: 1,
                googleRating: 1,
                googleUserRatingsTotal: 1,
                departmentsCount: { $size: "$departments_list" },
                employeesCount: { $size: "$employees_list" }
            }
        },
        { $sort: { active: -1, name: 1 } }
    ]);
    return JSON.parse(JSON.stringify(stores));
}

/**
 * Get all active stores with their departments
 */
export async function getStoresWithDepartments() {
    await dbConnect();
    const stores = await Store.aggregate([
        { $match: { active: true } },
        {
            $lookup: {
                from: "storedepartments",
                localField: "_id",
                foreignField: "storeId",
                as: "departments"
            }
        },
        {
            $project: {
                name: 1,
                departments: { _id: 1, name: 1 }
            }
        },
        { $sort: { name: 1 } }
    ]);
    return JSON.parse(JSON.stringify(stores));
}

/**
 * Get departments for a specific store
 */
export async function getStoreDepartments(storeId: string) {
    if (!storeId) return [];
    await dbConnect();
    const departments = await StoreDepartment.find({ storeId, active: true })
        .select("name minEmployees maxEmployees targetEmployees minWeeklyHours maxWeeklyHours targetWeeklyHours")
        .lean();
    return JSON.parse(JSON.stringify(departments));
}

export async function getStoreById(storeId: string) {
    await dbConnect();
    const store = await Store.findById(storeId).populate("managers", "firstName lastName image email").lean();
    if (!store) return null;

    // Get departments
    // Get departments
    const departments = await StoreDepartment.find({ storeId: store._id, active: true }).lean();

    return JSON.parse(JSON.stringify({ ...store, departments }));
}

export async function getStoreBySlug(slug: string) {
    await dbConnect();
    const store = await Store.findOne({ slug }).populate("managers", "firstName lastName image email").lean();
    if (!store) return null;

    // Get departments
    // Get departments
    const departments = await StoreDepartment.find({ storeId: store._id, active: true }).populate("headOfDepartment", "firstName lastName image").lean();

    return JSON.parse(JSON.stringify({ ...store, departments }));
}

export async function createStore(data: StoreData) {
    try {
        await dbConnect();
        const session = await getServerSession(authOptions);

        if (data.name) {
            data.slug = slugify(data.name);
        }

        const newStore = await Store.create(data);

        await logAction({
            action: 'create',
            performedBy: session?.user?.id || 'system',
            storeId: newStore._id.toString(),
            targetId: newStore._id,
            targetModel: 'store',
            details: { data, message: `Created store: ${newStore.name}` }
        });

        revalidatePath("/dashboard/stores");
        revalidatePath("/dashboard/stores");
        return JSON.parse(JSON.stringify(newStore));
    } catch (e) {
        throw e;
    }
}

export async function updateStore(storeId: string, data: StoreData) {
    try {
        await dbConnect();
        const session = await getServerSession(authOptions);

        if (data.name) {
            data.slug = slugify(data.name);
        }

        const updatedStore = await Store.findByIdAndUpdate(storeId, data, { new: true });

        await logAction({
            action: 'update',
            performedBy: session?.user?.id || 'system',
            storeId: storeId,
            targetId: storeId,
            targetModel: 'store',
            details: { data, message: `Updated store: ${updatedStore.name}` }
        });

        revalidatePath("/dashboard/stores");
        revalidatePath(`/dashboard/stores/${updatedStore.slug}`);
        return JSON.parse(JSON.stringify(updatedStore));
    } catch (e) {
        throw e;
    }
}

export async function archiveStore(storeId: string) {
    try {
        await dbConnect();
        const session = await getServerSession(authOptions);

        await Store.findByIdAndUpdate(storeId, { active: false });

        await logAction({
            action: 'archive',
            performedBy: session?.user?.id || 'system',
            storeId: storeId,
            targetId: storeId,
            targetModel: 'store',
            details: { message: `Archived store` }
        });

        revalidatePath("/dashboard/stores");
        return { success: true, message: "Store archived successfully" };
    } catch (e) {
        throw e;
    }
}

export async function getAvailableManagerCandidates(storeId: string) {
    await dbConnect();
    // Get all employees who are NOT currently managers of this store? 
    // Actually typically we want a list of employees to search from.
    // For now, return all active employees in this store OR global employees (managers can be from anywhere)
    // For now, return all active employees in this store OR global employees (managers can be from anywhere)
    // Let's just return all employees for autocomplete.

    // Maybe filter out those who are ALREADY managers of this store
    const store = await Store.findById(storeId).select('managers');
    const managerIds = store?.managers || [];

    const candidates = await Employee.find({
        active: true,
        _id: { $nin: managerIds }
    })
        .select("firstName lastName email image positionId")
        .populate("positionId", "name")
        .limit(20)
        .lean();

    return JSON.parse(JSON.stringify(candidates));
}

export async function getOrCreateStoreManagerPosition() {
    await dbConnect();
    let pos = await Position.findOne({ slug: 'store-manager' });
    if (!pos) {
        pos = await Position.create({
            name: "Store Manager",
            slug: "store-manager",
            level: 10,
            roles: ["store_manager"],
            description: "System generated role for Store Managers"
        });
    }
    return pos;
}

export async function assignStoreManager(storeId: string, employeeId: string, isSubManager: boolean = false, assignedBy?: string) {
    await dbConnect();

    // 1. Add to Store.managers
    const store = await Store.findByIdAndUpdate(storeId, {
        $addToSet: { managers: employeeId }
    }, { new: true });

    // 2. Add 'store_manager' role to employee if not present? 
    // Ideally we should assign them the "Store Manager" Position or add the Role to their current position?
    // A simpler way: Add "Store Manager" as a secondary position or just ensure they have the role.
    // Our system supports `positions` array (multiple positions).

    // Let's get "Store Manager" position
    const managerPos = await getOrCreateStoreManagerPosition();

    await Employee.findByIdAndUpdate(employeeId, {
        $addToSet: { positions: managerPos._id }
    });

    // Notify
    // ...

    await logAction({
        action: 'assign_manager',
        performedBy: assignedBy || 'system',
        storeId: storeId,
        targetId: storeId,
        targetModel: 'store',
        details: { employeeId, message: `Assigned manager ${employeeId} to store ${store.name}` }
    });

    revalidatePath(`/dashboard/stores/${store.slug}`);
    revalidatePath(`/dashboard/employees/${employeeId}`); // Revalidate employee profile
    return { success: true, message: "Manager assigned successfully" };
}

export async function removeStoreManager(storeId: string, employeeId: string, _isSubManager: boolean = false) {
    await dbConnect();

    await Store.findByIdAndUpdate(storeId, {
        $pull: { managers: employeeId }
    });

    // We might want to remove the Position "Store Manager" from the employee if they don't manage any other stores?
    // Check if they manage other stores
    const otherStores = await Store.countDocuments({ managers: employeeId });
    if (otherStores === 0) {
        const managerPos = await getOrCreateStoreManagerPosition();
        await Employee.findByIdAndUpdate(employeeId, {
            $pull: { positions: managerPos._id }
        });
    }

    revalidatePath(`/dashboard/stores`);
    return { success: true, message: "Manager removed successfully" };
}

export async function removeStoreDepartment(storeId: string, storeDepartmentId: string) {
    await dbConnect();

    // 1. Verify existence
    const dept = await StoreDepartment.findOne({ _id: storeDepartmentId, storeId });
    if (!dept) throw new Error("Department not found in this store");

    // 2. Get impact for internal log
    // const employeesCount = await Employee.countDocuments({ storeDepartmentId });

    // 4. Update Employees: Set storeDepartmentId to null
    await Employee.updateMany(
        { storeDepartmentId },
        { $unset: { storeDepartmentId: "" } }
    );

    // 5. Delete Department
    await StoreDepartment.deleteOne({ _id: storeDepartmentId });

    revalidatePath(`/dashboard/stores`);
    return { success: true, message: "Department removed successfully" };
}

export async function getStoreDepartmentImpact(storeDepartmentId: string) {
    await dbConnect();

    const employees = await Employee.countDocuments({ storeDepartmentId });
    const pendingRequests = await ShiftCoverageRequest.countDocuments({
        "originalShift.storeDepartmentId": storeDepartmentId,
        status: { $in: ['seeking_coverage', 'pending_hr'] }
    });

    return { employeeCount: employees, pendingCoverageCount: pendingRequests };
}

/**
 * Get the store ID that the user manages.
 * Returns the first active store where the user is listed as a manager.
 */
export async function getStoreManagedByUser(userId: string | any) {
    await dbConnect();

    // Ensure we ignore invalid IDs
    if (!userId) return null;

    // Try finding where user is manager
    // Ensure we handle both string and ObjectId formats
    const targetId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;

    const store = await Store.findOne({
        managers: { $in: [userId, targetId] },
        active: true
    }).select("_id").lean();

    return JSON.parse(JSON.stringify(store));
}
/**
 * Update store's supplier alert preferences
 */
export async function updateStoreSupplierSettings(
    storeId: string,
    supplierId: string,
    alertOffset: number,
    ignored: boolean
) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    // 1. Fetch current settings
    const store = await Store.findById(storeId);
    if (!store) throw new Error("Store not found");

    const settings = store.settings || {
        supplierAlertPreferences: {
            defaultAlertOffset: 0,
            exceptions: []
        }
    };
    if (!settings.supplierAlertPreferences) {
        settings.supplierAlertPreferences = {
            defaultAlertOffset: 0,
            exceptions: []
        };
    }

    // 2. Update exception list
    const exceptions = settings.supplierAlertPreferences.exceptions || [];
    const index = exceptions.findIndex((e: any) => e.supplierId.toString() === supplierId);

    if (index > -1) {
        exceptions[index].alertOffset = alertOffset;
        exceptions[index].ignored = ignored;
    } else {
        exceptions.push({
            supplierId: new Types.ObjectId(supplierId),
            alertOffset,
            ignored
        });
    }

    settings.supplierAlertPreferences.exceptions = exceptions;

    const updated = await Store.findByIdAndUpdate(storeId, {
        $set: { settings: settings }
    }, { new: true });

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/stores/${store.slug}`);

    return JSON.parse(JSON.stringify(updated));
}

