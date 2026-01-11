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
 * Get active ordering alerts for a store for TODAY.
 * Checks default schedules and temporary overrides.
 */
export async function getAvailableSuppliersForToday(storeId: string) {
    await dbConnect();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    // Get active suppliers
    const suppliers = await getSuppliers(storeId);
    const alerts: any[] = [];

    for (const supplier of suppliers) {
        // 1. Determine active schedule (Temp vs Default)
        let activeSchedule = supplier.deliverySchedule || [];

        if (supplier.temporarySchedules && supplier.temporarySchedules.length > 0) {
            const temp = supplier.temporarySchedules.find((t: any) => {
                const start = new Date(t.startDate);
                const end = new Date(t.endDate);
                return today >= start && today <= end;
            });
            if (temp) {
                activeSchedule = temp.schedule;
            }
        }

        if (!activeSchedule || activeSchedule.length === 0) continue;

        // 2. Check upcoming delivery opportunities to see if we need to order TODAY
        // Look ahead 14 days
        for (let i = 0; i < 14; i++) {
            const potentialDeliveryDate = new Date(today);
            potentialDeliveryDate.setDate(today.getDate() + i);
            const dayOfWeek = potentialDeliveryDate.getDay();

            // Find if supplier delivers on this day
            const deliveryOption = activeSchedule.find((s: any) => s.dayOfWeek === dayOfWeek);

            if (deliveryOption) {
                // Determine Order Deadline Date
                const leadDays = deliveryOption.orderCutoff?.leadDays || 0;
                const deadlineDate = new Date(potentialDeliveryDate);
                deadlineDate.setDate(potentialDeliveryDate.getDate() - leadDays);
                deadlineDate.setHours(0, 0, 0, 0);

                // Check if Deadline is TODAY
                if (deadlineDate.getTime() === today.getTime()) {
                    alerts.push({
                        supplierId: supplier._id,
                        supplierName: supplier.name,
                        deliveryDate: potentialDeliveryDate, // Full date object
                        cutoffTime: deliveryOption.orderCutoff?.time || "17:00",
                        leadDays: leadDays
                    });

                    // 3. Trigger Reminder Notification (if not exists)
                    // We import Reminder model to check/create
                    // Note: Ideally this should be a separate background job, but we'll do it JIT here.
                    try {
                        const { Reminder } = await import("@/lib/models");
                        const reminderExists = await Reminder.findOne({
                            type: 'order',
                            storeId: storeId, // Assuming Reminder has storeId or we use description matching?
                            // Schema check: Reminder has targetDepartments? No storeId explicitly in interface provided in view earlier?
                            // Let's check Schema lines 1258. `targetDepartments`. No `storeId` on top level.
                            // But usually reminders are scoped.
                            // I will rely on `description` containing unique ID or just title for now to avoid spam.
                            title: `Order from ${supplier.name}`,
                            dueDate: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
                        });

                        if (!reminderExists) {
                            await Reminder.create({
                                title: `Order from ${supplier.name}`,
                                description: `Cutoff today at ${deliveryOption.orderCutoff?.time || "17:00"} for delivery on ${potentialDeliveryDate.toDateString()}.`,
                                type: 'order',
                                priority: 'high',
                                dueDate: new Date(), // Due now
                                targetRoles: ['store_manager'],
                                // targetDepartments: [] // Optional
                                createdBy: (await getServerSession(authOptions) as any)?.user?.id || supplier.createdBy, // Fallback
                                isReadBy: []
                            });
                        }
                    } catch (err) {
                        console.error("Failed to create reminder:", err);
                    }
                }
            }
        }
    }

    return JSON.parse(JSON.stringify(alerts));
}
