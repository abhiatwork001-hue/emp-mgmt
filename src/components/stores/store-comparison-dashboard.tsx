"use client";

import { useEffect, useState } from "react";
import { getAllStoresRatings } from "@/lib/actions/google-places.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Star, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RatingHistory {
    date: string;
    rating: number;
}

interface StoreRating {
    _id: string;
    name: string;
    googleRating: number;
    googleUserRatingsTotal: number;
    lastReviewsUpdate?: string;
    ratingHistory?: RatingHistory[];
}

export function StoreComparisonDashboard() {
    const [stores, setStores] = useState<StoreRating[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRatings = async () => {
            try {
                const data = await getAllStoresRatings();
                // Sort by rating desc
                const sorted = (data || []).sort((a: StoreRating, b: StoreRating) => b.googleRating - a.googleRating);
                setStores(sorted);
            } catch (err) {
                console.error("Failed to load ratings", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRatings();
    }, []);

    const getTrend = (store: StoreRating) => {
        if (!store.ratingHistory || store.ratingHistory.length < 2) return { icon: <Minus className="w-4 h-4 text-gray-400" />, value: 0 };

        // Compare last two entries
        const current = store.ratingHistory[store.ratingHistory.length - 1];
        const previous = store.ratingHistory[store.ratingHistory.length - 2];

        const diff = current.rating - previous.rating;

        if (diff > 0) return { icon: <TrendingUp className="w-4 h-4 text-green-500" />, value: diff };
        if (diff < 0) return { icon: <TrendingDown className="w-4 h-4 text-red-500" />, value: diff };
        return { icon: <Minus className="w-4 h-4 text-gray-400" />, value: 0 };
    };

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Loading reputation data...</div>;
    }

    // Chart Data Preparation
    const chartData = stores.map(s => ({
        name: s.name,
        rating: s.googleRating,
        reviews: s.googleUserRatingsTotal
    })).slice(0, 10); // Top 10

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Performers Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Rated Stores</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" domain={[0, 5]} hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="rating" fill="#fbbf24" radius={[0, 4, 4, 0]} barSize={20} name="Rating" label={{ position: 'right', fill: '#666' }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Most Reviewed</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[...chartData].sort((a, b) => b.reviews - a.reviews)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="reviews" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} name="Reviews" label={{ position: 'right', fill: '#666' }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Store Reputation Performance</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Store Name</TableHead>
                                <TableHead>Rating</TableHead>
                                <TableHead>Total Reviews</TableHead>
                                <TableHead>Trend</TableHead>
                                <TableHead className="text-right">Last Updated</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stores.map((store) => {
                                const trend = getTrend(store);
                                return (
                                    <TableRow key={store._id}>
                                        <TableCell className="font-medium">{store.name}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <span className="font-bold">{store.googleRating?.toFixed(1) || "N/A"}</span>
                                                <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                            </div>
                                        </TableCell>
                                        <TableCell>{store.googleUserRatingsTotal || 0}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1" title={`${trend.value.toFixed(2)} change`}>
                                                {trend.icon}
                                                {trend.value !== 0 && <span className="text-xs">{Math.abs(trend.value).toFixed(1)}</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground text-xs">
                                            {store.lastReviewsUpdate ? new Date(store.lastReviewsUpdate).toLocaleDateString() : 'Never'}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
