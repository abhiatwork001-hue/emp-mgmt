"use server";

import connectToDB from "@/lib/db";
import { Employee, Schedule, Notification, Store } from "@/lib/models";
import { revalidatePath } from "next/cache";

// --- Birthdays ---

export async function getUpcomingBirthdays(storeId: string) {
    try {
        await connectToDB();

        // Fetch all employees in store with DOB
        // Note: Mongoose doesn't support complex date comparisons easily in aggregate for "upcoming irrespective of year" 
        // without obscure operators. We'll fetch and filter in JS for simplicity unless scale is huge.
        const employees = await Employee.find({
            storeId: storeId,
            dateOfBirth: { $exists: true, $ne: null }
        }).select('firstName lastName dateOfBirth image').lean();

        const today = new Date();
        const currentYear = today.getFullYear();
        const limitDate = new Date();
        limitDate.setDate(today.getDate() + 30); // Look 30 days ahead

        const upcoming = employees.map((emp: any) => {
            const dob = new Date(emp.dateOfBirth);
            // set DOB to this year
            let nextBirthday = new Date(currentYear, dob.getMonth(), dob.getDate());

            // If birthday passed this year, check next year
            if (nextBirthday < today) {
                nextBirthday.setFullYear(currentYear + 1);
            }

            return {
                ...emp,
                nextBirthday,
                daysUntil: Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            };
        }).filter((emp: any) => {
            // Check if within 30 days
            return emp.daysUntil >= 0 && emp.daysUntil <= 30;
        }).sort((a: any, b: any) => a.daysUntil - b.daysUntil);

        return JSON.parse(JSON.stringify(upcoming));

    } catch (error) {
        console.error("Error fetching birthdays:", error);
        return [];
    }
}

export async function sendBirthdayGreeting(targetUserId: string, fromUserId: string) {
    try {
        await connectToDB();

        const sender = await Employee.findById(fromUserId).select('firstName lastName');

        await Notification.create({
            title: "Happy Birthday! 🎂",
            message: `Best wishes from ${sender.firstName} ${sender.lastName}!`,
            type: "success", // Green/Happy
            category: "general",
            recipients: [{ userId: targetUserId, read: false }],
            link: "/dashboard/profile",
            relatedEmployeeId: fromUserId
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error sending greeting:", error);
        return { success: false, error: "Failed to send greeting" };
    }
}


// --- Public Holidays ---

export async function getUpcomingHolidays(storeId: string) {
    try {
        const today = new Date();
        const currentYear = today.getFullYear();
        const nextYear = currentYear + 1;

        // Fetch API for PT (Portugal)
        // Note: connectToDB is not strictly needed for external API but we keep it if other logic needs db later

        const [resCurrent, resNext] = await Promise.all([
            fetch(`https://date.nager.at/api/v3/publicholidays/${currentYear}/PT`),
            fetch(`https://date.nager.at/api/v3/publicholidays/${nextYear}/PT`)
        ]);

        let holidays: any[] = [];
        if (resCurrent.ok) holidays = [...holidays, ...(await resCurrent.json())];
        if (resNext.ok) holidays = [...holidays, ...(await resNext.json())];

        // Process and filter
        const upcoming = holidays.map((h: any) => {
            const date = new Date(h.date);
            const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return {
                name: h.name,
                localName: h.localName,
                date: h.date, // String YYYY-MM-DD
                daysUntil
            };
        }).filter((h: any) => h.daysUntil >= 0 && h.daysUntil <= 90) // Show next 90 days
            .sort((a: any, b: any) => a.daysUntil - b.daysUntil);

        return upcoming;

    } catch (error) {
        console.error("Error fetching holidays:", error);
        return [];
    }
}
