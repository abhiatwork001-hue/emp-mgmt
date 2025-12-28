"use server";

import connectToDB from "@/lib/db";
import { Supplier, Product } from "@/lib/models";
import { revalidatePath } from "next/cache";

// --- Suppliers ---
export async function createSupplier(data: any) {
    try {
        await connectToDB();
        const supplier = await Supplier.create(data);
        revalidatePath("/admin/suppliers");
        return { success: true, supplier: JSON.parse(JSON.stringify(supplier)) };
    } catch (error) {
        return { success: false, error: "Failed to create supplier" };
    }
}

export async function getSuppliers() {
    try {
        await connectToDB();
        const suppliers = await Supplier.find().sort({ name: 1 });
        return JSON.parse(JSON.stringify(suppliers));
    } catch (error) {
        return [];
    }
}

// --- Products ---
export async function createProduct(data: any) {
    try {
        await connectToDB();
        const product = await Product.create(data);
        revalidatePath("/admin/suppliers");
        return { success: true, product: JSON.parse(JSON.stringify(product)) };
    } catch (error) {
        return { success: false, error: "Failed to create product" };
    }
}

export async function getProducts(supplierId?: string) {
    try {
        await connectToDB();
        const query = supplierId ? { supplierId } : {};
        const products = await Product.find(query).populate('supplierId').sort({ name: 1 });
        return JSON.parse(JSON.stringify(products));
    } catch (error) {
        return [];
    }
}

// --- Order Logic ---
export async function getOrderReminders() {
    try {
        await connectToDB();
        const suppliers = await Supplier.find().lean();
        const reminders: any[] = [];

        const now = new Date();
        const dayName = now.toLocaleDateString("en-US", { weekday: 'long' }); // e.g., "Monday"

        suppliers.forEach((supplier: any) => {
            // Logic: 
            // 1. Check upcoming delivery days.
            // 2. If 'today' + 'leadTime' overlaps with a Delivery Day's Order Window, trigger reminder.

            // Simplified Rule for MVP:
            // If Tomorrow is a Delivery Day, Order Today.
            // If Cutoff Time passed, mark as URGENT or LATE.

            // Find next delivery day index
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const todayIndex = now.getDay();
            const tomorrowIndex = (todayIndex + 1) % 7;
            const tomorrowName = days[tomorrowIndex];

            if (supplier.deliveryDays.includes(tomorrowName)) {
                // Determine Urgency based on Cutoff Time
                let isUrgent = false;
                let isOverdue = false;

                if (supplier.orderCutoffTime) {
                    const [h, m] = supplier.orderCutoffTime.split(':').map(Number);
                    const cutoff = new Date();
                    cutoff.setHours(h, m, 0, 0);

                    const timeDiff = (cutoff.getTime() - now.getTime()) / (1000 * 60); // minutes until cutoff

                    if (timeDiff < 0) isOverdue = true; // Cutoff passed
                    else if (timeDiff < 120) isUrgent = true; // Less than 2 hours left
                }

                reminders.push({
                    type: 'order',
                    title: `Order for ${supplier.name}`,
                    description: `Delivery scheduled for ${tomorrowName}. Order by ${supplier.orderCutoffTime || 'EOD'}.`,
                    supplierId: supplier._id,
                    isUrgent,
                    isOverdue,
                    cutoff: supplier.orderCutoffTime
                });
            }
        });

        return JSON.parse(JSON.stringify(reminders));
    } catch (error) {
        console.error("Error generating order reminders:", error);
        return [];
    }
}
