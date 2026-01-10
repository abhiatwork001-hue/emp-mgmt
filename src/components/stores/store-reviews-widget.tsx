"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, StarHalf } from "lucide-react";
import { updateStoreReviews } from "@/lib/actions/google-places.actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Review {
    author_name: string;
    rating: number;
    text: string;
    time: number;
    relative_time_description: string;
}

interface StoreReviewsWidgetProps {
    storeId: string;
    reviews?: Review[];
    rating?: number;
    userRatingsTotal?: number;
    lastUpdated?: Date;
    compact?: boolean;
}

export function StoreReviewsWidget({
    storeId,
    reviews: initialReviews = [],
    rating: initialRating = 0,
    userRatingsTotal: initialTotal = 0,
    lastUpdated,
    compact = false
}: StoreReviewsWidgetProps) {
    const [reviews, setReviews] = useState<Review[]>(initialReviews);
    const [rating, setRating] = useState(initialRating);
    const [total, setTotal] = useState(initialTotal);
    const [isLoading, setIsLoading] = useState(false);

    const handleRefresh = async () => {
        setIsLoading(true);
        try {
            const res = await updateStoreReviews(storeId);
            if (res.success) {
                // Determine structure based on how we saved it (DB vs raw return)
                // The action returns { success: true, rating, reviewsCount } but doesn't return full list in response directly unless we adjust action.
                // Wait, action returns { success, rating, reviewsCount }. It updates DB.
                // We should re-fetch or use a separate getter. 
                // For simplified UX, I'll reload page or better yet, I should update the action to return the new data.
                // Reloading window to see fresh server-side data is easiest for now.
                window.location.reload();
            }
        } catch (error) {
            console.error("Failed to refresh reviews", error);
        } finally {
            setIsLoading(false);
        }
    };

    const renderStars = (score: number) => {
        const fullStars = Math.floor(score);
        const hasHalfStar = score % 1 >= 0.5;

        return (
            <div className="flex items-center text-yellow-500">
                {[...Array(fullStars)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                ))}
                {hasHalfStar && <StarHalf className="w-4 h-4 fill-current" />}
                {[...Array(5 - fullStars - (hasHalfStar ? 1 : 0))].map((_, i) => (
                    <Star key={`empty-${i}`} className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                ))}
            </div>
        );
    };

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{rating.toFixed(1)}</span>
                {renderStars(rating)}
                <span className="text-xs text-muted-foreground">({total})</span>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Google Reviews</CardTitle>
                <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold">{rating.toFixed(1)}</span>
                            <div className="flex flex-col">
                                {renderStars(rating)}
                                <span className="text-xs text-muted-foreground">{total} reviews</span>
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isLoading}>
                        {isLoading ? "Syncing..." : "Sync"}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {reviews.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">No reviews yet.</p>
                    ) : (
                        reviews.slice(0, 5).map((review, i) => (
                            <div key={i} className="border-b last:border-0 pb-3 last:pb-0">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        {/* Anonymized user - no avatar */}
                                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                                            {review.author_name.charAt(0)}
                                        </div>
                                        <span className="font-medium text-sm">{review.author_name}</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {review.relative_time_description}
                                    </span>
                                </div>
                                <div className="mb-1">
                                    {renderStars(review.rating)}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                                    {review.text}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
