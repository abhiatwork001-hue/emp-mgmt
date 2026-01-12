"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Star, MessageSquare, BarChart3, Minus } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getStoreAnalytics, MonthlyAnalytics } from "@/lib/actions/analytics.actions";
import { useTranslations } from "next-intl";

interface StoreAnalyticsWidgetProps {
    storeId: string;
}

export function StoreAnalyticsWidget({ storeId }: StoreAnalyticsWidgetProps) {
    const t = useTranslations("Analytics");
    const [data, setData] = useState<MonthlyAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!storeId) return;

        const fetchData = async () => {
            try {
                const result = await getStoreAnalytics(storeId);
                setData(result);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [storeId]);

    if (isLoading) return <div className="h-64 animate-pulse bg-muted/20 rounded-xl" />;
    if (!data) return null;

    // Filter history to this month only
    const now = new Date();
    const currentMonthData = data.history.filter(h => new Date(h.date).getMonth() === now.getMonth() && new Date(h.date).getFullYear() === now.getFullYear());

    // Calculate max for bar distribution scaling
    const dist = data.starDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const maxCount = Math.max(...Object.values(dist), 1);

    return (
        <Card className="overflow-hidden border-none shadow-none bg-transparent space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-card hover:bg-muted/50 transition-colors border-l-4 border-l-yellow-500">
                    <CardContent className="p-4 flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                            <Star className="h-3 w-3" /> {t("avgRating")}
                        </span>
                        <div className="flex items-end justify-between">
                            <div className="flex flex-col">
                                <span className="text-3xl font-black text-yellow-600 dark:text-yellow-400">{data.currentRating.toFixed(1)}</span>
                                {data.comparison && (
                                    <span className={cn(
                                        "text-[10px] font-bold",
                                        data.comparison.ratingDrop >= 0 ? "text-green-600" : "text-red-600"
                                    )}>
                                        {data.comparison.ratingDrop >= 0 ? "+" : ""}{data.comparison.ratingDrop} vs {t("lastMonth")}
                                    </span>
                                )}
                            </div>
                            {data.monthlyRatingChange !== 0 && (
                                <span className={cn(
                                    "text-xs font-bold px-1.5 py-0.5 rounded flex items-center",
                                    data.monthlyRatingChange > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                )}>
                                    {data.monthlyRatingChange > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                    {Math.abs(data.monthlyRatingChange)}
                                </span>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card hover:bg-muted/50 transition-colors border-l-4 border-l-blue-500">
                    <CardContent className="p-4 flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                            <MessageSquare className="h-3 w-3" /> {t("reviewTrend")}
                        </span>
                        <div className="flex items-end justify-between">
                            <div className="flex flex-col">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-blue-600 dark:text-blue-400">{data.monthlyNewReviews}</span>
                                    <span className="text-xs font-bold text-muted-foreground">{t("new")}</span>
                                </div>
                                {data.comparison && (
                                    <span className={cn(
                                        "text-[10px] font-bold",
                                        data.comparison.reviewsCountChange >= 0 ? "text-green-600" : "text-red-600"
                                    )}>
                                        {data.comparison.reviewsCountChange >= 0 ? "+" : ""}{data.comparison.reviewsCountChange} ({data.comparison.percentageChange}%) vs {t("lastMonth")}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] font-medium text-muted-foreground">{t("total")}: {data.totalReviews}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card hover:bg-muted/50 transition-colors border-l-4 border-l-purple-500">
                    <CardContent className="p-4 flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                            <BarChart3 className="h-3 w-3" /> {t("latestActivity")}
                        </span>
                        <div className="flex items-end justify-between h-full pt-2">
                            <div className="flex flex-col flex-1 pl-1">
                                <span className="text-[10px] font-bold text-muted-foreground">{t("lastReview")}</span>
                                <span className="text-xs font-black font-mono truncate">
                                    {data.lastReviewDate ? format(new Date(data.lastReviewDate), 'MMM d, yyyy') : t("na")}
                                </span>
                            </div>
                            {/* Mini Star Breakdown Visualization */}
                            <div className="flex items-end gap-0.5 h-8 flex-1 justify-end pb-1 pr-1">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <div
                                        key={s}
                                        className={cn(
                                            "w-1.5 rounded-t-[1px]",
                                            s >= 4 ? "bg-green-500/40" : s === 3 ? "bg-yellow-500/40" : "bg-red-500/40"
                                        )}
                                        style={{ height: `${Math.max((dist[s as 1 | 2 | 3 | 4 | 5] / maxCount) * 100, 10)}%` }}
                                        title={`${s} Star: ${dist[s as 1 | 2 | 3 | 4 | 5]}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="h-full">
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> {t("ratingHistory")}
                        </CardTitle>
                        <div className="flex gap-2">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                <span className="text-[10px] text-muted-foreground uppercase font-bold">This Month</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[250px] p-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={currentMonthData}>
                                <defs>
                                    <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EAB308" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#EAB308" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(str) => format(new Date(str), 'd MMM')}
                                    tick={{ fontSize: 10 }}
                                    minTickGap={30}
                                />
                                <YAxis domain={['auto', 'auto']} hide />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                                    labelFormatter={(label) => format(new Date(label), 'PPP')}
                                />
                                <Area type="monotone" dataKey="rating" stroke="#EAB308" fillOpacity={1} fill="url(#colorRating)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Performance Comparison (Bar Chart) */}
                <Card className="h-full">
                    <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" /> Performance Comparison
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px] p-4 flex flex-col gap-6">
                        {data.comparison ? (
                            <div className="flex-1 flex flex-col gap-8 justify-center">
                                {/* Rating Comparison */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Average Rating</span>
                                        <span className={cn(
                                            "text-xs font-black",
                                            data.comparison.ratingDrop >= 0 ? "text-green-600" : "text-red-600"
                                        )}>
                                            {data.comparison.ratingDrop >= 0 ? "+" : ""}{data.comparison.ratingDrop}
                                        </span>
                                    </div>
                                    <div className="h-4 w-full bg-muted/30 rounded-full overflow-hidden flex">
                                        <div
                                            className="h-full bg-muted-foreground/20 border-r border-background flex items-center justify-end px-2"
                                            style={{ width: `${(data.comparison.lastMonthRating / 5) * 100}%` }}
                                        >
                                            <span className="text-[8px] font-bold text-muted-foreground/60">{data.comparison.lastMonthRating.toFixed(1)}</span>
                                        </div>
                                        <div
                                            className={cn(
                                                "h-full transition-all duration-1000 flex items-center justify-end px-2",
                                                data.comparison.ratingDrop >= 0 ? "bg-yellow-500" : "bg-red-500/50"
                                            )}
                                            style={{ width: `${(data.currentRating / 5) * 100}%` }}
                                        >
                                            <span className="text-[8px] font-black text-white">{data.currentRating.toFixed(1)}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-[9px] font-bold text-muted-foreground/50 px-1 uppercase tracking-tighter">
                                        <span>Last Month ({data.comparison.lastMonthRating.toFixed(1)})</span>
                                        <span>Current ({data.currentRating.toFixed(1)})</span>
                                    </div>
                                </div>

                                {/* Review Count Comparison */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Monthly New Reviews</span>
                                        <span className={cn(
                                            "text-xs font-black",
                                            data.comparison.reviewsCountChange >= 0 ? "text-blue-600" : "text-amber-600"
                                        )}>
                                            {data.comparison.reviewsCountChange >= 0 ? "+" : ""}{data.comparison.reviewsCountChange}
                                        </span>
                                    </div>
                                    <div className="h-4 w-full bg-muted/30 rounded-full overflow-hidden flex">
                                        <div
                                            className="h-full bg-muted-foreground/20 border-r border-background flex items-center justify-end px-2"
                                            style={{ width: `${Math.min(100, (data.comparison.lastMonthReviews / Math.max(data.monthlyNewReviews, data.comparison.lastMonthReviews, 1)) * 100)}%` }}
                                        >
                                            <span className="text-[8px] font-bold text-muted-foreground/60">{data.comparison.lastMonthReviews}</span>
                                        </div>
                                        <div
                                            className="h-full bg-blue-500 transition-all duration-1000 flex items-center justify-end px-2"
                                            style={{ width: `${Math.min(100, (data.monthlyNewReviews / Math.max(data.monthlyNewReviews, data.comparison.lastMonthReviews, 1)) * 100)}%` }}
                                        >
                                            <span className="text-[8px] font-black text-white">{data.monthlyNewReviews}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-[9px] font-bold text-muted-foreground/50 px-1 uppercase tracking-tighter">
                                        <span>Last Month ({data.comparison.lastMonthReviews})</span>
                                        <span>Current ({data.monthlyNewReviews})</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground italic text-xs">
                                Insufficient data for comparison
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Monthly Breakdown Table */}
                <Card className="h-full">
                    <CardHeader className="py-3 px-4 border-b">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" /> Monthly History
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-auto max-h-[250px]">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm shadow-sm z-10">
                                <tr className="text-[10px] font-bold text-muted-foreground uppercase border-b">
                                    <th className="px-4 py-2">Month</th>
                                    <th className="px-4 py-2">Rating</th>
                                    <th className="px-4 py-2">New</th>
                                    <th className="px-4 py-2">Breakdown</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {data.breakdown.map((mb, idx) => (
                                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 text-xs font-bold whitespace-nowrap">{mb.month}</td>
                                        <td className="px-4 py-3 text-xs font-black italic whitespace-nowrap">
                                            <div className="flex items-center gap-1">
                                                <span className="text-yellow-600">{mb.avgRating.toFixed(1)}</span>
                                                {mb.ratingChange !== 0 && (
                                                    <span className={cn(
                                                        "text-[9px]",
                                                        mb.ratingChange > 0 ? "text-green-600" : "text-red-600"
                                                    )}>
                                                        ({mb.ratingChange > 0 ? "+" : ""}{mb.ratingChange})
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs font-bold text-blue-600">+{mb.newReviews}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-end gap-0.5 h-4 w-12">
                                                {[1, 2, 3, 4, 5].map((s) => {
                                                    const count = mb.starDistribution[s as 1 | 2 | 3 | 4 | 5] || 0;
                                                    const maxInMonth = Math.max(...Object.values(mb.starDistribution), 1);
                                                    return (
                                                        <div
                                                            key={s}
                                                            className={cn(
                                                                "w-1 rounded-t-[0.5px]",
                                                                s >= 4 ? "bg-green-500" : s === 3 ? "bg-yellow-500" : "bg-red-500"
                                                            )}
                                                            style={{ height: `${Math.max((count / maxInMonth) * 100, 10)}%` }}
                                                            title={`${s} Star: ${count}`}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>
        </Card>
    );
}
