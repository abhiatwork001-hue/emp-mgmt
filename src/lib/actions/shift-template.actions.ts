"use server";

import dbConnect from "@/lib/db";
import { ShiftDefinition } from "@/lib/models";
import { revalidatePath } from "next/cache";

export async function getShiftDefinitions(departmentId?: string) {
    await dbConnect();

    const query: any = {};
    if (departmentId) {
        query.$or = [
            { storeDepartmentId: departmentId },
            { storeDepartmentId: { $exists: false } },
            { storeDepartmentId: null }
        ];
    } else {
        query.$or = [
            { storeDepartmentId: { $exists: false } },
            { storeDepartmentId: null }
        ];
    }

    const templates = await ShiftDefinition.find(query).sort({ startTime: 1 }).lean();
    return JSON.parse(JSON.stringify(templates));
}

export async function createShiftDefinition(data: any) {
    await dbConnect();
    const newShift = await ShiftDefinition.create(data);
    return JSON.parse(JSON.stringify(newShift));
}
