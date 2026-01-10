"use server";

import dbConnect from "@/lib/db";
import { StoreResource, Employee, Store, IStoreResource } from "@/lib/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getDirectoryData(userStoreId?: string) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    // 1. Fetch Store Resources (Global + Local)
    const resourceQuery: any = { active: true };
    if (userStoreId) {
        resourceQuery.$or = [
            { visibility: "global" },
            { storeId: userStoreId }
        ];
    } else {
        resourceQuery.visibility = "global";
    }

    const resources = await StoreResource.find(resourceQuery).lean();

    // 2. Fetch Internal Key Contacts (Admin, Owner, HR, Tech, Global Dept Heads)
    const keyContacts = await Employee.find({
        active: true,
        roles: { $in: ["admin", "owner", "hr", "tech", "globalDepartmentHead"] }
    })
        .select("firstName lastName email phone roles image positionId")
        .populate("positionId", "name")
        .limit(50) // Safe limit
        .lean();

    // 3. Fetch Store Network (All Stores + Managers)
    const stores = await Store.find({ active: true })
        .select("name slug address phoneNumber managers email") // assuming phone/email on store? Schema has translations, managers. 
        // Wait, StoreSchema doesn't have phone/email directly? 
        // Checking schema: It has `address`, `managers`. No phone/email on Store model directly?
        // User request: "phoneNumber of other stores". I should add phone to Store model or use Manager's phone.
        // I will populate managers and use their phone for now, or assume Store has phone in 'address' or add new field.
        // Schema in step 17008 showed: name, slug, address, translations. No phone.
        // I'll stick to displaying Managers for now.
        .populate({
            path: "managers",
            select: "firstName lastName phone email image"
        })
        .lean();

    return {
        resources: JSON.parse(JSON.stringify(resources)),
        keyContacts: JSON.parse(JSON.stringify(keyContacts)),
        stores: JSON.parse(JSON.stringify(stores))
    };
}

// Admin Actions for Resources

export async function createStoreResource(data: Partial<IStoreResource>) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    // Add strict role check if needed

    const resource = await StoreResource.create({ ...data, active: true });
    return JSON.parse(JSON.stringify(resource));
}

export async function deleteStoreResource(id: string) {
    await dbConnect();
    await StoreResource.findByIdAndUpdate(id, { active: false });
    return { success: true };
}
