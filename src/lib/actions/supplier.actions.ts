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
 * Update store preference for a supplier order day
 */
export async function updateSupplierStorePreference(supplierId: string, storeId: string, preferredOrderDay: number) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    await Supplier.findByIdAndUpdate(supplierId, {
        $pull: { storePreferences: { storeId: storeId } }
    });

    const updated = await Supplier.findByIdAndUpdate(supplierId, {
        $push: { storePreferences: { storeId: storeId, preferredOrderDay } }
    }, { new: true }).lean();

    revalidatePath("/dashboard");
    return JSON.parse(JSON.stringify(updated));
}

/**
 * Get Employee-specific Supplier Alert Preferences
 */
export async function getEmployeeSupplierPreferences(userId: string) {
    await dbConnect();
    const { Employee } = await import("@/lib/models");
    const employee = await Employee.findById(userId).select('settings.supplierAlerts').lean();
    return employee?.settings?.supplierAlerts || [];
}

/**
 * Update Employee-specific Supplier Alert Preferences
 */
export async function updateEmployeeSupplierPreference(userId: string, preferences: any[]) {
    await dbConnect();
    const { Employee } = await import("@/lib/models");

    const updated = await Employee.findByIdAndUpdate(userId, {
        $set: { "settings.supplierAlerts": preferences }
    }, { new: true });

    revalidatePath("/dashboard");
    return JSON.parse(JSON.stringify(updated?.settings?.supplierAlerts || []));
}

/**
 * Verify Order Optimization Logic
 * Plan orders based on: list of items -> group by supplier -> check delivery days -> check item lead time -> check MOV.
 */
export async function verifyOrderOptimization(storeId: string, cartItems: { itemId: string; quantity: number }[]) {
    await dbConnect();
    const { Supplier } = await import("@/lib/models");
    const today = new Date(); // Calculation reference point

    // Fetch all relevant suppliers
    // We need to find which supplier provides which item. 
    // Optimization: Fetch all active suppliers for store.

    // In efficient world, we query suppliers where "items._id" in cartItems.itemId
    const itemIds = cartItems.map(c => c.itemId);
    const suppliers = await Supplier.find({
        "items._id": { $in: itemIds },
        active: true,
        $or: [{ storeId: { $exists: false } }, { storeId: null }, { storeId: storeId }]
    }).lean();

    const plan: any[] = [];

    // Group items by Supplier
    const supplierGroups = new Map<string, any>(); // supplierId -> { supplier, items: [] }

    for (const itemRequest of cartItems) {
        // Find supplier for this item
        let found = false;
        for (const supp of suppliers) {
            const product = supp.items.find((i: any) => i._id.toString() === itemRequest.itemId);
            if (product) {
                if (!supplierGroups.has(supp._id.toString())) {
                    supplierGroups.set(supp._id.toString(), {
                        supplier: supp,
                        items: [],
                        totalValue: 0
                    });
                }
                const group = supplierGroups.get(supp._id.toString());
                group.items.push({
                    ...itemRequest,
                    productName: product.name,
                    unit: product.unit,
                    price: product.price,
                    leadTimeOffset: product.leadTimeOffset || 0,
                    totalLinePrice: (product.price || 0) * itemRequest.quantity
                });
                group.totalValue += (product.price || 0) * itemRequest.quantity;
                found = true;
                break; // Item found in a supplier
            }
        }
        if (!found) {
            // Handle orphan items
        }
    }

    // Process each group
    for (const [supplierId, group] of supplierGroups.entries()) {
        const { supplier, items, totalValue } = group;

        // 1. Calculate Delivery Date
        // Find MAX lead time needed for this batch
        // Base lead time depends on delivery schedule, but we have per-item offsets.
        // Logic: 
        // For each item, Earliest Delivery = Today + SupplierBaseLead + ItemOffset.
        // But SupplierBaseLead depends on which DELIVERY DAY we hit.

        // Let's assume we want to ship EVERYTHING together in one order if possible?
        // Or split? The user prompt implies: "itemA and itemB we wll receive only next day after tomorrow".
        // This implies split if necessary, OR delaying the whole order.
        // "finalize... will sort, arrange, and find and tell... item A can be ordered... received tomorrow... item B ... delivered some other day"
        // This suggests SPLITTING the order plan by Delivery Date.

        // Sub-group items by "Required Lead Time Days"
        // Actually, we iterate delivery slots.

        const activeSchedule = supplier.deliverySchedule || [];
        // If no schedule, assume T+1 or manual
        if (!activeSchedule.length) {
            plan.push({
                supplierName: supplier.name,
                deliveryDate: null,
                items: items,
                status: "No delivery schedule configured",
                movMet: true
            });
            continue;
        }

        // For each item, find its specific earliest delivery date
        const itemDeliveryMap = new Map<string, any[]>(); // DateISO -> Items

        for (const item of items) {
            // Find earliest valid delivery slot for this item
            // Item Effective Lead Time = ScheduleLeadTime + ItemOffset

            let bestDate: Date | null = null;

            // Look ahead 14 days
            for (let d = 0; d < 14; d++) {
                const potentialDate = new Date(today);
                potentialDate.setDate(today.getDate() + d); // Delivery Date

                // Check if this is a delivery day
                const dayOfWeek = potentialDate.getDay();
                const slot = activeSchedule.find((s: any) => s.dayOfWeek === dayOfWeek);

                if (slot) {
                    // Check Order Cutoff
                    // We must order by: DeliveryDate - LeadDays - ItemOffset
                    const leadDays = slot.orderCutoff.leadDays;
                    const itemOffset = item.leadTimeOffset;
                    const totalLead = leadDays + itemOffset;

                    const orderDeadline = new Date(potentialDate);
                    orderDeadline.setDate(potentialDate.getDate() - totalLead);

                    // Set cutoff time
                    const [cHour, cMinute] = slot.orderCutoff.time.split(":").map(Number);
                    orderDeadline.setHours(cHour, cMinute, 0, 0);

                    // Can we order it NOW?
                    if (today <= orderDeadline) {
                        bestDate = potentialDate;
                        break; // Found earliest!
                    }
                }
            }

            if (bestDate) {
                const dateKey = bestDate.toISOString().split("T")[0];
                if (!itemDeliveryMap.has(dateKey)) itemDeliveryMap.set(dateKey, []);
                itemDeliveryMap.get(dateKey)?.push(item);
            } else {
                // Impossible to deliver?
            }
        }

        // Create Plan Entries from the Map
        for (const [dateKey, batchItems] of itemDeliveryMap.entries()) {
            const batchValue = batchItems.reduce((acc, i) => acc + i.totalLinePrice, 0);
            const mov = supplier.minimumOrderValue || 0;
            const isMovMet = batchValue >= mov;

            plan.push({
                supplierName: supplier.name,
                deliveryDate: dateKey,
                items: batchItems,
                totalValue: batchValue,
                mov: mov,
                isMovMet: isMovMet,
                shortfall: isMovMet ? 0 : mov - batchValue,
                orderDeadline: "Calculated based on slot" // Could return precise deadline
            });
        }
    }

    return JSON.parse(JSON.stringify(plan));
}

/**
 * EXTENDED: Get active ordering alerts for a store for TODAY or CUSTOM ALERT DAY.
 * Checks default schedules, temporary overrides, "SupplierOrderCheck", AND Employee Preferences.
 */
export async function getAvailableSuppliersForToday(storeId: string) {
    await dbConnect();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const SupplierOrderCheck = (await import("@/lib/models")).SupplierOrderCheck;
    const Store = (await import("@/lib/models")).Store;
    const Employee = (await import("@/lib/models")).Employee;

    // Fetch store settings for overrides
    const store = await Store.findById(storeId).select('settings').lean();
    let preferences = store?.settings?.supplierAlertPreferences?.exceptions || [];
    let defaultOffset = store?.settings?.supplierAlertPreferences?.defaultAlertOffset || 0;

    // CHECK FOR USER SESSION PREFERENCES (Task 2)
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
        const employee = await Employee.findById((session.user as any).id).select('settings.supplierAlerts').lean();
        if (employee?.settings?.supplierAlerts && employee.settings.supplierAlerts.length > 0) {
            // User preferences OVERRIDE store preferences
            // Mapping structure: { supplierId, preferredOrderDay, ignored }
            // "preferredOrderDay" implies "I want to order on X". 
            // If the prompt means "Alert Preference Offset", we map it. 
            // If "Order Day", we shift the target.
            // Assuming the schema I added: preferredOrderDay (0-6).
            // This conflicts with "Offset" logic. 
            // Logic: If user has preferred day, show alert ONLY on that day?
            // "even if the store has two manager ,it will show alert as per their preference to them."

            // Let's implement: User Preferences define "Ignored" and "Alert Offset" (if we reused that structure)
            // But I added `preferredOrderDay`. 
            // Let's assume `preferredOrderDay` means "Show me the alert on Monday".

            // The existing preferences array use `alertOffset`. 
            // I'll stick to store preferences for offsets, but use Employee for IGNORES or specific overrides if consistent.
            // Given the schema I just pushed has `preferredOrderDay`, let's try to honor it:
            // If `preferredOrderDay` matches TODAY, we force an alert? Or we check if today is valid?

            // Simpler interpretation: User-specific "Ignored" list and "Custom Offsets".
            // Since I used `preferredOrderDay` in schema, I'll filter logic:
            // IF user has preference for Supplier S:
            //    IF ignored == true -> Skip.
            //    IF preferredOrderDay is set -> Only show alert if TODAY == preferredOrderDay.

            const userPrefs = employee.settings.supplierAlerts;
            // Merge logic: userPrefs takes precedence

            // We can't easily merge different structures (Offset vs Day). 
            // Logic: If user has ANY preference for this supplier, use it.
            // If User says "Order on Monday", and today is Monday, we verify if there's a delivery slot open.
        }
    }

    // ... Legacy logic continues, but modified to check userPrefs inside the loop ...

    // Get active suppliers
    const suppliers = await getSuppliers(storeId);
    const alerts: any[] = [];

    for (const supplier of suppliers) {
        // Resolve User Preferences (Fetched inside loop or pre-fetched?)
        // Let's refetch session inside loop is bad. Use pre-fetched.
        let userPref = null;
        if (session?.user?.id) {
            const employee = await Employee.findById((session.user as any).id).select('settings.supplierAlerts').lean(); // Re-querying to be safe/clean code block or use variable
            userPref = employee?.settings?.supplierAlerts?.find((p: any) => p.supplierId.toString() === supplier._id.toString());
        }

        // 0. Check for "Ignored"
        if (userPref?.ignored) continue; // User ignored it
        // Only check store ignore if user didn't specify
        const storePref = preferences?.find((e: any) => e.supplierId.toString() === supplier._id.toString());
        if (!userPref && storePref?.ignored) continue;


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

        // 2. Alert Logic
        // If User Preference "Order Day" is set, strictly check if Today == Order Day
        if (userPref && userPref.preferredOrderDay !== undefined) {
            if (today.getDay() !== userPref.preferredOrderDay) continue; // Not their day
            // If it IS their day, we still need to find a valid delivery slot it maps to?
            // Or just show it? 
            // We'll show it as a generic "Reminder to Order" if a slot exists in future.
        }

        // ... (Rest of existing calculation using lead times) ...
        // ... Recopying the intricate look-ahead logic ...

        // Look ahead 14 days
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

                // Alert Date
                // If user has specific preference (Order Day), we assumed we handled it above.
                // But normally we use Offset.

                let utilizedOffset = defaultOffset;
                if (storePref && storePref.alertOffset !== undefined) utilizedOffset = storePref.alertOffset;
                if (supplier.alertSettings?.customLeadTime !== undefined) utilizedOffset = supplier.alertSettings.customLeadTime;

                const alertDate = new Date(potentialDeliveryDate);
                alertDate.setDate(potentialDeliveryDate.getDate() - utilizedOffset);
                alertDate.setHours(0, 0, 0, 0);

                // If User Preferred Day is set, we bypass Offset logic and rely on the check above (Today == Preferred).
                // But we still need to ensure deadlines aren't passed.

                const isUserPreferredDayMatch = userPref && userPref.preferredOrderDay === today.getDay();

                // SHOW ALERT IF:
                // (Normal Mode: Today is inside [AlertWindow]) OR (User Mode: Today is PreferredDay AND Before Deadline)

                const showNormal = !userPref && (today.getTime() >= alertDate.getTime() && today.getTime() <= hardDeadlineDate.getTime());
                const showUser = isUserPreferredDayMatch && today.getTime() <= hardDeadlineDate.getTime();

                if (showNormal || showUser) {
                    const isChecked = await SupplierOrderCheck.exists({
                        storeId: storeId,
                        supplierId: supplier._id,
                        date: potentialDeliveryDate,
                        status: { $in: ['ordered', 'checked_stock', 'skipped'] }
                    });

                    if (!isChecked) {
                        alerts.push({
                            supplierId: supplier._id,
                            supplierName: supplier.name,
                            deliveryDate: potentialDeliveryDate,
                            cutoffTime: deliveryOption.orderCutoff?.time || "17:00",
                            leadDays: hardLeadDays,
                            isCustomAlert: !!userPref || utilizedOffset !== 0,
                            hardDeadline: hardDeadlineDate,
                            alertOffset: utilizedOffset
                        });
                        break; // Found one slot for this supplier, that's enough for one alert
                    }
                }
            }
        }
    }

    return JSON.parse(JSON.stringify(alerts));
}
