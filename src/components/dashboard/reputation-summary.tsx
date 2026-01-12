"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface StoreRating {
    _id: string;
    slug: string;
    name: string;
    googleRating?: number;
    trend?: number;
    trendDirection?: 'up' | 'down' | 'stable';
    googleUserRatingsTotal?: number;
    comparison?: {
        ratingDrop: number;
        reviewsCountChange: number;
    };
}

interface ReputationSummaryProps {
    stores: StoreRating[];
}

export function ReputationSummary({ stores }: ReputationSummaryProps) {
    const t = useTranslations("Reputation");
    const tCommon = useTranslations("Common");
    const tReviews = useTranslations("Reviews");

    if (!stores || stores.length === 0) return null;

    // Filter out stores without ratings
    const activeStores = stores.filter(s => s.googleRating && s.googleRating > 0);

    // Calculate Average
    const avgRating = activeStores.reduce((acc, s) => acc + (s.googleRating || 0), 0) / (activeStores.length || 1);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-md font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Star className="h-4 w-4" /> {t("title")}
                </h3>
                <div className="flex items-center gap-2 text-sm font-bold bg-muted/50 px-3 py-1 rounded-full border">
                    <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    {avgRating.toFixed(1)} {t("avg")}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {activeStores.length === 0 ? (
                    <Card className="col-span-full p-8 text-center text-muted-foreground italic border-dashed">
                        {t("noRatings")}
                    </Card>
                ) : (
                    activeStores.map(store => (
                        <Link href={`/dashboard/stores/${store.slug}`} key={store._id} className="group block h-full">
                            <Card className="h-full hover:border-yellow-500/50 transition-all hover:shadow-md hover:bg-muted/5">
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-1 h-8 bg-muted rounded-full group-hover:bg-yellow-500 transition-colors shrink-0" />
                                            <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{store.name}</h4>
                                        </div>
                                        {store.trend !== 0 && (
                                            <div className={cn(
                                                "flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0",
                                                store.trend! > 0 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                                    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                            )}>
                                                {store.trend! > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                                                {Math.abs(store.trend!).toFixed(1)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-end gap-3 pl-3">
                                        <span className="text-3xl font-black tracking-tighter">{store.googleRating?.toFixed(1)}</span>
                                        <div className="mb-1 flex flex-col gap-0.5">
                                            <div className="flex text-yellow-500 gap-0.5">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={cn(
                                                            "w-3 h-3",
                                                            i < Math.floor(store.googleRating || 0) ? "fill-current" : "text-muted-foreground/20 fill-none"
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">
                                                {store.googleUserRatingsTotal} {tReviews("reviewsCount")}
                                            </span>
                                            {store.comparison && (
                                                <div className="flex gap-2">
                                                    {store.comparison.ratingDrop !== 0 && (
                                                        <span className={cn(
                                                            "text-[9px] font-bold",
                                                            store.comparison.ratingDrop > 0 ? "text-green-600" : "text-red-600"
                                                        )}>
                                                            {store.comparison.ratingDrop > 0 ? "+" : ""}{store.comparison.ratingDrop}
                                                        </span>
                                                    )}
                                                    {store.comparison.reviewsCountChange !== 0 && (
                                                        <span className={cn(
                                                            "text-[9px] font-bold text-blue-600"
                                                        )}>
                                                            {store.comparison.reviewsCountChange > 0 ? "+" : ""}{store.comparison.reviewsCountChange} {tReviews("new")}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))
                )}
            </div>

            <div className="flex justify-end">
                <Link href="/dashboard/reviews" className="flex items-center text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-tight">
                    {t("viewFullReport")} <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
            </div>
        </div>
    );
}
