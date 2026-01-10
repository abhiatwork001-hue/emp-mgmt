"use server";

import dbConnect from "@/lib/db";
import { Store } from "@/lib/models";

// Mock data for development and fallback
const MOCK_REVIEWS = [
    {
        author_name: "Customer A",
        rating: 5,
        text: "Great experience! Fast service.",
        time: Math.floor(Date.now() / 1000) - 86400,
        relative_time_description: "Yesterday"
    },
    {
        author_name: "Customer B",
        rating: 4,
        text: "Good food but slightly long wait.",
        time: Math.floor(Date.now() / 1000) - 172800,
        relative_time_description: "2 days ago"
    },
    {
        author_name: "Customer C",
        rating: 5,
        text: "Love this place!",
        time: Math.floor(Date.now() / 1000) - 604800,
        relative_time_description: "Last week"
    },
    {
        author_name: "Customer D",
        rating: 3,
        text: "It was okay.",
        time: Math.floor(Date.now() / 1000) - 1209600,
        relative_time_description: "2 weeks ago"
    },
    {
        author_name: "Customer E",
        rating: 5,
        text: "Best chicken in town.",
        time: Math.floor(Date.now() / 1000) - 2592000,
        relative_time_description: "Last month"
    }
];

export async function updateStoreReviews(storeId: string) {
    try {
        await dbConnect();

        const store = await Store.findById(storeId);
        if (!store) throw new Error("Store not found");

        const placeId = store.googlePlaceId;
        const apiKey = process.env.GOOGLE_PLACES_API_KEY;

        let rating = 0;
        let userRatingsTotal = 0;
        let reviews = [];

        if (placeId && apiKey) {
            console.log(`Fetching Google Reviews for Place ID: ${placeId}`);
            try {
                // Fetch Place Details (Rating, Reviews)
                // Fields: rating,user_ratings_total,reviews
                const fields = "rating,user_ratings_total,reviews";
                const response = await fetch(
                    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}&reviews_no_translations=true&reviews_sort=newest`
                );

                const data = await response.json();

                if (data.status === "OK" && data.result) {
                    rating = data.result.rating || 0;
                    userRatingsTotal = data.result.user_ratings_total || 0;
                    reviews = data.result.reviews || []; // Max 5 from API
                } else {
                    console.error("Google Places API Error:", data.status, data.error_message);
                    // Fallback to existing or mock if empty? 
                    // Better to keep existing if API fails
                    if (!store.googleRating && !store.googleReviews?.length) {
                        // Only mock if completely empty
                        rating = 4.5;
                        userRatingsTotal = 120;
                        reviews = MOCK_REVIEWS;
                    } else {
                        return { success: false, message: `API Error: ${data.status}` };
                    }
                }

            } catch (err) {
                console.error("Fetch Error:", err);
                return { success: false, message: "Network error fetching reviews" };
            }
        } else {
            console.log("No PlaceId or API Key, using mock data");
            // Simulator Mode
            rating = 4.8;
            userRatingsTotal = Math.floor(Math.random() * 500) + 50;
            reviews = MOCK_REVIEWS;
        }

        // Anonymize reviews (as requested)
        const anonymizedReviews = reviews.map((r: any) => ({
            author_name: "Anonymous Customer", // Hide name
            rating: r.rating,
            text: r.text,
            time: r.time,
            relative_time_description: r.relative_time_description
        }));

        // Update DB
        store.googleRating = rating;
        store.googleUserRatingsTotal = userRatingsTotal;
        store.googleReviews = anonymizedReviews;

        // Add to history if rating changed or it's a new day
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Simple check: if last entry is not today, add it
        // Or if rating changed significantly
        if (!store.ratingHistory) store.ratingHistory = [];

        const lastEntry = store.ratingHistory[store.ratingHistory.length - 1];
        if (!lastEntry || new Date(lastEntry.date).toDateString() !== today.toDateString()) {
            store.ratingHistory.push({ date: today, rating: rating });
        } else {
            // Update today's entry
            lastEntry.rating = rating;
        }

        store.lastReviewsUpdate = new Date();

        await store.save();

        return { success: true, rating, reviewsCount: userRatingsTotal };

    } catch (error: any) {
        console.error("Update Store Reviews Error:", error);
        return { success: false, message: error.message };
    }
}

export async function getStoreReviews(storeId: string) {
    try {
        await dbConnect();
        const store = await Store.findById(storeId).select('googleRating googleUserRatingsTotal googleReviews lastReviewsUpdate googlePlaceId name');

        if (!store) return null;

        // Auto-refresh if stale (> 24 hours) - optional logic, can be triggered by cron or manual
        // For now just return data
        return JSON.parse(JSON.stringify(store));
    } catch (error) {
        console.error("Get Store Reviews Error:", error);
        return null;
    }
}

export async function getAllStoresRatings() {
    try {
        await dbConnect();
        const stores = await Store.find({ active: true }).select('name googleRating googleUserRatingsTotal googleReviews lastReviewsUpdate ratingHistory');

        // Calculate trends or just return current
        return JSON.parse(JSON.stringify(stores));
    } catch (error) {
        console.error("Get All Stores Ratings Error:", error);
        return [];
    }
}

export async function seedMockReviewsForAllStores() {
    try {
        await dbConnect();
        const stores = await Store.find({ active: true });

        let count = 0;
        for (const store of stores) {
            // Only seed if empty
            if (!store.googleRating || store.googleRating === 0 || !store.googleReviews || store.googleReviews.length === 0) {
                const randomRating = (Math.random() * (5 - 3.5) + 3.5); // Random between 3.5 and 5
                const randomCount = Math.floor(Math.random() * 200) + 10;

                // Randomize reviews slightly
                const reviews = MOCK_REVIEWS.map(r => ({
                    ...r,
                    rating: Math.random() > 0.7 ? 5 : Math.floor(Math.random() * 3) + 3 // Mostly good
                }));

                store.googleRating = randomRating;
                store.googleUserRatingsTotal = randomCount;
                store.googleReviews = reviews;
                store.lastReviewsUpdate = new Date();

                // Add history entry
                if (!store.ratingHistory) store.ratingHistory = [];
                store.ratingHistory.push({ date: new Date(), rating: randomRating });

                await store.save();
                count++;
            }
        }

        return { success: true, count };
    } catch (error: any) {
        console.error("Seed Error:", error);
        return { success: false, message: error.message };
    }
}
