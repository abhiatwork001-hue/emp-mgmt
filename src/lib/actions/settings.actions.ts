"use server";

import connectToDB from "@/lib/db";
import { Company, Store, StoreDepartment } from "@/lib/models";
import { revalidatePath } from "next/cache";

// --- Global Settings ---

export async function getSystemSettings() {
    try {
        await connectToDB();
        // Assuming single company for now, or find first
        const company = await Company.findOne();
        if (!company) return { success: false, error: "Company not found" };

        return {
            success: true,
            settings: JSON.parse(JSON.stringify(company.settings || {}))
        };
    } catch (error) {
        console.error("Error fetching settings:", error);
        return { success: false, error: "Failed to fetch settings" };
    }
}

export async function updateScheduleRules(rules: { deadlineDay: number; deadlineTime: string; alertEnabled: boolean }) {
    try {
        await connectToDB();
        const company = await Company.findOne();
        if (!company) return { success: false, error: "Company not found" };

        company.settings = {
            ...company.settings,
            scheduleRules: rules
        };

        await company.save();
        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error) {
        console.error("Error updating schedule rules:", error);
        return { success: false, error: "Failed to update rules" };
    }
}

// --- Company Profile ---

export async function updateCompanyProfile(data: { name: string; address?: string; taxNumber?: string; logo?: string }) {
    try {
        await connectToDB();
        const company = await Company.findOne();
        if (!company) {
            // Create if not exists (seed)
            await Company.create(data);
        } else {
            company.name = data.name;
            if (data.address) company.address = data.address;
            if (data.taxNumber) company.taxNumber = data.taxNumber;
            if (data.logo) company.logo = data.logo;
            await company.save();
        }
        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error) {
        console.error("Error updating profile:", error);
        return { success: false, error: "Failed to update profile" };
    }
}

// --- Store Staffing Rules ---

export async function getAllStoresForConfig() {
    try {
        await connectToDB();
        const stores = await Store.find({ active: true }).select('name minEmployees maxEmployees predictions').sort({ name: 1 });
        return { success: true, stores: JSON.parse(JSON.stringify(stores)) };
    } catch (error) {
        return { success: false, error: "Failed to fetch stores" };
    }
}

export async function updateStoreStaffing(storeId: string, minEmployees: number, maxEmployees?: number) {
    try {
        await connectToDB();
        await Store.findByIdAndUpdate(storeId, { minEmployees, maxEmployees });
        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to update store" };
    }
}

// --- Department Staffing Rules ---

export async function getAllDepartmentsForConfig() {
    try {
        await connectToDB();
        const depts = await StoreDepartment.find({ active: true })
            .populate('storeId', 'name')
            .select('name minEmployees maxEmployees targetEmployees storeId slug')
            .sort({ 'storeId.name': 1, name: 1 });

        return { success: true, departments: JSON.parse(JSON.stringify(depts)) };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to fetch departments" };
    }
}

export async function updateDepartmentStaffing(deptId: string, minEmployees: number, targetEmployees: number, maxEmployees?: number) {
    try {
        await connectToDB();
        await StoreDepartment.findByIdAndUpdate(deptId, { minEmployees, targetEmployees, maxEmployees });
        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to update department" };
    }
}


// --- Shift Definition (Shift Rules) ---
import { ShiftDefinition } from "@/lib/models";

export async function getShiftDefinitions(storeDepartmentId?: string) {
    try {
        await connectToDB();
        const query: any = {};
        if (storeDepartmentId) query.storeDepartmentId = storeDepartmentId;

        const shifts = await ShiftDefinition.find(query)
            .populate({
                path: 'storeDepartmentId',
                select: 'name storeId',
                populate: { path: 'storeId', select: 'name' }
            })
            .sort({ name: 1 });

        return { success: true, shifts: JSON.parse(JSON.stringify(shifts)) };
    } catch (error) {
        return { success: false, error: "Failed to fetch shifts" };
    }
}

export async function updateShiftConfig(shiftId: string, maxAllowedHeadcount: number) {
    try {
        await connectToDB();
        await ShiftDefinition.findByIdAndUpdate(shiftId, { maxAllowedHeadcount });
        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to update shift" };
    }
}
