"use server";

import dbConnect from "@/lib/db";
import { Supplier } from "@/lib/models"; // Ensure Supplier model is exported
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type PlanItem = {
    searchedName: string;
    foundItemName?: string;
    supplierName?: string;
    supplierId?: string;
    orderDeadline?: Date;
    deliveryDate?: Date;
    leadDays?: number;
    error?: string; // e.g. "No supplier found"
};

export type SupplierPlan = {
    supplierId: string;
    supplierName: string;
    items: { searched: string, found: string }[];
    orderDeadline: Date;
    deliveryDate: Date;
    minOrderValue?: number;
    isTaxExclusive?: boolean;
};

export async function generateOrderPlan(items: string[], storeId: string): Promise<{ plans: SupplierPlan[], unmapped: string[] }> {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    // 1. Fetch all relevant suppliers
    // We reuse logic from getSuppliers to handle store-specific + global
    const query = {
        active: true,
        $or: [
            { storeId: { $exists: false } },
            { storeId: null },
            { storeId: storeId }
        ]
    };
    const suppliers = await Supplier.find(query).lean();

    const plansMap: Record<string, SupplierPlan> = {};
    const unmapped: string[] = [];

    const today = new Date();
    // Normalize today for comparison
    today.setHours(0, 0, 0, 0);

    for (const itemRequest of items) {
        const cleanRequest = itemRequest.trim().toLowerCase();
        if (!cleanRequest) continue;

        let bestMatch: { supplier: any, item: any } | null = null;

        // Simple fuzzy match: check if supplier item *contains* request or request *contains* supplier item
        // e.g. "tomatoes" matches "Round Tomatoes 5kg"

        for (const supplier of suppliers) {
            if (!supplier.items) continue;
            const match = supplier.items.find((i: any) =>
                i.name.toLowerCase().includes(cleanRequest) ||
                cleanRequest.includes(i.name.toLowerCase())
            );

            if (match) {
                // If we found a match, is it "better" than previous? 
                // For now, take first match or maybe prefer store-specific supplier?
                // If we already have a match, and this supplier is global but previous was store-specific, keep store-specific?
                // Let's just break on first match for MVP simplicity.
                bestMatch = { supplier, item: match };
                break;
            }
        }

        if (bestMatch) {
            const { supplier, item } = bestMatch;
            const supplierId = supplier._id.toString();

            // Calculate Order Deadline
            // Find NEAREST delivery date from today
            // Schedule: [{dayOfWeek: 1, orderCutoff: {leadDays: 1, time: '17:00'}}]

            let bestSchedule: { deliveryDate: Date, deadlineDate: Date } | null = null;

            // Check next 14 days
            for (let i = 1; i <= 14; i++) {
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + i);
                const dayOfWeek = targetDate.getDay();

                const schedule = supplier.deliverySchedule?.find((s: any) => s.dayOfWeek === dayOfWeek);
                if (schedule) {
                    // Check deadline
                    const leadDays = schedule.orderCutoff?.leadDays || 0;
                    const deadlineDate = new Date(targetDate);
                    deadlineDate.setDate(targetDate.getDate() - leadDays);
                    // Set time
                    const [hours, mins] = (schedule.orderCutoff?.time || "17:00").split(":").map(Number);
                    deadlineDate.setHours(hours, mins, 0, 0);

                    // If deadline is in future (or today but not passed time?)
                    // If deadline is today, check time.
                    const now = new Date();
                    if (deadlineDate > now) {
                        bestSchedule = { deliveryDate: targetDate, deadlineDate };
                        break; // Found earliest viable delivery
                    }
                }
            }

            if (!bestSchedule) {
                // Supplier exists but no viable schedule found soon?
                // Fallback or mark error?
                unmapped.push(`${cleanRequest} (No delivery soon from ${supplier.name})`);
                continue;
            }

            // Add to Plan
            // Key by Supplier ID AND Delivery Date (Different delivery dates = different orders)
            // Actually, usually we want to consolidate. 
            // If I need tomatoes (Wed) and napkins (Fri), they might be separate orders.
            // But usually we try to batch.
            // Let's Key by Supplier ID for now and show the *earliest* deadline for the batch?
            // Or split?
            // If I order everything now, I satisfy all deadlines.
            // So key by Supplier. The "Order Deadline" for the whole batch is the MINIMUM of strict deadlines.

            if (!plansMap[supplierId]) {
                plansMap[supplierId] = {
                    supplierId,
                    supplierName: supplier.name,
                    items: [],
                    orderDeadline: bestSchedule.deadlineDate, // Initial
                    deliveryDate: bestSchedule.deliveryDate, // Initial
                    minOrderValue: supplier.minimumOrderValue,
                    isTaxExclusive: supplier.minimumOrderIsTaxExclusive
                };
            }

            // Update deadline if this item needs it SOONER
            if (bestSchedule.deadlineDate < plansMap[supplierId].orderDeadline) {
                plansMap[supplierId].orderDeadline = bestSchedule.deadlineDate;
                plansMap[supplierId].deliveryDate = bestSchedule.deliveryDate; // Associated delivery matches deadline
            }

            plansMap[supplierId].items.push({ searched: itemRequest, found: item.name });

        } else {
            unmapped.push(itemRequest);
        }
    }

    return {
        plans: Object.values(plansMap),
        unmapped
    };
}
