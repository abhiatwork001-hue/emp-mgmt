"use server";

import dbConnect from "@/lib/db";
import { Store } from "@/lib/models";
import { checkApiLimit, trackApiUsage } from "@/lib/actions/api-usage.actions";

export async function updateStoreReviews(storeId: string) {
    try {
        await dbConnect();

        const store = await Store.findById(storeId);
        if (!store) throw new Error("Store not found");

        const placeId = store.googlePlaceId;
        const apiKey = process.env.GOOGLE_PLACES_API_KEY;

        if (!placeId) {
            return { success: false, message: "Store does not have a Google Place ID configured" };
        }

        if (!apiKey) {
            return { success: false, message: "Google Places API key not configured" };
        }

        let rating = 0;
        let userRatingsTotal = 0;
        let reviews = [];
        let starDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };



        // Check API Usage Limit (Daily Cap: 250)
        const limitCheck = await checkApiLimit("google-places", 250);
        if (!limitCheck.allowed) {

            return { success: false, message: "Daily API limit reached for Google Places" };
        }

        try {
            // Using Places API (New) for reviewsCountByRating
            // URL: https://places.googleapis.com/v1/places/{PLACE_ID}
            const response = await fetch(
                `https://places.googleapis.com/v1/places/${placeId}`,
                {
                    method: 'GET',
                    headers: {
                        'X-Goog-Api-Key': apiKey,
                        'X-Goog-FieldMask': 'rating,userRatingCount,reviewsCountByRating,reviews',
                        'Content-Type': 'application/json'
                    },
                    next: { revalidate: 0 }
                }
            );

            const data = await response.json();

            // Track Usage (Cost varies, but roughly same category)
            await trackApiUsage("google-places", 0.017);

            if (response.ok) {
                rating = data.rating || 0;
                userRatingsTotal = data.userRatingCount || 0;

                // Process Reviews (New API has slightly different structure for author)
                if (data.reviews) {
                    reviews = data.reviews.map((r: any) => ({
                        author_name: r.authorAttribution?.displayName || "Anonymous",
                        rating: r.rating,
                        text: r.text?.text || "",
                        time: Math.floor(new Date(r.publishTime).getTime() / 1000),
                        relative_time_description: r.relativePublishTimeDescription
                    }));
                }

                // Process Distribution
                if (data.reviewsCountByRating) {
                    data.reviewsCountByRating.forEach((item: any) => {
                        const r = item.rating;
                        if (r >= 1 && r <= 5) {
                            starDistribution[r as 1 | 2 | 3 | 4 | 5] = item.count;
                        }
                    });
                }


            } else {

                // FALLBACK to OLD API if New one fails or is not enabled

                const legacyFields = "rating,user_ratings_total,reviews";
                const legacyResponse = await fetch(
                    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${legacyFields}&key=${apiKey}&reviews_no_translations=true&reviews_sort=newest`,
                    { next: { revalidate: 0 } }
                );
                const legacyData = await legacyResponse.json();
                if (legacyData.status === "OK" && legacyData.result) {
                    rating = legacyData.result.rating || 0;
                    userRatingsTotal = legacyData.result.user_ratings_total || 0;
                    reviews = legacyData.result.reviews || [];

                } else {
                    return { success: false, message: `API Error: ${legacyData.status} - ${legacyData.error_message || 'Unknown error'}` };
                }
            }

        } catch (err) {

            return { success: false, message: "Network error fetching reviews" };
        }

        // Calculate rating change
        const previousRating = store.ratingHistory && store.ratingHistory.length > 0
            ? store.ratingHistory[store.ratingHistory.length - 1].rating
            : 0;
        const ratingChange = previousRating > 0 ? Number((rating - previousRating).toFixed(1)) : 0;

        // Keep author names (not anonymized) for authenticity
        const processedReviews = reviews.map((r: any) => ({
            author_name: r.author_name,
            rating: r.rating,
            text: r.text,
            time: r.time,
            relative_time_description: r.relative_time_description
        }));

        // Update DB
        store.googleRating = rating;
        store.googleUserRatingsTotal = userRatingsTotal;
        store.googleReviews = processedReviews;
        store.googleStarDistribution = starDistribution;

        // Add to history
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!store.ratingHistory) store.ratingHistory = [];

        const lastEntry = store.ratingHistory[store.ratingHistory.length - 1];
        const lastEntryDate = lastEntry ? new Date(lastEntry.date) : null;

        // Only add new entry if it's a new day OR rating changed
        if (!lastEntryDate || lastEntryDate.toDateString() !== today.toDateString() || Math.abs(ratingChange) >= 0.1) {
            store.ratingHistory.push({
                date: today,
                rating: rating,
                change: ratingChange,
                reviewsCount: userRatingsTotal,
                starDistribution: starDistribution
            });

        } else {
            // Update today's entry
            lastEntry.rating = rating;
            lastEntry.reviewsCount = userRatingsTotal;
            lastEntry.change = ratingChange;
            lastEntry.starDistribution = starDistribution;
        }

        store.lastReviewsUpdate = new Date();

        await store.save();

        return {
            success: true,
            rating,
            reviewsCount: userRatingsTotal,
            change: ratingChange,
            reviews: processedReviews
        };

    } catch (error: any) {

        return { success: false, message: error.message };
    }
}

export async function getStoreReviews(storeId: string) {
    try {
        await dbConnect();
        const store = await Store.findById(storeId).select('googleRating googleUserRatingsTotal googleReviews lastReviewsUpdate googlePlaceId name ratingHistory');

        if (!store) return null;

        return JSON.parse(JSON.stringify(store));
    } catch (error) {

        return null;
    }
}

export async function getAllStoresRatings() {
    try {
        await dbConnect();
        const stores = await Store.find({ active: true }).select('name slug googleRating googleUserRatingsTotal googleReviews lastReviewsUpdate ratingHistory monthlyStats');

        // Calculate trends for each store
        const now = new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const storesWithTrends = stores.map(store => {
            const history = store.ratingHistory || [];
            history.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

            const latestEntry = history[history.length - 1];
            const change = latestEntry?.change || 0;

            const startOfCurrentMonthEntry = history.find((h: any) => new Date(h.date) >= startOfCurrentMonth);
            const startOfLastMonthEntry = history.find((h: any) => new Date(h.date) >= startOfLastMonth && new Date(h.date) < startOfCurrentMonth);

            let monthlyNewReviews = 0;
            if (startOfCurrentMonthEntry) {
                monthlyNewReviews = (store.googleUserRatingsTotal || 0) - (startOfCurrentMonthEntry.reviewsCount || 0);
            }

            let comparison = null;
            if (startOfCurrentMonthEntry && startOfLastMonthEntry) {
                const lastMonthRating = startOfCurrentMonthEntry.rating || 0;
                const lastMonthReviews = (startOfCurrentMonthEntry.reviewsCount || 0) - (startOfLastMonthEntry.reviewsCount || 0);

                comparison = {
                    ratingDrop: Number(((store.googleRating || 0) - lastMonthRating).toFixed(2)),
                    reviewsCountChange: monthlyNewReviews - lastMonthReviews
                };
            }

            return {
                ...store.toObject(),
                trend: change,
                trendDirection: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
                comparison
            };
        });

        return JSON.parse(JSON.stringify(storesWithTrends));
    } catch (error) {

        return [];
    }
}

/**
 * Refresh all stores' reviews (for cron job)
 */
export async function refreshAllStoresReviews() {
    try {
        await dbConnect();
        const stores = await Store.find({ active: true, googlePlaceId: { $exists: true, $ne: null } });

        const results = [];
        for (const store of stores) {
            const result = await updateStoreReviews(store._id.toString());
            results.push({
                storeId: store._id,
                storeName: store.name,
                ...result
            });
        }

        return { success: true, results };
    } catch (error: any) {

        return { success: false, message: error.message };
    }
}

/**
 * Calculate and save monthly stats for a store
 */
export async function finalizeStoreMonthlyStats(storeId: string, month: number, year: number) {
    try {
        await dbConnect();
        const store = await Store.findById(storeId);
        if (!store) throw new Error("Store not found");

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        // 1. Get all ratingHistory entries for this month
        const monthlyHistory = (store.ratingHistory || []).filter((h: any) => {
            const d = new Date(h.date);
            return d >= startDate && d <= endDate;
        });

        if (monthlyHistory.length === 0) {
            return { success: false, message: "No history found for this month" };
        }

        // 2. Calculate average rating for the month (avg of daily ratings)
        const avgRating = monthlyHistory.reduce((acc: number, current: any) => acc + current.rating, 0) / monthlyHistory.length;

        // 3. Calculate new reviews count
        const startEntry = monthlyHistory[0];
        const endEntry = monthlyHistory[monthlyHistory.length - 1];
        const newReviews = (endEntry.reviewsCount || 0) - (startEntry.reviewsCount || 0);

        // 4. Calculate comments count (reviews with text)
        const commentsCount = (store.googleReviews || []).filter((r: any) =>
            r.text && r.text.trim().length > 0 &&
            new Date(r.time * 1000) >= startDate && new Date(r.time * 1000) <= endDate
        ).length;

        // 5. Star Distribution (from end of month)
        const starDistribution = endEntry.starDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        const stats = {
            year,
            month,
            avgRating: Number(avgRating.toFixed(2)),
            totalReviews: endEntry.reviewsCount || 0,
            newReviews: Math.max(0, newReviews),
            commentsCount,
            starDistribution
        };

        // Update or Add
        if (!store.monthlyStats) store.monthlyStats = [];
        const existingIdx = store.monthlyStats.findIndex((s: any) => s.year === year && s.month === month);

        if (existingIdx > -1) {
            store.monthlyStats[existingIdx] = stats;
        } else {
            store.monthlyStats.push(stats);
        }

        await store.save();
        return { success: true, stats };
    } catch (error: any) {
        console.error("Finalize Monthly Stats Error:", error);
        return { success: false, message: error.message };
    }
}

/**
 * Get monthly stats for a specific store and period
 */
export async function getStoreMonthlyStats(storeId: string, month: number, year: number) {
    try {
        await dbConnect();
        const store = await Store.findById(storeId).select('monthlyStats name');
        if (!store) return null;

        const stats = (store.monthlyStats || []).find((s: any) => s.year === year && s.month === month);
        return JSON.parse(JSON.stringify({
            storeName: store.name,
            stats: stats || null
        }));
    } catch (error) {
        return null;
    }
}
