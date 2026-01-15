"use server";

import dbConnect from "@/lib/db";
import { Supplier } from "@/lib/models";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSuppliers } from "@/lib/actions/supplier.actions";

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
 * Get active ordering alerts for a store for TODAY or CUSTOM ALERT DAY.
 * Checks default schedules, temporary overrides, and "SupplierOrderCheck" status.
 * Supports Store Preference Override.
 */
export async function getAvailableSuppliersForToday(storeId: string) {
    await dbConnect();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const SupplierOrderCheck = (await import("@/lib/models")).SupplierOrderCheck;
    const Store = (await import("@/lib/models")).Store;

    // Fetch store settings for overrides (Offsets & Ignores)
    const store = await Store.findById(storeId).select('settings').lean();
    const storeAlertPreferences = store?.settings?.supplierAlertPreferences || { defaultAlertOffset: 0, exceptions: [] };

    // Get active suppliers
    const suppliers = await getSuppliers(storeId);
    const alerts: any[] = [];

    for (const supplier of suppliers) {
        // 0. Check for "Ignored" preference First
        const preference = storeAlertPreferences.exceptions?.find((e: any) => e.supplierId.toString() === supplier._id.toString());
        if (preference?.ignored) continue;

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

        // Check Supplier-Specific Store Preference (Preferred Day)
        const storePref = supplier.storePreferences?.find((p: any) => p.storeId?.toString() === storeId);

        let shouldCheck = false;
        let referenceDate: Date | null = null;
        let isPreferenceBased = false;

        // Logic A: Preferred Order Day Set (Overrides calculation logic entirely?)
        // If user says "I order on Monday", we respect that strict day.
        if (storePref && storePref.preferredOrderDay !== undefined) {
            if (today.getDay() === storePref.preferredOrderDay) {
                // It is the preferred day. Find the SOONEST valid delivery that is >= Lead Time.
                shouldCheck = true;
                isPreferenceBased = true;

                // Look ahead 21 days for next valid delivery
                for (let i = 1; i <= 21; i++) {
                    const potentialDate = new Date(today);
                    potentialDate.setDate(today.getDate() + i);
                    const dDay = potentialDate.getDay();

                    const scheduleItem = activeSchedule.find((s: any) => s.dayOfWeek === dDay);
                    if (scheduleItem) {
                        const leadDays = scheduleItem.orderCutoff?.leadDays || 0;
                        // Minimum valid delivery date based on TODAY as order day
                        const minDeliveryDate = new Date(today);
                        minDeliveryDate.setDate(today.getDate() + leadDays);
                        minDeliveryDate.setHours(0, 0, 0, 0);

                        if (potentialDate >= minDeliveryDate) {
                            referenceDate = potentialDate; // Use delivery date as key
                            break; // Find closest
                        }
                    }
                }
            }
        }

        // Logic B: No Preference (Use Default Window Logic with Store Offsets)
        // Only run if not handled by Logic A
        if (!shouldCheck && !isPreferenceBased) {

            // Determine Alert Offset
            // Priority: Store Exception > Supplier Global > Default
            let alertOffset: number | undefined = undefined;

            if (preference && preference.alertOffset !== undefined) {
                alertOffset = preference.alertOffset;
            } else {
                alertOffset = supplier.alertSettings?.customLeadTime;
            }

            // Look ahead 14 days
            for (let i = 0; i < 14; i++) {
                const potentialDeliveryDate = new Date(today);
                potentialDeliveryDate.setDate(today.getDate() + i);
                const dayOfWeek = potentialDeliveryDate.getDay();

                const deliveryOption = activeSchedule.find((s: any) => s.dayOfWeek === dayOfWeek);

                if (deliveryOption) {
                    const hardLeadDays = deliveryOption.orderCutoff?.leadDays || 0;
                    const hardDeadlineDate = new Date(potentialDeliveryDate);
                    hardDeadlineDate.setDate(potentialDeliveryDate.getDate() - hardLeadDays);
                    hardDeadlineDate.setHours(0, 0, 0, 0);

                    // If alertOffset is undefined, we use hardLeadDays (alert on deadline day)
                    const effectiveAlertOffset = alertOffset !== undefined ? alertOffset : hardLeadDays;
                    const alertDate = new Date(potentialDeliveryDate);
                    alertDate.setDate(potentialDeliveryDate.getDate() - effectiveAlertOffset);
                    alertDate.setHours(0, 0, 0, 0);

                    if (today.getTime() >= alertDate.getTime() && today.getTime() <= hardDeadlineDate.getTime()) {
                        shouldCheck = true;
                        referenceDate = potentialDeliveryDate;
                        break;
                    }
                }
            }
        }

        if (shouldCheck && referenceDate) {
            const deliveryDate = referenceDate;

            // Check if handled
            const isChecked = await SupplierOrderCheck.exists({
                storeId: storeId,
                supplierId: supplier._id,
                date: deliveryDate,
                status: { $in: ['ordered', 'checked_stock', 'skipped'] }
            });

            if (!isChecked) {
                const dDay = deliveryDate.getDay();
                const option = activeSchedule.find((s: any) => s.dayOfWeek === dDay);

                alerts.push({
                    supplierId: supplier._id,
                    supplierName: supplier.name,
                    deliveryDate: deliveryDate,
                    cutoffTime: option?.orderCutoff?.time || "17:00",
                    leadDays: option?.orderCutoff?.leadDays || 0,
                    isPreferenceBased,
                    preferredDay: storePref?.preferredOrderDay
                });
            }
        }
    }

    return JSON.parse(JSON.stringify(alerts));
}
