"use server";

import dbConnect from "@/lib/db";
import { Supplier, ISupplier } from "@/lib/models";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logAction } from "./log.actions";

// --- Actions ---

/**
 * Get all suppliers.
 * Optionally filter by storeId (if suppliers are store-specific).
 * For now, we assume suppliers can be global or store-specific.
 */
export async function getSuppliers(storeId?: string) {
    await dbConnect();

    const query: any = { active: true };
    if (storeId) {
        // If storeId provided, get global suppliers (no storeId) OR suppliers for this store
        query.$or = [
            { storeId: { $exists: false } },
            { storeId: null },
            { storeId: storeId }
        ];
    }

    const suppliers = await Supplier.find(query).sort({ name: 1 }).lean();
    return JSON.parse(JSON.stringify(suppliers));
}

/**
 * Get supplier by ID
 */
export async function getSupplierById(id: string) {
    await dbConnect();
    const supplier = await Supplier.findById(id).lean();
    if (!supplier) return null;
    return JSON.parse(JSON.stringify(supplier));
}

/**
 * Create a new supplier
 */
export async function createSupplier(data: Partial<ISupplier>) {
    await dbConnect();

    // Permission check
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    // Setup defaults
    const newSupplier = await Supplier.create({
        ...data,
        createdBy: (session.user as any).id,
        items: data.items || [],
        active: true
    });

    revalidatePath("/dashboard/suppliers");

    await logAction({
        action: 'CREATE_SUPPLIER',
        performedBy: (session.user as any).id,
        targetId: newSupplier._id.toString(),
        targetModel: 'Supplier',
        details: { name: newSupplier.name }
    });

    return JSON.parse(JSON.stringify(newSupplier));
}

/**
 * Update a supplier (and its items)
 */
export async function updateSupplier(id: string, data: Partial<ISupplier>) {
    await dbConnect();

    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    const updated = await Supplier.findByIdAndUpdate(id, data, { new: true }).lean();

    revalidatePath("/dashboard/suppliers");

    if (updated) {
        await logAction({
            action: 'UPDATE_SUPPLIER',
            performedBy: (session.user as any).id,
            targetId: id,
            targetModel: 'Supplier',
            details: { name: updated.name }
        });
    }

    return JSON.parse(JSON.stringify(updated));
}

/**
 * Soft delete a supplier
 */
export async function deleteSupplier(id: string) {
    await dbConnect();

    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    await Supplier.findByIdAndUpdate(id, { active: false });

    revalidatePath("/dashboard/suppliers");

    await logAction({
        action: 'DELETE_SUPPLIER',
        performedBy: (session.user as any).id,
        targetId: id,
        targetModel: 'Supplier',
        details: {}
    });

    return { success: true };
}

/**
 * Get order reminders (stub)
 * TODO: Implement actual order logic based on supplier schedules
 */
export async function getOrderReminders() {
    // For now return empty array as we don't have order scheduling logic in the model yet
    return [];
}
