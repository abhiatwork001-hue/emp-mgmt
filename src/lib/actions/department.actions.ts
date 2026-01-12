"use server";

import dbConnect from "@/lib/db";
import { GlobalDepartment, IGlobalDepartment } from "@/lib/models";
import { revalidatePath } from "next/cache";
import { logAction } from "./log.actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

// --- Types ---
type DepartmentData = Partial<IGlobalDepartment>;

// --- Actions ---

/**
 * Get all active global departments with stats
 */
export async function getAllGlobalDepartmentsWithStats() {
    await dbConnect();

    const departments = await GlobalDepartment.aggregate([
        // { $match: { active: true } }, // Returns all departments now
        {
            $lookup: {
                from: "storedepartments",
                localField: "_id",
                foreignField: "globalDepartmentId",
                as: "storeDepts"
            }
        },
        {
            $addFields: {
                // Count of stores that have this department (active StoreDepartments)
                storeCount: {
                    $size: {
                        $filter: {
                            input: "$storeDepts",
                            as: "sd",
                            cond: { $eq: ["$$sd.active", true] }
                        }
                    }
                },
                // Sum of employees in count across all these store departments
                employeeCount: {
                    $reduce: {
                        input: {
                            $filter: { // Only count employees in active store departments
                                input: "$storeDepts",
                                as: "sd",
                                cond: { $eq: ["$$sd.active", true] }
                            }
                        },
                        initialValue: 0,
                        in: { $add: ["$$value", { $size: { $ifNull: ["$$this.employees", []] } }] }
                    }
                }
            }
        },
        {
            $project: {
                storeDepts: 0 // Remove heavy array
            }
        }
    ]);

    return JSON.parse(JSON.stringify(departments));
}

/**
 * Get simple list of all global departments
 */
export async function getAllGlobalDepartments() {
    await dbConnect();
    const departments = await GlobalDepartment.find({ active: true }).select("name translations slug").lean();
    return JSON.parse(JSON.stringify(departments));
}

/**
 * Get all global departments where employee is a head
 */
export async function getGlobalDepartmentsByHead(employeeId: string) {
    await dbConnect();
    const departments = await GlobalDepartment.find({
        departmentHead: employeeId,
        active: true
    }).select("name slug translations").lean();
    return JSON.parse(JSON.stringify(departments));
}

/**
 * Get global department by ID with stats
 */
export async function getGlobalDepartmentById(id: string) {
    await dbConnect();
    const mongoose = require("mongoose");
    const { Employee, StoreDepartment } = require("@/lib/models");

    // 1. Get Department Stats (Aggregation)
    const departments = await GlobalDepartment.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(id), active: true } },
        {
            $lookup: {
                from: "storedepartments",
                localField: "_id",
                foreignField: "globalDepartmentId",
                pipeline: [
                    {
                        $lookup: {
                            from: "stores",
                            localField: "storeId",
                            foreignField: "_id",
                            as: "storeInfo"
                        }
                    },
                    { $unwind: "$storeInfo" }
                ],
                as: "storeDepts"
            }
        },
        {
            $addFields: {
                storeCount: {
                    $size: {
                        $filter: {
                            input: "$storeDepts",
                            as: "sd",
                            cond: { $eq: ["$$sd.active", true] }
                        }
                    }
                },
                employeeCount: {
                    $reduce: {
                        input: {
                            $filter: {
                                input: "$storeDepts",
                                as: "sd",
                                cond: { $eq: ["$$sd.active", true] }
                            }
                        },
                        initialValue: 0,
                        in: { $add: ["$$value", { $size: { $ifNull: ["$$this.employees", []] } }] }
                    }
                }
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                slug: 1,
                description: 1,
                hasHead: 1,
                departmentHead: 1,  // New field
                subHead: 1,  // New field
                employees: 1,  // Employee tracking
                defaultPositions: 1,
                active: 1,
                createdAt: 1,
                updatedAt: 1,
                __v: 1,
                translations: 1,
                storeDepts: 1,
                storeCount: 1,
                employeeCount: 1
            }
        }
    ]);

    if (!departments.length) return null;

    const dept = JSON.parse(JSON.stringify(departments[0]));

    // 2. Fetch Employees separately (cleaner than massive aggregation)
    // Get all valid storeDepartment IDs for this global department
    const validStoreDeptIds = dept.storeDepts
        .filter((sd: any) => sd.active)
        .map((sd: any) => sd._id);

    // Find employees in these store departments
    // Also populate store to see which store they are in
    const employees = await Employee.find({
        storeDepartmentId: { $in: validStoreDeptIds },
        active: true
    })
        .select("firstName lastName email image positionId storeId")
        .populate("positionId", "name")
        .populate("storeId", "name")
        .lean();


    dept.employees = JSON.parse(JSON.stringify(employees));
    delete dept.storeDepts; // Clean up

    // 3. Populate departmentHead with employee details


    if (dept.departmentHead && dept.departmentHead.length > 0) {
        const heads = await Employee.find({
            _id: { $in: dept.departmentHead }
        })
            .select("firstName lastName email image positionId storeId")
            .populate("positionId", "name")
            .populate("storeId", "name")
            .lean();

        dept.departmentHead = JSON.parse(JSON.stringify(heads));
    }

    // 4. Populate subHead with employee details
    if (dept.subHead && dept.subHead.length > 0) {
        const subHeads = await Employee.find({
            _id: { $in: dept.subHead }
        })
            .select("firstName lastName email image positionId storeId")
            .populate("positionId", "name")
            .populate("storeId", "name")
            .lean();

        dept.subHead = JSON.parse(JSON.stringify(subHeads));
    }


    return dept;
}

export async function getGlobalDepartmentBySlug(slug: string, includeStats = true) {
    await dbConnect();
    const deptDoc = await GlobalDepartment.findOne({ slug, active: true }).lean();
    if (!deptDoc) return null;

    if (includeStats) {
        return getGlobalDepartmentById(deptDoc._id.toString());
    }

    return JSON.parse(JSON.stringify(deptDoc));
}

/**
 * Create a new global department
 */
export async function createGlobalDepartment(data: DepartmentData) {
    await dbConnect();

    if (data.name) {
        data.slug = slugify(data.name);
        // Ensure uniqueness
        let count = 1;
        let finalSlug = data.slug;
        while (await GlobalDepartment.findOne({ slug: finalSlug })) {
            finalSlug = `${data.slug}-${count++}`;
        }
        data.slug = finalSlug;
    }

    const newDepartment = await GlobalDepartment.create({
        ...data,
        active: true
    });

    revalidatePath("/dashboard/departments");

    const session = await getServerSession(authOptions);
    if (session?.user) {
        await logAction({
            action: 'CREATE_GLOBAL_DEPT',
            performedBy: (session.user as any).id,
            targetId: newDepartment._id.toString(),
            targetModel: 'GlobalDepartment',
            details: { name: newDepartment.name }
        });
    }

    return JSON.parse(JSON.stringify(newDepartment));
}

/**
 * Update a global department
 */
export async function updateGlobalDepartment(id: string, data: DepartmentData) {
    await dbConnect();

    // If name changes, regenerate slug but ensure uniqueness (excluding self)
    if (data.name) {
        data.slug = slugify(data.name);

        // Ensure uniqueness
        let count = 1;
        let finalSlug = data.slug;
        // Check if slug exists AND it's not THIS document
        while (await GlobalDepartment.findOne({ slug: finalSlug, _id: { $ne: id } })) {
            finalSlug = `${data.slug}-${count++}`;
        }
        data.slug = finalSlug;
    }

    const updatedDepartment = await GlobalDepartment.findByIdAndUpdate(id, data, { new: true }).lean();

    revalidatePath("/dashboard/departments");
    if (updatedDepartment) {
        revalidatePath(`/dashboard/departments/${updatedDepartment.slug}`);
    }

    const session = await getServerSession(authOptions);
    if (session?.user) {
        await logAction({
            action: 'UPDATE_GLOBAL_DEPT',
            performedBy: (session.user as any).id,
            targetId: id,
            targetModel: 'GlobalDepartment',
            details: { name: updatedDepartment?.name }
        });
    }

    return JSON.parse(JSON.stringify(updatedDepartment));
}

/**
 * Archive (Soft Delete) a global department
 */
export async function archiveGlobalDepartment(id: string) {
    await dbConnect();

    const archived = await GlobalDepartment.findByIdAndUpdate(
        id,
        {
            active: false,
            archivedAt: new Date()
        },
        { new: true }
    ).lean();

    revalidatePath("/dashboard/departments");
    if (archived) {
        revalidatePath(`/dashboard/departments/${archived.slug}`);
    }

    const session = await getServerSession(authOptions);
    if (session?.user) {
        await logAction({
            action: 'ARCHIVE_GLOBAL_DEPT',
            performedBy: (session.user as any).id,
            targetId: id,
            targetModel: 'GlobalDepartment',
            details: { name: archived?.name }
        });
    }

    return JSON.parse(JSON.stringify(archived));
}

/**
 * Get available candidates for global department head
 */
export async function getAvailableGlobalDepartmentHeadCandidates(departmentId: string) {
    await dbConnect();

    // Permission Check
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");
    const { getEmployeeById } = await import("@/lib/actions/employee.actions");
    const currentUser = await getEmployeeById((session.user as any).id);
    const roles = (currentUser?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
    const canManage = roles.some((r: string) => ["admin", "owner", "hr", "tech", "super_user"].includes(r));
    if (!canManage) {
        const locale = await getLocale();
        redirect(`/${locale}/access-denied`);
    }

    const { Employee, GlobalDepartment } = require("@/lib/models");

    const department = await GlobalDepartment.findById(departmentId).select("departmentHead subHead").lean();
    if (!department) throw new Error("Department not found");

    // Get IDs to exclude (current heads and sub heads)
    const excludeIds = [
        ...(department.departmentHead || []).map((id: any) => id.toString()),
        ...(department.subHead || []).map((id: any) => id.toString())
    ];

    // Get all active employees not currently assigned as heads
    const employees = await Employee.find({
        active: true,
        _id: { $nin: excludeIds }
    })
        .select("firstName lastName email image positionId storeId")
        .populate("positionId", "name")
        .populate("storeId", "name")
        .lean();

    return JSON.parse(JSON.stringify(employees));
}

/**
 * Assign employee as global department head
 */
export async function assignGlobalDepartmentHead(departmentId: string, employeeId: string) {
    try {
        await dbConnect();

        // Permission Check
        const session = await getServerSession(authOptions);
        if (!session?.user) redirect("/login");
        const { getEmployeeById } = await import("@/lib/actions/employee.actions");
        const currentUser = await getEmployeeById((session.user as any).id);
        const roles = (currentUser?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
        const canManage = roles.some((r: string) => ["admin", "owner", "hr", "tech", "super_user"].includes(r));
        if (!canManage) {
            const locale = await getLocale();
            redirect(`/${locale}/access-denied`);
        }

        const { Employee, GlobalDepartment } = require("@/lib/models");

        const employee = await Employee.findById(employeeId);
        if (!employee) {
            throw new Error("Employee not found");
        }

        const department = await GlobalDepartment.findById(departmentId);
        if (!department) {
            throw new Error("Department not found");
        }

        // Add globalDepartmentHead role if not present
        if (!employee.roles) employee.roles = [];
        if (!employee.roles.includes("globalDepartmentHead")) {
            employee.roles.push("globalDepartmentHead");
        }

        await employee.save();

        // Initialize departmentHead if it doesn't exist
        if (!department.departmentHead) {
            department.departmentHead = [];
        }

        // Add to department.departmentHead array if not already there
        if (!department.departmentHead.includes(employeeId)) {
            department.departmentHead.push(employeeId);
        }

        // Also add to employees array if not already there
        if (!department.employees) {
            department.employees = [];
        }
        if (!department.employees.includes(employeeId)) {
            department.employees.push(employeeId);
        }

        await department.save();

        revalidatePath(`/dashboard/departments/${department.slug}`);

        // reused session variable defined at top of function
        if (session?.user) {
            await logAction({
                action: 'ASSIGN_GLOBAL_DEPT_HEAD',
                performedBy: (session.user as any).id,
                targetId: employeeId,
                targetModel: 'Employee',
                details: { departmentId, departmentName: department.name }
            });
        }

        return { success: true };
    } catch (error) {
        throw error;
    }
}

/**
 * Assign employee as global department sub head
 */
export async function assignGlobalDepartmentSubHead(departmentId: string, employeeId: string) {
    try {
        await dbConnect();

        // Permission Check
        const session = await getServerSession(authOptions);
        if (!session?.user) redirect("/login");
        const { getEmployeeById } = await import("@/lib/actions/employee.actions");
        const currentUser = await getEmployeeById((session.user as any).id);
        const roles = (currentUser?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
        const canManage = roles.some((r: string) => ["admin", "owner", "hr", "tech", "super_user"].includes(r));
        if (!canManage) {
            const locale = await getLocale();
            redirect(`/${locale}/access-denied`);
        }

        const { Employee, GlobalDepartment } = require("@/lib/models");

        const employee = await Employee.findById(employeeId);
        if (!employee) {
            throw new Error("Employee not found");
        }

        const department = await GlobalDepartment.findById(departmentId);
        if (!department) {
            throw new Error("Department not found");
        }

        // Add globalDepartmentSubHead role if not present
        if (!employee.roles) employee.roles = [];
        if (!employee.roles.includes("globalDepartmentSubHead")) {
            employee.roles.push("globalDepartmentSubHead");
        }

        await employee.save();

        // Initialize subHead if it doesn't exist
        if (!department.subHead) {
            department.subHead = [];
        }

        // Add to department.subHead array if not already there
        if (!department.subHead.includes(employeeId)) {
            department.subHead.push(employeeId);
        }

        // Also add to employees array if not already there
        if (!department.employees) {
            department.employees = [];
        }
        if (!department.employees.includes(employeeId)) {
            department.employees.push(employeeId);
        }

        await department.save();

        revalidatePath(`/dashboard/departments/${department.slug}`);

        // reused session variable defined at top of function
        if (session?.user) {
            await logAction({
                action: 'ASSIGN_GLOBAL_DEPT_SUBHEAD',
                performedBy: (session.user as any).id,
                targetId: employeeId,
                targetModel: 'Employee',
                details: { departmentId, departmentName: department.name }
            });
        }

        return { success: true };
    } catch (error) {
        throw error;
    }
}

/**
 * Remove employee from global department head role
 */
export async function removeGlobalDepartmentHead(departmentId: string, employeeId: string) {
    await dbConnect();

    // Permission Check
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");
    const { getEmployeeById } = await import("@/lib/actions/employee.actions");
    const currentUser = await getEmployeeById((session.user as any).id);
    const roles = (currentUser?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
    const canManage = roles.some((r: string) => ["admin", "owner", "hr", "tech", "super_user"].includes(r));
    if (!canManage) {
        const locale = await getLocale();
        redirect(`/${locale}/access-denied`);
    }

    const { Employee, GlobalDepartment } = require("@/lib/models");

    const department = await GlobalDepartment.findById(departmentId);
    if (!department) throw new Error("Department not found");

    // Remove from department.departmentHead
    await GlobalDepartment.findByIdAndUpdate(departmentId, {
        $pull: { departmentHead: employeeId }
    });

    // Check if employee is head of any other global department
    const departments = await GlobalDepartment.find({
        departmentHead: employeeId
    });

    // If not a head anywhere, remove the role
    if (departments.length === 0) {
        await Employee.findByIdAndUpdate(employeeId, {
            $pull: { roles: "globalDepartmentHead" }
        });
    }

    revalidatePath(`/dashboard/departments/${department.slug}`);

    // reused session variable defined at top of function
    if (session?.user) {
        await logAction({
            action: 'REMOVE_GLOBAL_DEPT_HEAD',
            performedBy: (session.user as any).id,
            targetId: employeeId,
            targetModel: 'Employee',
            details: { departmentId }
        });
    }

    return { success: true };
}

/**
 * Remove employee from global department sub head role
 */
export async function removeGlobalDepartmentSubHead(departmentId: string, employeeId: string) {
    await dbConnect();

    // Permission Check
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");
    const { getEmployeeById } = await import("@/lib/actions/employee.actions");
    const currentUser = await getEmployeeById((session.user as any).id);
    const roles = (currentUser?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
    const canManage = roles.some((r: string) => ["admin", "owner", "hr", "tech", "super_user"].includes(r));
    if (!canManage) {
        const locale = await getLocale();
        redirect(`/${locale}/access-denied`);
    }

    const { Employee, GlobalDepartment } = require("@/lib/models");

    const department = await GlobalDepartment.findById(departmentId);
    if (!department) throw new Error("Department not found");

    // Remove from department.subHead
    await GlobalDepartment.findByIdAndUpdate(departmentId, {
        $pull: { subHead: employeeId }
    });

    // Check if employee is sub head of any other global department
    const departments = await GlobalDepartment.find({
        subHead: employeeId
    });

    // If not a sub head anywhere, remove the role
    if (departments.length === 0) {
        await Employee.findByIdAndUpdate(employeeId, {
            $pull: { roles: "globalDepartmentSubHead" }
        });
    }

    revalidatePath(`/dashboard/departments/${department.slug}`);

    // reused session variable defined at top of function
    if (session?.user) {
        await logAction({
            action: 'REMOVE_GLOBAL_DEPT_SUBHEAD',
            performedBy: (session.user as any).id,
            targetId: employeeId,
            targetModel: 'Employee',
            details: { departmentId }
        });
    }

    return { success: true };
}
