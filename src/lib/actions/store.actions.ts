"use server";

import dbConnect from "@/lib/db";
import { Store, IStore, Company } from "@/lib/models";
import { revalidatePath } from "next/cache";
import { logAction } from "./log.actions";
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
    // Aggregation to count departments
    // Store has 'employees' array, so size of that is employee count.
    // StoreDepartment has 'storeId', so we need to reverse lookup or lookups.

    const stores = await Store.aggregate([
        // { $match: { active: true } }, // Returns all stores now
        {
            $lookup: {
                from: "storedepartments", // collection name for StoreDepartment
                localField: "_id",
                foreignField: "storeId",
                as: "departments"
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
                employeeCount: { $size: { $ifNull: ["$employees", []] } },
                departmentCount: { $size: { $ifNull: ["$departments", []] } },
                manager: { $arrayElemAt: ["$managerDetails", 0] } // Flatten array to object
            }
        },
        {
            $project: {
                departments: 0, // Remove heavy arrays
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

    const store = await Store.findOne({ slug })
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
