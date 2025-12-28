"use server";

import dbConnect from "@/lib/db";
import { Position, IPosition } from "@/lib/models";
import { revalidatePath } from "next/cache";

type PositionData = Partial<IPosition>;

export async function getAllPositions() {
    await dbConnect();
    const positions = await Position.find({ active: true })
        .populate("roles", "name permissions")
        .select("name level isStoreSpecific translations")
        .sort({ level: 1 })
        .lean();
    /*     console.log("Fetched positions:", JSON.stringify(positions, null, 2)); */ // Debug log
    return JSON.parse(JSON.stringify(positions));
}

export async function createPosition(data: PositionData) {
    await dbConnect();
    const newPos = await Position.create(data);
    revalidatePath("/dashboard/positions");
    return JSON.parse(JSON.stringify(newPos));
}

export async function updatePosition(id: string, data: PositionData) {
    await dbConnect();
    const updated = await Position.findByIdAndUpdate(id, data, { new: true }).lean();
    revalidatePath("/dashboard/positions");
    return JSON.parse(JSON.stringify(updated));
}

export async function archivePosition(id: string) {
    await dbConnect();
    const archived = await Position.findByIdAndUpdate(
        id,
        { active: false, archivedAt: new Date() },
        { new: true }
    ).lean();
    revalidatePath("/dashboard/positions");
    return JSON.parse(JSON.stringify(archived));
}
export async function getPositionById(id: string) {
    await dbConnect();
    const position = await Position.findById(id)
        .populate("roles", "name permissions")
        .lean();
    if (!position) return null;
    return JSON.parse(JSON.stringify(position));
}

export async function getEmployeesInPosition(positionId: string) {
    await dbConnect();
    const { Employee } = require("@/lib/models");

    const employees = await Employee.find({
        positionId,
        active: true
    })
        .select("firstName lastName email image storeId storeDepartmentId joinedOn")
        .populate("storeId", "name")
        .populate("storeDepartmentId", "name")
        .lean();

    return JSON.parse(JSON.stringify(employees));
}

export async function removeEmployeeFromPosition(employeeId: string) {
    await dbConnect();
    const { Employee, Store, GlobalDepartment, StoreDepartment } = require("@/lib/models");

    const employee = await Employee.findById(employeeId);
    if (!employee || !employee.positionId) return { success: false, message: "No active position found" };

    const oldPositionId = employee.positionId;

    // 1. Close Position History
    if (employee.positionHistory && employee.positionHistory.length > 0) {
        const lastHistory = employee.positionHistory[employee.positionHistory.length - 1];
        if (!lastHistory.to) {
            lastHistory.to = new Date();
        }
    }

    // 2. Clear Position ID
    employee.positionId = undefined;

    // 3. Remove "manager" role if it exists (assuming it was tied to the position)
    // Refinement: Only remove 'manager' role if the position was Level 8+ or explicitly a manager role.
    // For now, if we are removing their position, we can assume we might need to cleanup roles, but let's be careful.
    // The user specifically asked to "take employee out from that position and reflect in all... models"

    // We will proactively pull from known leadership fields fields

    // cleanup from Store managers
    if (employee.storeId) {
        await Store.findByIdAndUpdate(employee.storeId, {
            $pull: { managers: employeeId, subManagers: employeeId }
        });
    }


    // cleanup from Store Departments (Confirmed: headOfDepartment is Array)
    await StoreDepartment.updateMany(
        { $or: [{ headOfDepartment: employeeId }, { subHead: employeeId }] },
        { $pull: { headOfDepartment: employeeId, subHead: employeeId } }
    );

    // cleanup from Global Departments (Confirmed: departmentHead is Array)
    await GlobalDepartment.updateMany(
        { $or: [{ departmentHead: employeeId }, { subHead: employeeId }] },
        { $pull: { departmentHead: employeeId, subHead: employeeId } }
    );

    await employee.save();

    revalidatePath(`/dashboard/employees/${employeeId}`);
    revalidatePath("/dashboard/positions");
    return { success: true };
}
