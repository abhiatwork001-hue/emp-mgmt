"use server";

import dbConnect from "@/lib/db";
import { Store } from "@/lib/models";
// import { checkApiLimit, trackApiUsage } from "./api-usage.actions";

export interface MonthlyBreakdown {
    month: string; // e.g., "January 2024"
    avgRating: number;
    totalReviews: number;
    newReviews: number;
    ratingChange: number;
    starDistribution: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
    };
}

export interface MonthlyAnalytics {
    storeName: string;
    currentRating: number;
    totalReviews: number;
    monthlyNewReviews: number;
    monthlyRatingChange: number;
    comparison?: {
        ratingDrop: number;
        reviewsCountChange: number;
        percentageChange: number;
        lastMonthRating: number;
        lastMonthReviews: number;
    };
    lastReviewDate?: string;
    starDistribution?: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
    };
    history: {
        date: string;
        rating: number;
        reviewsCount: number;
    }[];
    breakdown: MonthlyBreakdown[];
}

export async function getStoreAnalytics(storeId: string): Promise<MonthlyAnalytics | null> {
    try {
        await dbConnect();

        const store = await Store.findById(storeId).select('name ratingHistory googleRating googleUserRatingsTotal lastReviewsUpdate googleStarDistribution');
        if (!store) return null;

        const history = store.ratingHistory || [];
        history.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Month over Month Comparison
        const now = new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        const currentRating = store.googleRating || 0;
        const totalReviews = store.googleUserRatingsTotal || 0;

        // Find snapshots
        const startOfCurrentMonthEntry = history.find((h: any) => new Date(h.date) >= startOfCurrentMonth);
        const startOfLastMonthEntry = history.find((h: any) => new Date(h.date) >= startOfLastMonth && new Date(h.date) < startOfCurrentMonth);

        let monthlyNewReviews = 0;
        let monthlyRatingChange = 0;

        if (startOfCurrentMonthEntry) {
            monthlyNewReviews = totalReviews - (startOfCurrentMonthEntry.reviewsCount || 0);
            monthlyRatingChange = currentRating - (startOfCurrentMonthEntry.rating || 0);
        }

        // Comparison Logic
        let comparison = undefined;
        if (startOfCurrentMonthEntry && startOfLastMonthEntry) {
            const lastMonthRating = startOfCurrentMonthEntry.rating || 0;
            const monthBeforeRating = startOfLastMonthEntry.rating || 0;

            const lastMonthReviews = (startOfCurrentMonthEntry.reviewsCount || 0) - (startOfLastMonthEntry.reviewsCount || 0);

            comparison = {
                ratingDrop: Number((currentRating - lastMonthRating).toFixed(2)),
                reviewsCountChange: monthlyNewReviews - lastMonthReviews,
                percentageChange: lastMonthReviews > 0 ? Number(((monthlyNewReviews - lastMonthReviews) / lastMonthReviews * 100).toFixed(1)) : 0,
                lastMonthRating: lastMonthRating,
                lastMonthReviews: lastMonthReviews
            };
        }

        // Monthly Breakdown
        const breakdownMap: Record<string, MonthlyBreakdown> = {};

        // Group history by month to find the snapshot for each month
        // We take the LAST entry of each month as the snapshot for that month
        const monthlySnapshots: Record<string, any> = {};
        history.forEach((entry: any) => {
            const date = new Date(entry.date);
            const key = `${date.getFullYear()}-${date.getMonth()}`;
            monthlySnapshots[key] = entry;
        });

        const sortedMonthKeys = Object.keys(monthlySnapshots).sort();
        const breakdown: MonthlyBreakdown[] = sortedMonthKeys.map((key, index) => {
            const entry = monthlySnapshots[key];
            const date = new Date(entry.date);
            const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });

            const prevEntry = index > 0 ? monthlySnapshots[sortedMonthKeys[index - 1]] : null;

            const newReviews = prevEntry ? (entry.reviewsCount || 0) - (prevEntry.reviewsCount || 0) : (entry.reviewsCount || 0);
            const ratingChange = prevEntry ? (entry.rating || 0) - (prevEntry.rating || 0) : 0;

            const monthlyStars: any = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            if (entry.starDistribution) {
                [1, 2, 3, 4, 5].forEach(s => {
                    const currentCount = entry.starDistribution[s as 1 | 2 | 3 | 4 | 5] || 0;
                    const prevCount = prevEntry?.starDistribution?.[s as 1 | 2 | 3 | 4 | 5] || 0;
                    monthlyStars[s] = Math.max(0, currentCount - prevCount);
                });
            }

            return {
                month: monthName,
                avgRating: entry.rating || 0,
                totalReviews: entry.reviewsCount || 0,
                newReviews: Math.max(0, newReviews),
                ratingChange: Number(ratingChange.toFixed(2)),
                starDistribution: monthlyStars
            };
        });

        return JSON.parse(JSON.stringify({
            storeName: store.name,
            currentRating,
            totalReviews,
            monthlyNewReviews: Math.max(0, monthlyNewReviews),
            monthlyRatingChange: Number(monthlyRatingChange.toFixed(2)),
            comparison,
            lastReviewDate: store.lastReviewsUpdate ? store.lastReviewsUpdate.toISOString() : undefined,
            starDistribution: store.googleStarDistribution,
            history: history.map((h: any) => ({
                date: h.date.toISOString(),
                rating: h.rating,
                reviewsCount: h.reviewsCount
            })),
            breakdown: breakdown.reverse() // Newest first
        }));

    } catch (error) {
        console.error("Get Store Analytics Error:", error);
        return null;
    }
}

export async function getAllStoresAnalytics() {
    try {
        await dbConnect();
        const stores = await Store.find({ active: true }).select('_id');

        const results = await Promise.all(stores.map((s: any) => getStoreAnalytics(s._id.toString())));
        return results.filter(r => r !== null);

    } catch (error) {
        console.error("Get All Stores Analytics Error:", error);
        return [];
    }
}
