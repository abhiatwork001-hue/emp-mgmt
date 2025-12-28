"use server";

import dbConnect from "@/lib/db";
import { Employee, IEmployee, Store } from "@/lib/models";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

type EmployeeData = Partial<IEmployee>;

export interface EmployeeFilterOptions {
    search?: string;
    storeId?: string;
    departmentId?: string; // Global Department ID (via StoreDepartment -> GlobalDepartment relation) or StoreDepartment ID directly? 
    // User asked for "departments". In the list, we show Store Department.
    // Actually, "departments" usually implies broad categories (Global) or specific (Store). 
    // Let's support filtering by Global Department ID (easier for high level) OR Store Department ID if needed.
    // Given the UI, usually filtering by Global Department is more useful across stores. 
    // But let's look at the schema. StoreDepartment has globalDepartmentId.
    // We will filter by `storeDepartmentId` OR if we want global...
    // Let's implement filtering by `storeDepartmentId` first as it's direct on the model, 
    // BUT the dropdown usually comes from "Global Departments".
    // Let's stick to simple: Filter by exact Store Department ID for now, or we can do advanced lookup.
    // Simpler choice: Filter by `storeId` and `positionId` is direct.
    // For `departmentId`, if the user selects a Global Dept, we need to find all employees whose storeDepartment has that globalDepartmentId.
    positionId?: string;
    sort?: string;
}

export async function getAllEmployees(options: EmployeeFilterOptions = {}) {
    await dbConnect();

    const { search, storeId, departmentId, positionId, sort } = options;
    const query: any = { active: true };

    if (storeId && storeId !== "all") {
        query.storeId = storeId;
    }

    if (positionId && positionId !== "all") {
        query.positionId = positionId;
    }

    // Search (Text)
    if (search) {
        query.$or = [
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } }
        ];
    }

    // Sort logic
    let sortOptions: any = { createdAt: -1 }; // Default
    if (sort === "name-asc") sortOptions = { firstName: 1, lastName: 1 };
    if (sort === "name-desc") sortOptions = { firstName: -1, lastName: -1 };
    if (sort === "joined-asc") sortOptions = { joinedOn: 1 };
    if (sort === "joined-desc") sortOptions = { joinedOn: -1 };
    if (sort === "contract") sortOptions = { "contract.employmentType": 1 };

    // Initial query
    let employeesQuery = Employee.find(query)
        .populate("storeId", "name")
        .populate("storeDepartmentId", "name globalDepartmentId") // Get global ID to filter in memory if needed, or better, aggregation?
        .populate("positionId", "name");

    // If departmentId is provided (Global Department), we need to filter employees 
    // whose storeDepartment -> globalDepartmentId matches.
    // Mongoose doesn't support deep filtering in .find easily without aggregation or firing 2 queries.
    // Strategy: Find all StoreDepartments with this GlobalID first.
    if (departmentId && departmentId !== "all") {
        const { StoreDepartment } = require("@/lib/models");
        const storeDepts = await StoreDepartment.find({ globalDepartmentId: departmentId }).select("_id");
        const storeDeptIds = storeDepts.map((sd: any) => sd._id);
        query.storeDepartmentId = { $in: storeDeptIds };
        // Update query with new constraint
        employeesQuery = Employee.find(query)
            .populate("storeId", "name")
            .populate("storeDepartmentId", "name")
            .populate("positionId", "name");
    }

    const employees = await employeesQuery.sort(sortOptions).select("-password").lean();
    return JSON.parse(JSON.stringify(employees));
}

export async function getEmployeesByStore(storeId: string) {
    await dbConnect();
    const employees = await Employee.find({ storeId, active: true })
        .populate("positionId", "name")
        .populate("storeDepartmentId", "name")
        .select("-password")
        .lean();
    return JSON.parse(JSON.stringify(employees));
}

export async function getEmployeeById(id: string) {
    await dbConnect();
    const { Position, StoreDepartment, VacationRecord, AbsenceRecord } = require("@/lib/models");

    const employee = await Employee.findById(id)
        .populate("storeId", "name")
        .populate("positionId", "name level")
        .populate("storeDepartmentId", "name")
        .populate({
            path: "positionHistory.positionId",
            select: "name"
        })
        .populate({
            path: "positionHistory.storeId",
            select: "name"
        })
        .populate({
            path: "positionHistory.storeDepartmentId",
            select: "name"
        })
        .populate({
            path: "vacations",
            options: { sort: { from: -1 } } // Show recent first
        })
        .populate({
            path: "absences",
            options: { sort: { date: -1 } }
        })
        .select("-password")
        .select("-password");
    // .lean(); // We need virtuals (remainingDays) to be validated/present, so we return Document and let JSON.stringify invoke toJSON virtuals

    return JSON.parse(JSON.stringify(employee));
}

export async function createEmployee(data: EmployeeData) {
    await dbConnect();

    // Hash password if provided
    if (data.password) {
        const salt = await bcrypt.genSalt(10);
        data.password = await bcrypt.hash(data.password, salt);
    }

    // Initialize Position History if position assigned
    if (data.positionId) {
        data.positionHistory = [{
            positionId: data.positionId as any,
            storeId: data.storeId as any,
            storeDepartmentId: data.storeDepartmentId as any,
            from: new Date(),
            reason: "Initial Appointment"
        }];
    }

    const newEmployee = await Employee.create(data);
    revalidatePath("/dashboard/employees");
    return JSON.parse(JSON.stringify(newEmployee));
}

export async function updateEmployee(id: string, data: EmployeeData) {
    await dbConnect();

    // If updating password
    if (data.password) {
        const salt = await bcrypt.genSalt(10);
        data.password = await bcrypt.hash(data.password, salt);
    }

    // Handle Position History Update
    if (data.positionId) {
        const currentEmployee = await Employee.findById(id);
        if (currentEmployee) {
            // Check if position actually changed
            const currentPosId = currentEmployee.positionId ? currentEmployee.positionId.toString() : null;
            const newPosId = data.positionId.toString();

            if (currentPosId !== newPosId) {
                const history = currentEmployee.positionHistory || [];

                // Close previous position if exists
                if (history.length > 0) {
                    const lastHistory = history[history.length - 1];
                    if (!lastHistory.to) {
                        lastHistory.to = new Date();
                    }
                }

                // Add new position
                history.push({
                    positionId: data.positionId as any,
                    storeId: (data.storeId || currentEmployee.storeId) as any,
                    storeDepartmentId: (data.storeDepartmentId || currentEmployee.storeDepartmentId) as any,
                    from: new Date(),
                    reason: "Position Update"
                });

                data.positionHistory = history;
            }
        }
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(id, data, { new: true })
        .select("-password")
        .lean();

    revalidatePath("/dashboard/employees");
    return JSON.parse(JSON.stringify(updatedEmployee));
}

export async function getAvailableEmployeesForStore(storeId: string) {
    await dbConnect();
    // Find employees who are NOT assigned to this store already
    // Assuming strict 1-store per employee for now based on schema `storeId` field
    // or we can allow moving them from other stores. 
    // "Available" typically means they are not ALREADY in this store.

    const employees = await Employee.find({
        active: true,
        storeId: { $ne: storeId }
    })
        .select("firstName lastName email positionId image")
        .populate("positionId", "name")
        .lean();

    return JSON.parse(JSON.stringify(employees));
}

export async function assignEmployeesToStore(storeId: string, employeeIds: string[]) {
    await dbConnect();

    // 1. Update Employees (set storeId)
    await Employee.updateMany(
        { _id: { $in: employeeIds } },
        { $set: { storeId: storeId } }
    );

    // 2. Update Store (add to employees array)
    // We should use $addToSet to avoid duplicates
    await Store.findByIdAndUpdate(storeId, {
        $addToSet: { employees: { $each: employeeIds } }
    });

    revalidatePath(`/dashboard/stores/${storeId}`);
    return { success: true };
}

export async function archiveEmployee(id: string) {
    await dbConnect();
    const archived = await Employee.findByIdAndUpdate(
        id,
        {
            active: false,
            terminatedOn: new Date(),
            // archivedAt: new Date() // Employee schema has terminatedOn, can add archivedAt too if consistency needed
            // checking schema... it has active and terminatedOn. Let's use terminatedOn as primary archive date for employees.
        },
        { new: true }
    ).lean();

    revalidatePath("/dashboard/employees");
    return JSON.parse(JSON.stringify(archived));
}

/**
 * Remove employee from store with full cleanup
 */
export async function removeEmployeeFromStore(storeId: string, employeeId: string) {
    await dbConnect();
    const { StoreDepartment } = require("@/lib/models");

    const employee = await Employee.findById(employeeId);
    if (!employee) throw new Error("Employee not found");

    // 1. Remove from Store.employees array
    await Store.findByIdAndUpdate(storeId, {
        $pull: { employees: employeeId }
    });

    // 2. Remove from Store.managers if present
    await Store.findByIdAndUpdate(storeId, {
        $pull: { managers: employeeId, subManagers: employeeId }
    });

    // 3. Remove from all StoreDepartments in this store
    await StoreDepartment.updateMany(
        { storeId },
        {
            $pull: {
                employees: employeeId,
                headOfDepartment: employeeId
            }
        }
    );

    // 4. Update Employee: Clear store reference, position, and close histories
    employee.storeId = undefined;
    employee.storeDepartmentId = undefined;

    // Remove position (assuming position is store-dependent)
    const oldPositionId = employee.positionId;
    employee.positionId = undefined;
    // Also remove 'manager' role if they were a manager (logic handled in removeStoreManager but good to be safe if specific)
    // But sticking to minimal safe changes: close position history.

    // Close storeHistory entry
    if (employee.storeHistory && employee.storeHistory.length > 0) {
        const lastStoreHistory = employee.storeHistory[employee.storeHistory.length - 1];
        if (!lastStoreHistory.to && lastStoreHistory.storeId.toString() === storeId) {
            lastStoreHistory.to = new Date();
        }
    }

    // Close positionHistory entry
    if (oldPositionId && employee.positionHistory && employee.positionHistory.length > 0) {
        const lastPosHistory = employee.positionHistory[employee.positionHistory.length - 1];
        if (!lastPosHistory.to) {
            lastPosHistory.to = new Date();
            // Optional: reason
        }
    }

    // Close departmentHistory entry if exists
    if (employee.departmentHistory && employee.departmentHistory.length > 0) {
        const lastDeptHistory = employee.departmentHistory[employee.departmentHistory.length - 1];
        if (!lastDeptHistory.to) {
            lastDeptHistory.to = new Date();
        }
    }

    await employee.save();

    revalidatePath(`/dashboard/stores/${storeId}`);
    revalidatePath("/dashboard/employees");
    revalidatePath(`/dashboard/employees/${employeeId}`);
    return { success: true };
}
