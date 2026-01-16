"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, StarHalf, TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";
import { updateStoreReviews } from "@/lib/actions/google-places.actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useTranslations, useLocale } from "next-intl";
import { ptBR, enUS } from "date-fns/locale";

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
    ratingChange?: number;
    compact?: boolean;
    googlePlaceId?: string;
}

export function StoreReviewsWidget({
    storeId,
    reviews: initialReviews = [],
    rating: initialRating = 0,
    userRatingsTotal: initialTotal = 0,
    lastUpdated,
    ratingChange: initialChange = 0,
    compact = false,
    googlePlaceId
}: StoreReviewsWidgetProps) {
    const t = useTranslations("Reviews");
    const locale = useLocale();
    const dateLocale = locale === 'pt' ? ptBR : enUS;
    const [reviews, setReviews] = useState<Review[]>(initialReviews);
    const [rating, setRating] = useState(initialRating);
    const [total, setTotal] = useState(initialTotal);
    const [ratingChange, setRatingChange] = useState(initialChange);
    const [isLoading, setIsLoading] = useState(false);

    const handleRefresh = async () => {
        setIsLoading(true);
        try {
            const res = await updateStoreReviews(storeId);
            if (res.success) {
                // Update local state with new data
                setRating(res.rating || 0);
                setTotal(res.reviewsCount || 0);
                setRatingChange(res.change || 0);
                setReviews(res.reviews || []);
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

    const getRatingChangeDisplay = () => {
        if (!ratingChange || Math.abs(ratingChange) < 0.1) return null;

        const isPositive = ratingChange > 0;
        const Icon = isPositive ? TrendingUp : TrendingDown;
        const color = isPositive ? "text-green-600" : "text-red-600";
        const bgColor = isPositive ? "bg-green-50" : "bg-red-50";

        return (
            <Badge variant="outline" className={cn("gap-1 font-semibold", bgColor, color)}>
                <Icon className="h-3 w-3" />
                {isPositive ? '+' : ''}{ratingChange.toFixed(1)}
            </Badge>
        );
    };

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{rating.toFixed(1)}</span>
                {renderStars(rating)}
                <span className="text-xs text-muted-foreground">({total})</span>
                {getRatingChangeDisplay()}
            </div>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">{t("title")}</CardTitle>
                <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold">{rating.toFixed(1)}</span>
                            <div className="flex flex-col">
                                {renderStars(rating)}
                                <span className="text-xs text-muted-foreground">{total} {t("reviewsCount")}</span>
                            </div>
                        </div>
                        {getRatingChangeDisplay()}
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isLoading}>
                            {isLoading ? t("syncing") : t("sync")}
                        </Button>
                        {googlePlaceId && (
                            <Button variant="ghost" size="icon" asChild title={t("viewMaps")}>
                                <a href={`https://search.google.com/local/reviews?placeid=${googlePlaceId}`} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {lastUpdated && (
                    <p className="text-xs text-muted-foreground mb-3">
                        {t('lastUpdated', { time: formatDistanceToNow(new Date(lastUpdated), { addSuffix: true, locale: dateLocale }) })}
                    </p>
                )}
                <div className="space-y-4">
                    {reviews.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">{t("noReviews")}</p>
                    ) : (
                        reviews.slice(0, 5).map((review, i) => (
                            <div key={i} className="border-b last:border-0 pb-3 last:pb-0">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                                            {review.author_name.charAt(0)}
                                        </div>
                                        <span className="font-medium text-sm">{review.author_name}</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(review.time * 1000), { addSuffix: true, locale: dateLocale })}
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
