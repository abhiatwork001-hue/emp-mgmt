"use server";

import dbConnect from "@/lib/db";
import { Employee } from "@/lib/models";

export async function getAvailableEmployees(storeId: string) {
    await dbConnect();
    // Fetch all employees in the store
    // In future: Filter by active status, and maybe pre-check vacations
    const employees = await Employee.find({
        // storeId: storeId, // Allow global fetch for now to support "Lending" easily
        active: true
    })
        .select("firstName lastName image positionId storeId storeDepartmentId")
        .populate("positionId", "name")
        .lean();

    return JSON.parse(JSON.stringify(employees));
}
