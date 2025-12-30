"use server";

import dbConnect from "@/lib/db";
import { Employee, IEmployee, Store, Company, Notification, ActionLog } from "@/lib/models";
import { revalidatePath } from "next/cache";
import * as bcrypt from "bcryptjs";
import { sendWelcomeEmail, sendPasswordResetEmail } from "@/lib/email";
import { logAction } from "./log.actions";
import * as crypto from 'crypto';

type EmployeeData = Partial<IEmployee>;

export interface EmployeeFilterOptions {
    search?: string;
    storeId?: string;
    departmentId?: string; // Global Department ID
    storeDepartmentId?: string; // Specific Store Department ID
    positionId?: string;
    sort?: string;
}

export async function getAllEmployees(options: EmployeeFilterOptions = {}) {
    await dbConnect();

    const { search, storeId, departmentId, storeDepartmentId, positionId, sort } = options;
    const query: any = { active: true };

    if (storeId && storeId !== "all") {
        query.storeId = storeId;
    }

    if (storeDepartmentId && storeDepartmentId !== "all") {
        query.storeDepartmentId = storeDepartmentId;
    }

    if (positionId && positionId !== "all") {
        query.positionId = positionId;
    }

    // Search (Text)
    if (search) {
        const keywords = search.trim().split(/\s+/).filter(k => k.length > 0);
        if (keywords.length > 0) {
            query.$and = keywords.map(keyword => ({
                $or: [
                    { firstName: { $regex: keyword, $options: "i" } },
                    { lastName: { $regex: keyword, $options: "i" } },
                    { email: { $regex: keyword, $options: "i" } }
                ]
            }));
        }
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
        .populate("storeId", "name translations")
        .populate("storeDepartmentId", "name translations globalDepartmentId")
        .populate("positionId", "name translations");

    // If departmentId is provided (Global Department), we need to filter employees 
    // whose storeDepartment -> globalDepartmentId matches.
    // Mongoose doesn't support deep filtering in .find easily without aggregation or firing 2 queries.
    // Strategy: Find all StoreDepartments with this GlobalID first.
    if (departmentId && departmentId !== "all") {
        const { StoreDepartment } = require("@/lib/models");
        const storeDepts = await StoreDepartment.find({ globalDepartmentId: departmentId }).select("_id");
        const storeDeptIds = storeDepts.map((sd: any) => sd._id);
        query.storeDepartmentId = { $in: storeDeptIds };

        employeesQuery = Employee.find(query)
            .populate("storeId", "name translations")
            .populate("storeDepartmentId", "name translations")
            .populate("positionId", "name translations");
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
        .populate({
            path: "positionId",
            select: "name level roles",
            populate: { path: "roles", select: "name permissions" }
        })
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

    // Generate One-Time Password
    const otp = crypto.randomBytes(4).toString('hex'); // 8 chars
    const rawOtp = otp;

    // Hash the OTP for storage
    const salt = await bcrypt.genSalt(10);
    data.password = await bcrypt.hash(rawOtp, salt);
    data.isPasswordChanged = false;

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

    // Log Action
    await logAction({
        action: 'CREATE_EMPLOYEE',
        performedBy: 'SYSTEM',
        targetId: newEmployee._id,
        targetModel: 'Employee',
        details: {
            firstName: newEmployee.firstName,
            lastName: newEmployee.lastName,
            email: newEmployee.email,
            storeId: newEmployee.storeId
        }
    });

    // Get company name for email
    const company = await Company.findOne({});
    const companyName = company?.name || "The Chick";

    // Send Welcome Email
    try {
        await sendWelcomeEmail(newEmployee.email, newEmployee.firstName, companyName, rawOtp);
    } catch (error) {
        console.error("Failed to send welcome email:", error);
        // We don't throw here to avoid failing employee creation if email fails
    }

    revalidatePath("/dashboard/employees");
    return JSON.parse(JSON.stringify(newEmployee));
}

export async function requestPasswordReset(email: string) {
    await dbConnect();

    const employee = await Employee.findOne({ email: email.toLowerCase() });
    if (!employee) {
        throw new Error("Employee not found with this email.");
    }

    // Set flag
    employee.passwordResetRequested = true;
    await employee.save();

    // Notify HR
    // Find HRs or Admins to notify
    const hrs = await Employee.find({ roles: { $in: ["hr", "admin", "owner", "super_user"] } }).select("_id");

    if (hrs.length > 0) {
        await Notification.create({
            title: "Password Reset Requested",
            message: `${employee.firstName} ${employee.lastName} (${employee.email}) has requested a password reset. Please confirm to send a new OTP.`,
            type: "warning",
            category: "password_reset",
            relatedEmployeeId: employee._id,
            recipients: hrs.map(hr => ({ userId: hr._id, read: false }))
        });
    }

    return { success: true };
}

export async function confirmPasswordReset(employeeId: string) {
    await dbConnect();

    const employee = await Employee.findById(employeeId);
    if (!employee) throw new Error("Employee not found");

    // Generate new OTP
    const otp = crypto.randomBytes(4).toString('hex');
    const rawOtp = otp;

    const salt = await bcrypt.genSalt(10);
    employee.password = await bcrypt.hash(rawOtp, salt);
    employee.isPasswordChanged = false;
    employee.passwordResetRequested = false;

    await employee.save();

    const company = await Company.findOne({});
    const companyName = company?.name || "The Chick";

    // Send Reset Email
    try {
        await sendPasswordResetEmail(employee.email, employee.firstName, companyName, rawOtp);
    } catch (error) {
        console.error("Failed to send reset email:", error);
    }

    revalidatePath("/dashboard/employees");
    return { success: true };
}

export async function changePassword(employeeId: string, newPassword: string) {
    await dbConnect();

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await Employee.findByIdAndUpdate(employeeId, {
        password: hashedPassword,
        isPasswordChanged: true
    });

    return { success: true };
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

    // Log Action
    await logAction({
        action: 'UPDATE_EMPLOYEE',
        performedBy: 'SYSTEM',
        targetId: id,
        targetModel: 'Employee'
    });

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

    // Log Action (Note: assignedBy is not passed, but we can assume SYSTEM or update signature later)
    // For now, minimal intrusive logging
    await logAction({
        action: 'ASSIGN_EMPLOYEES_TO_STORE',
        performedBy: 'SYSTEM',
        targetId: storeId,
        targetModel: 'Store',
        details: { employeeIds }
    });

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

    await logAction({
        action: 'ARCHIVE_EMPLOYEE',
        performedBy: 'SYSTEM', // Archive usually from admin UI, but actor not passed here
        targetId: id,
        targetModel: 'Employee'
    });

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
