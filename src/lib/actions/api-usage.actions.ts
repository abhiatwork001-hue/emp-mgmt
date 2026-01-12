"use server";

import dbConnect from "@/lib/db";
import { ApiUsage } from "@/lib/models";

export async function trackApiUsage(service: string, costPerCall: number = 0) {
    try {
        await dbConnect();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await ApiUsage.findOneAndUpdate(
            { service, date: today },
            {
                $inc: { count: 1, costEstimate: costPerCall },
                $setOnInsert: { service, date: today }
            },
            { upsert: true, new: true }
        );
        return { success: true };
    } catch (error) {
        console.error("Track API Usage Error:", error);
        return { success: false };
    }
}

export async function checkApiLimit(service: string, limit: number) {
    try {
        await dbConnect();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const usage = await ApiUsage.findOne({ service, date: today });
        if (!usage) return { allowed: true, usage: 0 };

        if (usage.count >= limit) {
            console.warn(`API Limit reached for ${service}: ${usage.count}/${limit}`);
            return { allowed: false, usage: usage.count };
        }

        return { allowed: true, usage: usage.count };
    } catch (error) {
        console.error("Check API Limit Error:", error);
        // Fail open to avoid blocking critical features on db error, 
        // unless strict limit is needed. Here we allow it.
        return { allowed: true };
    }
}

export async function getTodaysUsage() {
    try {
        await dbConnect();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const usage = await ApiUsage.find({ date: today });
        return { success: true, usage: JSON.parse(JSON.stringify(usage)) };
    } catch (error) {
        console.error("Get Today's Usage Error:", error);
        return { success: false, usage: [] };
    }
}
