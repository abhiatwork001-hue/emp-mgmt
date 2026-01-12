"use server";

import dbConnect from "@/lib/db";
import { Store, IStore, Company } from "@/lib/models";
import { revalidatePath } from "next/cache";
import { logAction } from "./log.actions";
import { pusherServer } from "../pusher";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { slugify } from "@/lib/utils";

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
    const stores = await Store.find({ active: true }).select("name address translations").lean();
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
        // Lookup manager details (assuming managers[0] is the main manager)
        {
            $lookup: {
                from: "employees",
                let: { managerId: { $arrayElemAt: ["$managers", 0] } },
                pipeline: [
                    { $match: { $expr: { $eq: ["$_id", "$$managerId"] } } },
                    { $project: { firstName: 1, lastName: 1, email: 1 } }
                ],
                as: "managerDetails"
            }
        },
        {
            $addFields: {
                employeeCount: { $size: { $ifNull: ["$employees_list", []] } },
                departmentCount: { $size: { $ifNull: ["$departments_list", []] } },
                manager: { $arrayElemAt: ["$managerDetails", 0] }
            }
        },
        {
            $project: {
                departments_list: 0,
                employees_list: 0,
                managerDetails: 0
            }
        }
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
        }
    ]);
    return JSON.parse(JSON.stringify(stores));
}

/**
 * Get departments for a specific store
 */
export async function getStoreDepartments(storeId: string) {
    console.log("Fetching departments for store:", storeId);
    try {
        await dbConnect();
        const { StoreDepartment } = require("@/lib/models");
        const departments = await StoreDepartment.find({ storeId }).select("name").lean();
        console.log(`Found ${departments.length} departments`);
        return JSON.parse(JSON.stringify(departments));
    } catch (error) {
        console.error("Error fetching store departments:", error);
        return [];
    }
}

/**
 * Get single store by ID
 */
export async function getStoreById(storeId: string) {
    await dbConnect();
    const { Employee } = require("@/lib/models");

    const store = await Store.findById(storeId)
        .populate({
            path: "managers",
            select: "firstName lastName email image positionId",
            populate: { path: "positionId", select: "name" }
        })
        .populate({
            path: "subManagers",
            select: "firstName lastName email image positionId",
            populate: { path: "positionId", select: "name" }
        })
        .lean();

    if (!store) return null;
    return JSON.parse(JSON.stringify(store));
}

export async function getStoreBySlug(slug: string) {
    await dbConnect();
    const { Employee } = require("@/lib/models");
    const mongoose = require("mongoose");

    let query: any = { slug };

    // If it looks like an ObjectId, allow finding by ID as fallback/alternative
    if (mongoose.Types.ObjectId.isValid(slug)) {
        query = { $or: [{ slug }, { _id: slug }] };
    }

    const store = await Store.findOne(query)
        .populate({
            path: "managers",
            select: "firstName lastName email image positionId",
            populate: { path: "positionId", select: "name" }
        })
        .populate({
            path: "subManagers",
            select: "firstName lastName email image positionId",
            populate: { path: "positionId", select: "name" }
        })
        .populate({
            path: "departments",
            select: "name _id"
        })
        .lean();

    if (!store) return null;
    return JSON.parse(JSON.stringify(store));
}

/**
 * Create a new store
 */
export async function createStore(data: StoreData) {
    await dbConnect();

    // Automatically assign the first company found
    const company = await Company.findOne();
    if (!company) {
        throw new Error("No company found in database. Cannot create store without a company.");
    }

    if (data.name) {
        data.slug = slugify(data.name);
        // Ensure uniqueness
        let count = 1;
        let finalSlug = data.slug;
        while (await Store.findOne({ slug: finalSlug })) {
            finalSlug = `${data.slug}-${count++}`;
        }
        data.slug = finalSlug;
    }

    const newStore = await Store.create({
        ...data,
        companyId: company._id,
        active: true // Ensure new stores are active by default
    });

    // Link store to company
    await Company.findByIdAndUpdate(company._id, {
        $push: { branches: newStore._id }
    });

    revalidatePath("/dashboard/stores");

    const session = await getServerSession(authOptions);
    if (session?.user) {
        await logAction({
            action: 'CREATE_STORE',
            performedBy: (session.user as any).id,
            storeId: newStore._id.toString(),
            targetId: newStore._id,
            targetModel: 'Store',
            details: { name: newStore.name }
        });
    }

    await pusherServer.trigger("global", "store:updated", {
        storeId: newStore._id,
        status: 'created'
    });

    return JSON.parse(JSON.stringify(newStore));
}

/**
 * Update a store
 */
export async function updateStore(storeId: string, data: StoreData) {
    await dbConnect();
    if (data.name) {
        data.slug = slugify(data.name);
    }
    const updatedStore = await Store.findByIdAndUpdate(storeId, data, { new: true }).lean();

    revalidatePath("/dashboard/stores");
    if (updatedStore) {
        revalidatePath(`/dashboard/stores/${updatedStore.slug}`);

        const session = await getServerSession(authOptions);
        if (session?.user) {
            await logAction({
                action: 'UPDATE_STORE',
                performedBy: (session.user as any).id,
                storeId: storeId,
                targetId: storeId,
                targetModel: 'Store'
            });
        }
    }

    await pusherServer.trigger("global", "store:updated", {
        storeId: storeId,
        status: 'updated'
    });

    return JSON.parse(JSON.stringify(updatedStore));
}

/**
 * Archive (Soft Delete) a store
 */
export async function archiveStore(storeId: string) {
    await dbConnect();

    const archivedStore = await Store.findByIdAndUpdate(
        storeId,
        {
            active: false,
            archivedAt: new Date()
        },
        { new: true }
    ).lean();

    revalidatePath("/dashboard/stores");
    if (archivedStore) {
        revalidatePath(`/dashboard/stores/${archivedStore.slug}`);
    }

    const session = await getServerSession(authOptions);
    if (session?.user) {
        await logAction({
            action: 'ARCHIVE_STORE',
            performedBy: (session.user as any).id,
            storeId: storeId,
            targetId: storeId,
            targetModel: 'Store'
        });
    }

    await pusherServer.trigger("global", "store:updated", {
        storeId: storeId,
        status: 'archived'
    });

    return JSON.parse(JSON.stringify(archivedStore));
}

/**
 * Get available manager candidates (both store and global employees)
 */
export async function getAvailableManagerCandidates(storeId: string) {
    await dbConnect();
    const { Employee } = require("@/lib/models");

    const store = await Store.findById(storeId).select("managers subManagers").lean();
    if (!store) throw new Error("Store not found");

    // Get IDs to exclude (current managers + subManagers)
    const excludeIds = [
        ...(store.managers || []),
        ...(store.subManagers || [])
    ].map(id => id.toString());

    // Store Employees: Employees already in this store
    const storeEmployees = await Employee.find({
        storeId,
        active: true,
        _id: { $nin: excludeIds }
    })
        .select("firstName lastName email image positionId")
        .populate("positionId", "name")
        .lean();

    // Global Employees: Employees not in any store or in different stores
    const globalEmployees = await Employee.find({
        $or: [
            { storeId: { $exists: false } },
            { storeId: null },
            { storeId: { $ne: storeId } }
        ],
        active: true,
        _id: { $nin: excludeIds }
    })
        .select("firstName lastName email image positionId storeId")
        .populate("positionId", "name")
        .populate("storeId", "name")
        .lean();

    return {
        storeEmployees: JSON.parse(JSON.stringify(storeEmployees)),
        globalEmployees: JSON.parse(JSON.stringify(globalEmployees))
    };
}

/**
 * Helper: Find or create "Store Manager" position
 */
async function getOrCreateStoreManagerPosition() {
    const { Position } = require("@/lib/models");

    let position = await Position.findOne({ name: "Store Manager", active: true });

    if (!position) {
        position = await Position.create({
            name: "Store Manager",
            level: 8,
            permissions: [], // Permissions come from roles
            isStoreSpecific: false,
            active: true
        });
    }

    return position;
}

/**
 * Assign employee as store manager or sub-manager
 */
export async function assignStoreManager(
    storeId: string,
    employeeId: string,
    isSubManager: boolean = false,
    assignedBy?: string
) {
    await dbConnect();
    const { Employee } = require("@/lib/models");

    const employee = await Employee.findById(employeeId);
    if (!employee) throw new Error("Employee not found");

    const store = await Store.findById(storeId);
    if (!store) throw new Error("Store not found");

    // 1. If employee not in this store, assign them first
    if (!employee.storeId || employee.storeId.toString() !== storeId) {
        // Add to store
        employee.storeId = storeId;

        // Add to storeHistory
        if (!employee.storeHistory) employee.storeHistory = [];
        employee.storeHistory.push({
            storeId,
            from: new Date()
        });

        // Add to store.employees array
        await Store.findByIdAndUpdate(storeId, {
            $addToSet: { employees: employeeId }
        });
    }

    // 2. Add manager role if not present
    if (!employee.roles) employee.roles = [];
    if (!employee.roles.includes("manager")) {
        employee.roles.push("manager");
    }

    // 3. Get/Create Store Manager position
    const managerPosition = await getOrCreateStoreManagerPosition();

    // 4. Close previous position history if exists
    if (employee.positionHistory && employee.positionHistory.length > 0) {
        const lastHistory = employee.positionHistory[employee.positionHistory.length - 1];
        if (!lastHistory.to) {
            lastHistory.to = new Date();
        }
    }

    // 5. Update position and add to history
    employee.positionId = managerPosition._id;
    if (!employee.positionHistory) employee.positionHistory = [];
    employee.positionHistory.push({
        positionId: managerPosition._id,
        storeId,
        from: new Date(),
        assignedBy: assignedBy || undefined,
        reason: isSubManager ? "Assigned as Sub-Manager" : "Assigned as Store Manager"
    });

    await employee.save();

    // 6. Add to store.managers or store.subManagers
    const updateField = isSubManager ? "subManagers" : "managers";
    await Store.findByIdAndUpdate(storeId, {
        $addToSet: { [updateField]: employeeId }
    });

    const session = await getServerSession(authOptions);
    await logAction({
        action: isSubManager ? 'ASSIGN_SUB_MANAGER' : 'ASSIGN_MANAGER',
        performedBy: assignedBy || (session?.user as any)?.id || 'SYSTEM',
        storeId,
        targetId: employeeId,
        targetModel: 'Employee',
        details: { storeId }
    });

    revalidatePath(`/dashboard/stores/${store.slug}`);
    return { success: true };
}

/**
 * Remove employee from store manager/sub-manager role
 */
export async function removeStoreManager(storeId: string, employeeId: string, isSubManager: boolean = false) {
    await dbConnect();
    const { Employee } = require("@/lib/models");

    // 1. Remove from store.managers or store.subManagers
    const updateField = isSubManager ? "subManagers" : "managers";
    await Store.findByIdAndUpdate(storeId, {
        $pull: { [updateField]: employeeId }
    });

    // 2. Check if employee is still a manager in ANY store
    const stores = await Store.find({
        $or: [
            { managers: employeeId },
            { subManagers: employeeId }
        ]
    });

    // 3. If not a manager anywhere, remove "manager" role and close position
    if (stores.length === 0) {
        // Fetch employee first to get current state (including positionId)
        const employee = await Employee.findById(employeeId);

        if (employee) {
            // Remove "manager" role
            if (employee.roles && employee.roles.includes("manager")) {
                employee.roles = employee.roles.filter((r: string) => r !== "manager");
            }

            // Close Position History
            // We do this BEFORE unsetting positionId so we implicitly know this history entry is ending now.
            if (employee.positionHistory && employee.positionHistory.length > 0) {
                const lastHistory = employee.positionHistory[employee.positionHistory.length - 1];
                if (!lastHistory.to) {
                    lastHistory.to = new Date();
                    // Explicitly mark array as modified if needed, though direct obj mod usually tracks in Mongoose
                }
            }

            // Unset Position
            employee.positionId = undefined;

            await employee.save();
        }
    }

    revalidatePath(`/dashboard/stores/${storeId}`);
    revalidatePath(`/dashboard/employees/${employeeId}`);
    return { success: true };
}

/**
 * Remove a StoreDepartment from a Store
 * This will:
 * - Unassign all employees from the department (set storeDepartmentId to null)
 * - Cancel pending coverage requests for the department
 * - Remove department from store's departments array
 * - Delete the StoreDepartment document
 */
export async function removeStoreDepartment(
    storeId: string,
    storeDepartmentId: string
) {
    await dbConnect();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    // 1. Verify department exists and belongs to this store
    const { StoreDepartment } = await import("@/lib/models");
    const storeDept = await StoreDepartment.findById(storeDepartmentId).lean();

    if (!storeDept) {
        throw new Error("Department not found");
    }

    if (storeDept.storeId.toString() !== storeId) {
        throw new Error("Department does not belong to this store");
    }

    // 2. Get affected employees count
    const { Employee } = await import("@/lib/models");
    const affectedEmployees = await Employee.find({
        storeDepartmentId
    }).select("_id firstName lastName").lean();

    // 3. Update employees - set storeDepartmentId to null
    await Employee.updateMany(
        { storeDepartmentId },
        { $set: { storeDepartmentId: null } }
    );

    // 4. Cancel pending coverage requests (if coverage model exists)
    try {
        const { ShiftCoverageRequest } = await import("@/lib/models");
        await ShiftCoverageRequest.updateMany(
            {
                storeDepartmentId,
                status: "pending"
            },
            { $set: { status: "cancelled", cancelledAt: new Date() } }
        );
    } catch (error) {
        // Coverage model might not exist, continue
        console.log("Coverage requests not updated:", error);
    }

    // 5. Remove department from store's departments array
    // Virtual field, no need to pull.

    // 6. Delete the StoreDepartment
    await StoreDepartment.findByIdAndDelete(storeDepartmentId);

    // 7. Log the action
    await logAction({
        performedBy: session.user.id,
        action: "delete_store_department",
        targetModel: "store_department",
        targetId: storeDepartmentId,
        details: {
            storeId,
            departmentName: storeDept.name,
            affectedEmployeesCount: affectedEmployees.length
        }
    });

    // 8. Get store for revalidation
    const store = await Store.findById(storeId).select("slug").lean();

    // 9. Revalidate paths
    revalidatePath("/dashboard/stores");
    if (store?.slug) {
        revalidatePath(`/dashboard/stores/${store.slug}`);
        revalidatePath(`/dashboard/stores/${store.slug}/edit`);
    }

    return {
        success: true,
        affectedEmployees: affectedEmployees.length,
        employeeNames: affectedEmployees.map((e: any) => `${e.firstName} ${e.lastName}`),
        message: `Department "${storeDept.name}" removed successfully. ${affectedEmployees.length} employees unassigned.`
    };
}

/**
 * Get count of employees and pending coverage requests for a department
 * Used before deletion to show confirmation dialog
 */
export async function getStoreDepartmentImpact(storeDepartmentId: string) {
    await dbConnect();

    const { Employee, StoreDepartment } = await import("@/lib/models");

    const [employeeCount, department] = await Promise.all([
        Employee.countDocuments({ storeDepartmentId }),
        StoreDepartment.findById(storeDepartmentId).select("name").lean()
    ]);

    let pendingCoverageCount = 0;
    try {
        const { ShiftCoverageRequest } = await import("@/lib/models");
        pendingCoverageCount = await ShiftCoverageRequest.countDocuments({
            storeDepartmentId,
            status: "pending"
        });
    } catch (error) {
        // Coverage model might not exist
    }

    return {
        departmentName: department?.name || "Unknown",
        employeeCount,
        pendingCoverageCount
    };
}
