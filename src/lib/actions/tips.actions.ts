"use server";

import connectToDB from "@/lib/db";
import { Schedule, TipsDistribution, StoreDepartment } from "@/lib/models";
import { revalidatePath } from "next/cache";

interface CalculationPeriod {
    startDate: string;
    endDate: string;
    amount: number;
}

interface RoundingConfig {
    enabled: boolean;
    step: number; // e.g. 0.5
}

// Helper to get departments for the selector
export async function getStoreDepartmentsForTips(storeId: string) {
    try {
        await connectToDB();
        const depts = await StoreDepartment.find({ storeId, active: true }).select('name _id').lean();
        return JSON.parse(JSON.stringify(depts));
    } catch (error) {
        return [];
    }
}

export async function calculateTipsDistribution(
    storeId: string,
    periods: CalculationPeriod[],
    departmentIds: string[] = [], // Empty = All
    roundingConfig: RoundingConfig = { enabled: true, step: 0.5 }
) {
    try {
        await connectToDB();
        console.log(`[TipsCalc] Starting for Store: ${storeId}`);
        console.log(`[TipsCalc] Periods:`, periods);
        console.log(`[TipsCalc] Depts:`, departmentIds);

        // 1. Prepare Data Structures
        // Map<EmployeeID, { name, totalShares, totalAmount, periodDetails: [] }>
        const employeeMap = new Map<string, {
            id: string;
            name: string;
            totalShares: number; // Weighted shifts across all periods
            totalAmount: number; // Raw sum before rounding
            periodDetails: { periodIndex: number, shares: number, amount: number }[];
        }>();

        // 2. Process Each Period
        for (let i = 0; i < periods.length; i++) {
            const period = periods[i];
            const start = new Date(period.startDate);
            const end = new Date(period.endDate);
            // End of day adjustment
            end.setHours(23, 59, 59, 999);

            console.log(`[TipsCalc] Querying Period ${i}: ${start.toISOString()} - ${end.toISOString()}`);

            // Fetch Schedules - Diagnostic Query first
            // We'll perform a broad query to diagnose WHY we find nothing
            const broadQuery: any = {
                storeId: storeId,
                "dateRange.startDate": { $lte: end },
                "dateRange.endDate": { $gte: start }
            };

            const allInPeriod = await Schedule.find(broadQuery).select('status storeDepartmentId').lean();

            if (allInPeriod.length === 0) {
                console.log(`[TipsCalc] No schedules found at all for period ${i}`);
                continue;
            }

            // Check matching departments
            let relevantSchedules = allInPeriod;
            if (departmentIds.length > 0) {
                relevantSchedules = allInPeriod.filter(s => departmentIds.includes(s.storeDepartmentId.toString()));
            }

            if (relevantSchedules.length === 0) {
                console.log(`[TipsCalc] Schedules exist, but none match selected departments: ${departmentIds.join(', ')}`);
                continue;
            }

            // Check Published status
            const publishedSchedules = relevantSchedules.filter(s => s.status === 'published');

            if (publishedSchedules.length === 0) {
                console.log(`[TipsCalc] Found ${relevantSchedules.length} relevant schedules, but NONE are 'published'. (Statuses: ${relevantSchedules.map(s => s.status).join(', ')})`);
                continue;
            }

            // If we get here, we have valid schedules. Now do the full fetch with populate.
            const query: any = {
                _id: { $in: publishedSchedules.map(s => s._id) }
            };

            console.log(`[TipsCalc] Fetching ${publishedSchedules.length} full published schedules...`);

            const schedules = await Schedule.find(query)
                .lean()
                .populate('days.shifts.employees', 'firstName lastName _id');

            console.log(`[TipsCalc] Successfully loaded ${schedules.length} schedules.`);

            // Calculate Shares for this period
            const periodEmployeeWeights = new Map<string, { weight: number, name: string }>();
            let totalPeriodWeight = 0;

            schedules.forEach((schedule: any) => {
                schedule.days.forEach((day: any) => {
                    const dayDate = new Date(day.date);
                    if (dayDate >= start && dayDate <= end) {
                        day.shifts.forEach((shift: any) => {
                            // Duration Calc
                            const [sH, sM] = shift.startTime.split(':').map(Number);
                            const [eH, eM] = shift.endTime.split(':').map(Number);

                            let duration = (eH + eM / 60) - (sH + sM / 60);
                            if (duration < 0) duration += 24; // overnight

                            // Deduct break
                            if (shift.breakMinutes) {
                                duration -= (shift.breakMinutes / 60);
                            }

                            // Weighted Logic
                            // < 7h -> 0.5
                            // 7 <= h < 10 -> 1.0
                            // 10 <= h < 12.5 -> 1.5
                            // >= 12.5 -> 2.0
                            let weight = 0.5;
                            if (duration >= 12.5) weight = 2.0;
                            else if (duration >= 10) weight = 1.5;
                            else if (duration >= 7) weight = 1.0;

                            if (shift.employees && shift.employees.length > 0) {
                                shift.employees.forEach((emp: any) => {
                                    if (emp && emp._id) {
                                        const empId = emp._id.toString();
                                        const current = periodEmployeeWeights.get(empId) || { weight: 0, name: `${emp.firstName} ${emp.lastName}` };
                                        current.weight += weight;
                                        periodEmployeeWeights.set(empId, current);
                                    }
                                });
                            }
                        });
                    }
                });
            });

            // Sum total weights for this period
            periodEmployeeWeights.forEach((val) => {
                totalPeriodWeight += val.weight;
            });

            console.log(`[TipsCalc] Period ${i} Total Shares: ${totalPeriodWeight}`);

            // Calculate Period Rate
            const periodRate = totalPeriodWeight > 0 ? period.amount / totalPeriodWeight : 0;

            // Distribute to Global Map
            periodEmployeeWeights.forEach((val, empId) => {
                const payout = val.weight * periodRate;

                if (!employeeMap.has(empId)) {
                    employeeMap.set(empId, {
                        id: empId,
                        name: val.name,
                        totalShares: 0,
                        totalAmount: 0,
                        periodDetails: []
                    });
                }
                const record = employeeMap.get(empId)!;
                record.totalShares += val.weight;
                record.totalAmount += payout;
                record.periodDetails.push({
                    periodIndex: i,
                    shares: val.weight,
                    amount: payout
                });
            });
        }

        // 3. Finalize & Rounding
        const records = Array.from(employeeMap.values()).map(r => {
            let finalAmt = r.totalAmount;
            if (roundingConfig.enabled) {
                // Round to nearest step (e.g. 0.50)
                finalAmt = Math.round(finalAmt / roundingConfig.step) * roundingConfig.step;
            }

            return {
                employeeId: r.id,
                employeeName: r.name,
                shiftsWorked: 0, // Legacy field, maybe sum shares?
                calculatedShares: parseFloat(r.totalShares.toFixed(2)),
                adjustedShares: parseFloat(r.totalShares.toFixed(2)),
                finalAmount: parseFloat(finalAmt.toFixed(2)),
                periodDetails: r.periodDetails
            };
        });

        console.log(`[TipsCalc] Final Records: ${records.length}`);

        if (records.length === 0) {
            return { success: false, error: "No eligible shifts found in the selected period(s). Check published schedules." };
        }

        return { success: true, records };

    } catch (error) {
        console.error("Error calculating tips:", error);
        return { success: false, error: "Failed to calculate tips distribution." };
    }
}

export async function saveTipsDistribution(data: any) {
    try {
        await connectToDB();

        // Calculate total amount from periods
        const totalAmount = data.periods.reduce((sum: number, p: any) => sum + p.amount, 0);

        // Find min start and max end for metadata
        const starts = data.periods.map((p: any) => new Date(p.startDate).getTime());
        const ends = data.periods.map((p: any) => new Date(p.endDate).getTime());
        const weekStartDate = new Date(Math.min(...starts));
        const weekEndDate = new Date(Math.max(...ends));

        await TipsDistribution.create({
            storeId: data.storeId,
            weekStartDate,
            weekEndDate,
            totalAmount,
            periods: data.periods,
            records: data.records,
            status: 'finalized',
            finalizedBy: data.userId,
            finalizedAt: new Date()
        });

        revalidatePath("/dashboard/tips");
        return { success: true };
    } catch (error) {
        console.error("Error saving tips:", error);
        return { success: false, error: "Failed to save distribution." };
    }
}

export async function getTipsHistory(storeId: string) {
    try {
        await connectToDB();
        const history = await TipsDistribution.find({ storeId }).sort({ createdAt: -1 }); // Sort by creation/finalization
        return JSON.parse(JSON.stringify(history));
    } catch (error) {
        return [];
    }
}
