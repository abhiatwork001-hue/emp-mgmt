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
/**
 * Mark a supplier order as handled for a specific date (ordered/skipped/stock checked)
 */
export async function markSupplierOrder(storeId: string, supplierId: string, status: 'ordered' | 'checked_stock' | 'skipped', date: Date) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    const SupplierOrderCheck = (await import("@/lib/models")).SupplierOrderCheck;

    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    const check = await SupplierOrderCheck.findOneAndUpdate(
        {
            storeId,
            supplierId,
            date: checkDate
        },
        {
            status,
            checkedBy: (session.user as any).id
        },
        { upsert: true, new: true }
    );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/suppliers"); // If shown there
    return JSON.parse(JSON.stringify(check));
}

/**
 * Get active ordering alerts for a store for TODAY or CUSTOM ALERT DAY.
 * Checks default schedules, temporary overrides, and "SupplierOrderCheck" status.
 */
export async function getAvailableSuppliersForToday(storeId: string) {
    await dbConnect();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const SupplierOrderCheck = (await import("@/lib/models")).SupplierOrderCheck;

    // Get active suppliers
    const suppliers = await getSuppliers(storeId);
    const alerts: any[] = [];

    // Fetch existing checks for today (or potential order days? Ideally we check specifically per potential alert)
    // We will check dynamically inside loop or fetch all relevant for optimization?
    // Optimization: Fetch all checks for this store >= today?
    // Actually, checks are date-specific. Let's query as needed or bulk fetch if performance issue arises.
    // For now, let's just do one-by-one or optimizations later.

    for (const supplier of suppliers) {
        // 1. Determine active schedule
        let activeSchedule = supplier.deliverySchedule || [];
        if (supplier.temporarySchedules && supplier.temporarySchedules.length > 0) {
            const temp = supplier.temporarySchedules.find((t: any) => {
                const start = new Date(t.startDate);
                const end = new Date(t.endDate);
                return today >= start && today <= end;
            });
            if (temp) activeSchedule = temp.schedule;
        }

        if (!activeSchedule || activeSchedule.length === 0) continue;

        // 2. Alert Settings (Custom Lead Time)
        // If alertSettings.customLeadTime is set, we use THAT to calculate "Is Today the Alert Day?"
        // Original Logic: deadline = deliveryDate - leadDays. If deadline == today, alert.
        // New Logic:
        // We want to order for a delivery on Date X.
        // The HARD deadline is Date X - supplier.leadDays.
        // The ALERT day is:
        //    If customized: Date X - customLeadTime
        //    Else: Date X - supplier.leadDays (Same as hard deadline)

        const customLeadTime = supplier.alertSettings?.customLeadTime;

        // Look ahead 14 days for delivery slots
        for (let i = 0; i < 14; i++) {
            const potentialDeliveryDate = new Date(today);
            potentialDeliveryDate.setDate(today.getDate() + i);
            const dayOfWeek = potentialDeliveryDate.getDay();

            const deliveryOption = activeSchedule.find((s: any) => s.dayOfWeek === dayOfWeek);

            if (deliveryOption) {
                const hardLeadDays = deliveryOption.orderCutoff?.leadDays || 0;
                // Hard Deadline Date (Must order by this date)
                const hardDeadlineDate = new Date(potentialDeliveryDate);
                hardDeadlineDate.setDate(potentialDeliveryDate.getDate() - hardLeadDays);
                hardDeadlineDate.setHours(0, 0, 0, 0);

                // Alert Date (When to show widget)
                const alertLeadDays = customLeadTime !== undefined ? customLeadTime : hardLeadDays;
                const alertDate = new Date(potentialDeliveryDate);
                alertDate.setDate(potentialDeliveryDate.getDate() - alertLeadDays);
                alertDate.setHours(0, 0, 0, 0);

                // If TODAY is the Alert Date (or if missed alert and before/on hard deadline? User said "Day before vs Day of")
                // Usually sticky: if today >= alertDate && today <= hardDeadlineDate?
                // "Manage preferences to alert me X days before".
                // Let's make it a window: [Alert Date, Hard Deadline Date].
                if (today.getTime() >= alertDate.getTime() && today.getTime() <= hardDeadlineDate.getTime()) {

                    // Check if already handled for this DELIVERY DATE (or Reference Date?)
                    // If we order "For Delivery on X", we should tag the check with "Date X" or "Order Date"?
                    // Usually we track "Did I do the task for today?".
                    // But if I order today for tomorrow, and tomorrow I see it again?
                    // Let's recur on the "Target Delivery Date" as the unique key?
                    // Or track "SupplierOrderCheck" by "Date of Action" but referenced to "Target"?
                    // Simpler: Track "Date of Order Window Start" or just "Target Date".
                    // Let's use `potentialDeliveryDate` as the key for `SupplierOrderCheck`.
                    // "I have handled the order for Delivery on 2024-01-20".

                    const isChecked = await SupplierOrderCheck.exists({
                        storeId: storeId,
                        supplierId: supplier._id,
                        date: potentialDeliveryDate, // Using delivery date as unique key
                        status: { $in: ['ordered', 'checked_stock', 'skipped'] }
                    });

                    if (!isChecked) {
                        alerts.push({
                            supplierId: supplier._id,
                            supplierName: supplier.name,
                            deliveryDate: potentialDeliveryDate,
                            cutoffTime: deliveryOption.orderCutoff?.time || "17:00",
                            leadDays: hardLeadDays,
                            isCustomAlert: customLeadTime !== undefined,
                            hardDeadline: hardDeadlineDate // To show "Due on..."
                        });
                    }
                }
            }
        }
    }

    return JSON.parse(JSON.stringify(alerts));
}
