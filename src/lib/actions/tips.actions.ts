"use server";

import connectToDB from "@/lib/db";
import { Schedule, TipsDistribution, Employee } from "@/lib/models";
import { revalidatePath } from "next/cache";

// Calculate shares based on shifts in the given week
export async function calculatePotentialDistribution(storeId: string, startDateStr: string, endDateStr: string, totalAmount: number) {
    try {
        await connectToDB();
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);

        // Fetch Schedule covering this week
        // Note: Schedule model stores ranges. We need to find schedule(s) that overlap.
        // For simplicity, assuming one schedule covers the week or we iterate days properly.

        // Find published schedules that overlap with our week
        const schedules = await Schedule.find({
            storeId: storeId,
            status: 'published',
            "dateRange.startDate": { $lte: end },
            "dateRange.endDate": { $gte: start }
        }).lean().populate('days.shifts.employees', 'firstName lastName _id');

        const employeeMap = new Map<string, {
            id: string;
            name: string;
            shiftsWorked: number;
            shares: number;
        }>();

        schedules.forEach((schedule: any) => {
            schedule.days.forEach((day: any) => {
                const dayDate = new Date(day.date);
                if (dayDate >= start && dayDate <= end) {
                    day.shifts.forEach((shift: any) => {
                        // Calculate Duration
                        // Shift times are strings "HH:mm"
                        const [sH, sM] = shift.startTime.split(':').map(Number);
                        const [eH, eM] = shift.endTime.split(':').map(Number);

                        let duration = (eH + eM / 60) - (sH + sM / 60);
                        if (duration < 0) duration += 24; // overnight

                        // Deduct break (assuming breakTime is minutes) ?? 
                        // Model schema Check provided earlier: breakTime is number (minutes).
                        if (shift.breakTime) {
                            duration -= (shift.breakTime / 60);
                        }

                        // Rule: < 7h = 0.5, >= 7h = 1.0
                        const weight = duration >= 7 ? 1.0 : 0.5;

                        shift.employees.forEach((emp: any) => {
                            const empId = emp._id.toString();
                            if (!employeeMap.has(empId)) {
                                employeeMap.set(empId, {
                                    id: empId,
                                    name: `${emp.firstName} ${emp.lastName}`,
                                    shiftsWorked: 0,
                                    shares: 0
                                });
                            }

                            const record = employeeMap.get(empId)!;
                            record.shiftsWorked += 1;
                            record.shares += weight;
                        });
                    });
                }
            });
        });

        // Convert Map to Array
        const records = Array.from(employeeMap.values()).map(r => ({
            employeeId: r.id,
            employeeName: r.name,
            shiftsWorked: r.shiftsWorked,
            calculatedShares: r.shares,
            adjustedShares: r.shares, // Default to calculated
            finalAmount: 0 // Will be calc client side or here
        }));

        return { success: true, records };

    } catch (error) {
        console.error("Error calculating tips:", error);
        return { success: false, error: "Failed to calculate" };
    }
}

export async function saveTipsDistribution(data: any) {
    try {
        await connectToDB();

        await TipsDistribution.create({
            storeId: data.storeId,
            weekStartDate: new Date(data.weekStartDate),
            weekEndDate: new Date(data.weekEndDate),
            totalAmount: data.totalAmount,
            records: data.records,
            status: 'finalized',
            finalizedBy: data.userId,
            finalizedAt: new Date()
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error saving tips:", error);
        return { success: false, error: "Failed to save" };
    }
}

export async function getTipsHistory(storeId: string) {
    try {
        await connectToDB();
        const history = await TipsDistribution.find({ storeId }).sort({ weekStartDate: -1 });
        return JSON.parse(JSON.stringify(history));
    } catch (error) {
        return [];
    }
}
