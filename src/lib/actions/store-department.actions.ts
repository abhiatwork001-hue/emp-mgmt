"use server";

import dbConnect from "@/lib/db";
import { StoreDepartment, GlobalDepartment, IStoreDepartment, Employee } from "@/lib/models";
import { revalidatePath } from "next/cache";
import { logAction } from "./log.actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { slugify } from "@/lib/utils";

// --- Types ---
type StoreDepartmentData = Partial<IStoreDepartment>;

export async function getStoreDepartments(storeId: string) {
    if (!storeId) return [];
    await dbConnect();
    // Return all departments (active and inactive) so we can manage them
    const depts = await StoreDepartment.find({ storeId })
        .populate("globalDepartmentId", "name description") // Populate global details
        .lean();
    return JSON.parse(JSON.stringify(depts));
}

export async function getAvailableGlobalDepartments(storeId: string) {
    if (!storeId) return [];
    await dbConnect();

    // 1. Get all active global departments
    const allGlobal = await GlobalDepartment.find({ active: true }).lean();

    // 2. Get all store departments for this store
    const existingStoreDepts = await StoreDepartment.find({ storeId, active: true }).select("globalDepartmentId").lean();

    // 3. Filter out global depts that are already linked
    const existingIds = existingStoreDepts.map((d: any) => d.globalDepartmentId?.toString());
    const available = allGlobal.filter((gd: any) => !existingIds.includes(gd._id.toString()));

    return JSON.parse(JSON.stringify(available));
}

export async function createStoreDepartment(storeId: string, globalDepartmentId: string) {
    await dbConnect();

    // Get global department details to copy generic name if needed
    const globalDept = await GlobalDepartment.findById(globalDepartmentId);
    if (!globalDept) throw new Error("Global Department not found");

    // Check if already exists (double check)
    const exists = await StoreDepartment.findOne({ storeId, globalDepartmentId, active: true });
    if (exists) throw new Error("Department already assigned to this store");

    const slugBase = slugify(globalDept.name);
    let finalSlug = slugBase;
    let count = 1;
    while (await StoreDepartment.findOne({ storeId, slug: finalSlug })) {
        finalSlug = `${slugBase}-${count++}`;
    }

    const newStoreDept = await StoreDepartment.create({
        storeId,
        globalDepartmentId,
        name: globalDept.name, // Default to global name
        slug: finalSlug,
        active: true
    });

    revalidatePath(`/dashboard/stores/${storeId}`);

    const session = await getServerSession(authOptions);
    if (session?.user) {
        await logAction({
            action: 'CREATE_STORE_DEPARTMENT',
            performedBy: (session.user as any).id,
            storeId: storeId,
            targetId: newStoreDept._id,
            targetModel: 'StoreDepartment',
            details: { name: newStoreDept.name }
        });
    }

    return JSON.parse(JSON.stringify(newStoreDept));
}

export async function getStoreDepartmentById(id: string) {
    await dbConnect();
    const dept = await StoreDepartment.findById(id)
        .populate("employees", "firstName lastName email image positionId") // basic info for list
        .populate("headOfDepartment", "firstName lastName email image positionId")
        .populate("subHead", "firstName lastName email image positionId")
        .populate({
            path: 'employees',
            populate: { path: 'positionId', select: 'name' }
        })
        .populate({
            path: "globalDepartmentId",
            select: "name description departmentHead subHead",
            populate: [
                { path: "departmentHead", select: "firstName lastName email image" },
                { path: "subHead", select: "firstName lastName email image" }
            ]
        })
        .lean();

    return JSON.parse(JSON.stringify(dept));
}

export async function getStoreDepartmentBySlug(storeId: string, slug: string) {
    await dbConnect();
    const { Types } = await import("mongoose");

    let query: any = { storeId, slug };

    // If slug is a valid ObjectId, allow finding by ID as well (fallback)
    if (Types.ObjectId.isValid(slug)) {
        query = {
            storeId,
            $or: [{ slug }, { _id: slug }]
        };
    }

    const deptDoc = await StoreDepartment.findOne(query).select("_id").lean();
    if (!deptDoc) {
        return null;
    }
    return getStoreDepartmentById(deptDoc._id.toString());
}

export async function updateStoreDepartment(id: string, data: StoreDepartmentData) {
    await dbConnect();

    const updatedDept = await StoreDepartment.findByIdAndUpdate(id, data, { new: true });

    if (updatedDept) {
        const store = await (require("@/lib/models").Store.findById(updatedDept.storeId).select("slug"));
        revalidatePath(`/dashboard/stores/${store?.slug || updatedDept.storeId}`);
        revalidatePath(`/dashboard/stores/${store?.slug || updatedDept.storeId}/departments/${updatedDept.slug}`);
    }

    return JSON.parse(JSON.stringify(updatedDept));
}

export async function getAvailableStoreEmployeesForDepartment(storeId: string, departmentId: string) {
    await dbConnect();

    // Find employees who belong to this store BUT are not in this department
    const employees = await Employee.find({
        storeId,
        active: true,
        $or: [
            { storeDepartmentId: { $ne: departmentId } },
            { storeDepartmentId: { $exists: false } },
            { storeDepartmentId: null }
        ]
    })
        .select("firstName lastName email image positionId")
        .populate("positionId", "name")
        .lean();

    return JSON.parse(JSON.stringify(employees));
}

export async function assignStoreEmployeesToDepartment(departmentId: string, employeeIds: string[]) {
    await dbConnect();
    const { GlobalDepartment } = require("@/lib/models");

    // 1. Update Employees (set storeDepartmentId)
    await Employee.updateMany(
        { _id: { $in: employeeIds } },
        { $set: { storeDepartmentId: departmentId } }
    );

    // 2. Update StoreDepartment (add to employees array)
    await StoreDepartment.findByIdAndUpdate(departmentId, {
        $addToSet: { employees: { $each: employeeIds } }
    });

    // 3. Get store department to check for global department link
    const dept = await StoreDepartment.findById(departmentId).select("storeId globalDepartmentId");

    // 4. If linked to a global department, add employees there too
    if (dept && dept.globalDepartmentId) {
        await GlobalDepartment.findByIdAndUpdate(dept.globalDepartmentId, {
            $addToSet: { employees: { $each: employeeIds } }
        });
    }

    if (dept && dept.storeId) {
        const store = await (require("@/lib/models").Store.findById(dept.storeId).select("slug"));
        const storeSlug = store?.slug || dept.storeId.toString();
        revalidatePath(`/dashboard/stores/${storeSlug}`);
        revalidatePath(`/dashboard/stores/${storeSlug}/departments/${dept.slug}`);

        const session = await getServerSession(authOptions);
        if (session?.user) {
            await logAction({
                action: 'ASSIGN_EMPLOYEES_TO_DEPT',
                performedBy: (session.user as any).id,
                storeId: dept.storeId.toString(),
                targetId: departmentId,
                targetModel: 'StoreDepartment',
                details: { employeeCount: employeeIds.length }
            });
        }
    }

    return { success: true };
}

export async function deleteStoreDepartment(id: string, storeId: string) {
    await dbConnect();
    // Soft delete
    const updated = await StoreDepartment.findByIdAndUpdate(id, { active: false }, { new: true });
    if (updated) {
        const store = await (require("@/lib/models").Store.findById(storeId).select("slug"));
        revalidatePath(`/dashboard/stores/${store?.slug || storeId}`);
    }

    const session = await getServerSession(authOptions);
    if (session?.user) {
        await logAction({
            action: 'DELETE_STORE_DEPARTMENT',
            performedBy: (session.user as any).id,
            storeId: storeId,
            targetId: id,
            targetModel: 'StoreDepartment'
        });
    }
}

export async function removeStoreEmployeeFromDepartment(departmentId: string, employeeId: string) {
    await dbConnect();

    // 1. Update Employee (unset storeDepartmentId)
    await Employee.findByIdAndUpdate(employeeId, {
        $unset: { storeDepartmentId: "" }
    });

    // 2. Update StoreDepartment (remove from employees array)
    await StoreDepartment.findByIdAndUpdate(departmentId, {
        $pull: { employees: employeeId }
    });

    const dept = await StoreDepartment.findById(departmentId).select("storeId slug");
    if (dept && dept.storeId) {
        const store = await (require("@/lib/models").Store.findById(dept.storeId).select("slug"));
        const storeSlug = store?.slug || dept.storeId.toString();
        revalidatePath(`/dashboard/stores/${storeSlug}/departments/${dept.slug}`);

        const session = await getServerSession(authOptions);
        if (session?.user) {
            await logAction({
                action: 'REMOVE_DEPT_EMPLOYEE',
                performedBy: (session.user as any).id,
                storeId: dept.storeId.toString(),
                targetId: employeeId,
                targetModel: 'Employee',
                details: { departmentId }
            });
        }
    }

    return { success: true };
}

export async function assignHeadOfDepartment(departmentId: string, employeeId: string) {
    await dbConnect();

    const dept = await StoreDepartment.findById(departmentId);
    if (!dept) throw new Error("Department not found");

    // Add role
    await Employee.findByIdAndUpdate(employeeId, {
        $addToSet: { roles: "storeDepartmentHead" }
    });

    // Add to Department Head array
    await StoreDepartment.findByIdAndUpdate(departmentId, {
        $addToSet: { headOfDepartment: employeeId }
    });

    if (!dept.employees.includes(employeeId)) {
        await assignStoreEmployeesToDepartment(departmentId, [employeeId]);
    }

    // Revalidate
    if (dept.storeId) {
        const store = await (require("@/lib/models").Store.findById(dept.storeId).select("slug"));
        const storeSlug = store?.slug || dept.storeId.toString();
        revalidatePath(`/dashboard/stores/${storeSlug}/departments/${dept.slug}`);

        const session = await getServerSession(authOptions);
        if (session?.user) {
            await logAction({
                action: 'ASSIGN_DEPT_HEAD',
                performedBy: (session.user as any).id,
                storeId: dept.storeId.toString(),
                targetId: employeeId,
                targetModel: 'Employee',
                details: { departmentId }
            });
        }
    }

    return { success: true };
}

export async function removeHeadOfDepartment(departmentId: string, employeeId: string) {
    await dbConnect();

    // 1. Remove Role (check if head elsewhere?)
    // For simplicity, we just remove the role. If they are head elsewhere, this might be aggressive.
    // Ideally we check.
    const isHeadElsewhere = await StoreDepartment.countDocuments({
        _id: { $ne: departmentId },
        headOfDepartment: employeeId
    });

    if (isHeadElsewhere === 0) {
        await Employee.findByIdAndUpdate(employeeId, {
            $pull: { roles: "storeDepartmentHead" }
        });
    }

    // 2. Remove from Department
    await StoreDepartment.findByIdAndUpdate(departmentId, {
        $pull: { headOfDepartment: employeeId }
    });

    const dept = await StoreDepartment.findById(departmentId).select("storeId slug");
    if (dept && dept.storeId) {
        const store = await (require("@/lib/models").Store.findById(dept.storeId).select("slug"));
        const storeSlug = store?.slug || dept.storeId.toString();
        revalidatePath(`/dashboard/stores/${storeSlug}/departments/${dept.slug}`);

        const session = await getServerSession(authOptions);
        if (session?.user) {
            await logAction({
                action: 'REMOVE_DEPT_HEAD',
                performedBy: (session.user as any).id,
                storeId: dept.storeId.toString(),
                targetId: employeeId,
                targetModel: 'Employee',
                details: { departmentId }
            });
        }
    }

    return { success: true };
}

export async function assignSubHeadOfDepartment(departmentId: string, employeeId: string) {
    await dbConnect();

    const dept = await StoreDepartment.findById(departmentId);
    if (!dept) throw new Error("Department not found");

    // Add role
    await Employee.findByIdAndUpdate(employeeId, {
        $addToSet: { roles: "storeDepartmentSubHead" }
    });

    // Add to Department SubHead array
    await StoreDepartment.findByIdAndUpdate(departmentId, {
        $addToSet: { subHead: employeeId }
    });

    // Ensure in employees list
    if (!dept.employees.includes(employeeId)) {
        await assignStoreEmployeesToDepartment(departmentId, [employeeId]);
    }
    // Revalidate
    if (dept.storeId) {
        const store = await (require("@/lib/models").Store.findById(dept.storeId).select("slug"));
        const storeSlug = store?.slug || dept.storeId.toString();
        revalidatePath(`/dashboard/stores/${storeSlug}/departments/${dept.slug}`);

        const session = await getServerSession(authOptions);
        if (session?.user) {
            await logAction({
                action: 'ASSIGN_DEPT_SUBHEAD',
                performedBy: (session.user as any).id,
                storeId: dept.storeId.toString(),
                targetId: employeeId,
                targetModel: 'Employee',
                details: { departmentId }
            });
        }
    }

    return { success: true };
}

export async function removeSubHeadOfDepartment(departmentId: string, employeeId: string) {
    await dbConnect();

    // Check availability elsewhere
    const isSubHeadElsewhere = await StoreDepartment.countDocuments({
        _id: { $ne: departmentId },
        subHead: employeeId
    });

    if (isSubHeadElsewhere === 0) {
        await Employee.findByIdAndUpdate(employeeId, {
            $pull: { roles: "storeDepartmentSubHead" }
        });
    }

    // Remove from Department
    await StoreDepartment.findByIdAndUpdate(departmentId, {
        $pull: { subHead: employeeId }
    });

    const dept = await StoreDepartment.findById(departmentId).select("storeId slug");
    if (dept && dept.storeId) {
        const store = await (require("@/lib/models").Store.findById(dept.storeId).select("slug"));
        const storeSlug = store?.slug || dept.storeId.toString();
        revalidatePath(`/dashboard/stores/${storeSlug}/departments/${dept.slug}`);

        const session = await getServerSession(authOptions);
        if (session?.user) {
            await logAction({
                action: 'REMOVE_DEPT_SUBHEAD',
                performedBy: (session.user as any).id,
                storeId: dept.storeId.toString(),
                targetId: employeeId,
                targetModel: 'Employee',
                details: { departmentId }
            });
        }
    }

    return { success: true };
}
