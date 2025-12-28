"use server";

import dbConnect from "@/lib/db";
import { Role } from "@/lib/models";

export async function getAllRoles() {
    await dbConnect();
    const roles = await Role.find({ active: true }).sort({ name: 1 }).lean();
    return JSON.parse(JSON.stringify(roles));
}
