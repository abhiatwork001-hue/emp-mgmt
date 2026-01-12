"use client";

import { useEffect, useState } from "react";
import { getAllStoresRatings, getStoreMonthlyStats } from "@/lib/actions/google-places.actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Star, TrendingUp, TrendingDown, Minus, Calendar, Store, MessageSquare, BarChart3, ChevronRight, ChevronLeft } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, LineChart, Line } from 'recharts';
import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface RatingHistory {
    date: string;
    rating: number;
}

interface MonthlyStat {
    year: number;
    month: number;
    avgRating: number;
    totalReviews: number;
    newReviews: number;
    commentsCount: number;
    starDistribution: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
    };
}

interface StoreRating {
    _id: string;
    name: string;
    googleRating: number;
    googleUserRatingsTotal: number;
    lastReviewsUpdate?: string;
    ratingHistory?: RatingHistory[];
    monthlyStats?: MonthlyStat[];
    googleStarDistribution?: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
    };
}

export function StoreComparisonDashboard() {
    const t = useTranslations("Comparison");
    const [stores, setStores] = useState<StoreRating[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Comparison State
    const [compareA, setCompareA] = useState<{ storeId: string, month: number, year: number }>({ storeId: "", month: new Date().getMonth() + 1, year: new Date().getFullYear() });
    const [compareB, setCompareB] = useState<{ storeId: string, month: number, year: number }>({ storeId: "", month: new Date().getMonth() + 1, year: new Date().getFullYear() });
    const [statsA, setStatsA] = useState<MonthlyStat | null>(null);
    const [statsB, setStatsB] = useState<MonthlyStat | null>(null);

    // Monthly Overview State
    const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
    const [overviewMonth, setOverviewMonth] = useState(new Date().getMonth() + 1);
    const [overviewYear, setOverviewYear] = useState(new Date().getFullYear());
    const [isFinalizing, setIsFinalizing] = useState<string | null>(null);

    useEffect(() => {
        const fetchRatings = async () => {
            try {
                const data = await getAllStoresRatings();
                const sorted = (data || []).sort((a: StoreRating, b: StoreRating) => b.googleRating - a.googleRating);
                setStores(sorted);
                if (sorted.length > 0) {
                    setCompareA(prev => ({ ...prev, storeId: sorted[0]._id }));
                    setCompareB(prev => ({ ...prev, storeId: sorted[1]?._id || sorted[0]._id }));
                    setSelectedStoreIds([sorted[0]._id]);
                }
            } catch (err) {
                console.error("Failed to load ratings", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRatings();
    }, []);

    // Fetch Stats for Comparison
    useEffect(() => {
        const fetchComp = async () => {
            if (compareA.storeId) {
                const res = await getStoreMonthlyStats(compareA.storeId, compareA.month, compareA.year);
                setStatsA(res?.stats || null);
            }
            if (compareB.storeId) {
                const res = await getStoreMonthlyStats(compareB.storeId, compareB.month, compareB.year);
                setStatsB(res?.stats || null);
            }
        };
        fetchComp();
    }, [compareA, compareB]);

    const getMonthsList = (year?: number) => {
        const allMonths = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        const now = new Date();
        if (year === now.getFullYear()) {
            return allMonths.slice(0, now.getMonth() + 1);
        }
        return allMonths;
    };

    const getYearsList = () => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - i);
    };

    const toggleStore = (id: string) => {
        setSelectedStoreIds(prev =>
            prev.includes(id) ? (prev.length > 1 ? prev.filter(x => x !== id) : prev) : [...prev, id]
        );
    };

    const handleFinalize = async (storeId: string) => {
        setIsFinalizing(storeId);
        try {
            const now = new Date();
            const res = await (await import("@/lib/actions/google-places.actions")).finalizeStoreMonthlyStats(storeId, now.getMonth() + 1, now.getFullYear());
            if (res.success) {
                const data = await getAllStoresRatings();
                setStores(data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsFinalizing(null);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-foreground">{t("loading")}</div>;
    }

    const now = new Date();
    const maxMonth = overviewYear === now.getFullYear() ? now.getMonth() + 1 : 12;
    const months = Array.from({ length: maxMonth }, (_, i) => i + 1);

    const trendChartData = months.map(m => {
        const entry: any = { month: m };
        selectedStoreIds.forEach(id => {
            const store = stores.find(s => s._id === id);
            const stat = store?.monthlyStats?.find(ms => ms.year === overviewYear && ms.month === m);
            if (stat) {
                entry[store?.name || id] = stat.avgRating;
            }
        });
        return entry;
    }).filter(e => Object.keys(e).length > 1);

    const topRatedData = [...stores]
        .sort((a, b) => b.googleRating - a.googleRating)
        .slice(0, 6)
        .map(s => ({ name: s.name, rating: s.googleRating }));

    const mostReviewedData = [...stores]
        .sort((a, b) => b.googleUserRatingsTotal - a.googleUserRatingsTotal)
        .slice(0, 6)
        .map(s => ({ name: s.name, total: s.googleUserRatingsTotal }));

    const comparisonChartData = [
        { name: "Avg Rating", A: statsA?.avgRating || 0, B: statsB?.avgRating || 0 },
        { name: "New Reviews", A: statsA?.newReviews || 0, B: statsB?.newReviews || 0 },
        { name: "Comments", A: statsA?.commentsCount || 0, B: statsB?.commentsCount || 0 },
    ];

    const getTrend = (store: StoreRating) => {
        // 1. Try Monthly Stats first
        if (store.monthlyStats && store.monthlyStats.length > 0) {
            const stats = [...store.monthlyStats].sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));
            const last = stats[stats.length - 1];
            // Compare current live rating vs latest finalized month
            const diff = Number((store.googleRating - last.avgRating).toFixed(2));
            return { val: Math.abs(diff), dir: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable' };
        }

        // 2. Fallback to Daily History (if no monthly stats yet)
        if (store.ratingHistory && store.ratingHistory.length > 0) {
            // Sort history by date
            const history = [...store.ratingHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // Get rating from ~30 days ago, or oldest available
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Find the entry closest to 30 days ago, or just the first one
            let prevRating = history[0].rating;
            const pastEntry = history.find(h => new Date(h.date) >= thirtyDaysAgo);
            if (pastEntry) {
                prevRating = pastEntry.rating;
            }

            const diff = Number((store.googleRating - prevRating).toFixed(2));
            return { val: Math.abs(diff), dir: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable' };
        }

        return { val: 0, dir: 'stable' };
    };

    return (
        <div className="space-y-12 pb-20">
            {/* --- SECTION 0: Reputation Management Summary --- */}
            <div className="space-y-8">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black italic tracking-tighter uppercase text-foreground">Reputation Management</h1>
                    <p className="text-sm font-bold text-foreground uppercase tracking-widest opacity-70">Monitor Google Reviews and compare store performance across the franchise.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Top Rated Stores Chart */}
                    <Card className="shadow-2xl bg-card border-2 border-border">
                        <CardHeader className="pb-2 border-b border-border">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-foreground">Top Rated Stores</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px] p-6 pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topRatedData} layout="vertical" margin={{ left: 40, right: 30, top: 10, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis type="number" domain={[0, 5]} hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fontWeight: '700', fill: '#e5e7eb' }}
                                        width={90}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--popover))',
                                            borderRadius: '8px',
                                            border: '1px solid hsl(var(--border))',
                                            color: 'hsl(var(--popover-foreground))'
                                        }}
                                        labelStyle={{ color: 'hsl(var(--popover-foreground))', fontWeight: 'bold' }}
                                    />
                                    <Bar dataKey="rating" fill="#facc15" radius={[0, 6, 6, 0]} barSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Most Reviewed Chart */}
                    <Card className="shadow-2xl bg-card border-2 border-border">
                        <CardHeader className="pb-2 border-b border-border">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-foreground">Most Reviewed</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px] p-6 pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={mostReviewedData} layout="vertical" margin={{ left: 40, right: 30, top: 10, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fontWeight: '700', fill: '#e5e7eb' }}
                                        width={90}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--popover))',
                                            borderRadius: '8px',
                                            border: '1px solid hsl(var(--border))',
                                            color: 'hsl(var(--popover-foreground))'
                                        }}
                                        labelStyle={{ color: 'hsl(var(--popover-foreground))', fontWeight: 'bold' }}
                                    />
                                    <Bar dataKey="total" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Performance Table */}
                <Card className="shadow-2xl bg-card border-2 border-border overflow-hidden">
                    <CardHeader className="pb-4 border-b border-border">
                        <CardTitle className="text-sm font-black italic tracking-tight text-foreground">Store Reputation Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/60">
                                <TableRow className="hover:bg-transparent border-b border-border">
                                    <TableHead className="text-[11px] font-black uppercase tracking-widest py-4 text-foreground">Store Name</TableHead>
                                    <TableHead className="text-[11px] font-black uppercase tracking-widest text-center text-foreground">Rating</TableHead>
                                    <TableHead className="text-[11px] font-black uppercase tracking-widest text-center text-foreground">Total Reviews</TableHead>
                                    <TableHead className="text-[11px] font-black uppercase tracking-widest text-center text-foreground">Trend</TableHead>
                                    <TableHead className="text-[11px] font-black uppercase tracking-widest text-right pr-6 text-foreground">Last Updated</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stores.map((s) => {
                                    const trend = getTrend(s);
                                    return (
                                        <TableRow key={s._id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                                            <TableCell className="font-bold text-sm py-4 text-foreground">{s.name}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <span className="font-black italic text-base text-foreground">{s.googleRating.toFixed(1)}</span>
                                                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-bold text-center text-foreground">{s.googleUserRatingsTotal}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    {trend.dir === 'up' && <><TrendingUp className="h-3 w-3 text-green-500" /> <span className="text-[11px] font-black text-green-500">+{trend.val}</span></>}
                                                    {trend.dir === 'down' && <><TrendingDown className="h-3 w-3 text-red-500" /> <span className="text-[11px] font-black text-red-500">-{trend.val}</span></>}
                                                    {trend.dir === 'stable' && <Minus className="h-3 w-3 text-muted-foreground" />}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right text-[11px] font-bold text-foreground pr-6">
                                                {s.lastReviewsUpdate ? new Date(s.lastReviewsUpdate).toLocaleDateString() : "N/A"}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />

            {/* --- SECTION 1: Historical Comparison --- */}
            <Card className="shadow-2xl bg-card border-2 border-border">
                <CardHeader className="border-b border-border pb-4">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        <CardTitle className="text-foreground">Historical Comparison</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        {/* Control Panel */}
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-foreground">Store A</label>
                                    <Select value={compareA.storeId} onValueChange={(v) => setCompareA({ ...compareA, storeId: v })}>
                                        <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {stores.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <div className="flex gap-2">
                                        <Select value={compareA.month.toString()} onValueChange={(v) => setCompareA({ ...compareA, month: parseInt(v) })}>
                                            <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {getMonthsList(compareA.year).map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <Select value={compareA.year.toString()} onValueChange={(v) => setCompareA({ ...compareA, year: parseInt(v) })}>
                                            <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {getYearsList().map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-foreground">Store B</label>
                                    <Select value={compareB.storeId} onValueChange={(v) => setCompareB({ ...compareB, storeId: v })}>
                                        <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {stores.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <div className="flex gap-2">
                                        <Select value={compareB.month.toString()} onValueChange={(v) => setCompareB({ ...compareB, month: parseInt(v) })}>
                                            <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {getMonthsList(compareB.year).map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <Select value={compareB.year.toString()} onValueChange={(v) => setCompareB({ ...compareB, year: parseInt(v) })}>
                                            <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {getYearsList().map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* Mini Metrics Comparison */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 rounded-xl bg-muted/60 border-2 border-border text-center">
                                    <span className="text-[11px] font-bold text-foreground block mb-1">AVG RATING</span>
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-xl font-black text-primary">{statsA?.avgRating || "0.0"}</span>
                                        <div className="w-[2px] h-5 bg-border" />
                                        <span className="text-xl font-black text-blue-500">{statsB?.avgRating || "0.0"}</span>
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-muted/60 border-2 border-border text-center">
                                    <span className="text-[11px] font-bold text-foreground block mb-1">NEW REVIEWS</span>
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-xl font-black text-primary">{statsA?.newReviews || "0"}</span>
                                        <div className="w-[2px] h-5 bg-border" />
                                        <span className="text-xl font-black text-blue-500">{statsB?.newReviews || "0"}</span>
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-muted/60 border-2 border-border text-center">
                                    <span className="text-[11px] font-bold text-foreground block mb-1">COMMENTS</span>
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-xl font-black text-primary">{statsA?.commentsCount || "0"}</span>
                                        <div className="w-[2px] h-5 bg-border" />
                                        <span className="text-xl font-black text-blue-500">{statsB?.commentsCount || "0"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Chart Area */}
                        <div className="h-[300px] w-full bg-muted/40 rounded-2xl p-4 border-2 border-border">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={comparisonChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fontWeight: 'bold', fill: '#e5e7eb' }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: '#e5e7eb' }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--popover))',
                                            borderRadius: '8px',
                                            border: '1px solid hsl(var(--border))',
                                            color: 'hsl(var(--popover-foreground))'
                                        }}
                                        labelStyle={{ color: 'hsl(var(--popover-foreground))', fontWeight: 'bold' }}
                                    />
                                    <Bar dataKey="A" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name={stores.find(s => s._id === compareA.storeId)?.name || 'Store A'} />
                                    <Bar dataKey="B" fill="#3b82f6" radius={[6, 6, 0, 0]} name={stores.find(s => s._id === compareB.storeId)?.name || 'Store B'} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* --- SECTION 2: Monthly Overview by Store --- */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-black italic tracking-tighter text-foreground">Detailed Monthly Analysis</h2>
                        <p className="text-xs font-bold text-foreground uppercase tracking-widest opacity-70">Toggle stores to overlay on the trend graph below</p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-[10px] font-black uppercase h-8"
                        onClick={() => selectedStoreIds.forEach(id => handleFinalize(id))}
                        disabled={!!isFinalizing}
                    >
                        {isFinalizing ? "Processing..." : "Finalize Current Month Data"}
                    </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                    {stores.map(s => (
                        <button
                            key={s._id}
                            onClick={() => toggleStore(s._id)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                                selectedStoreIds.includes(s._id)
                                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105"
                                    : "bg-muted/50 text-foreground border-border hover:border-foreground/30"
                            )}
                        >
                            {s.name}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                    {/* Monthly Progress Graph (Overlay) */}
                    <Card className="lg:col-span-2 shadow-2xl bg-card border-2 border-border">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border">
                            <div>
                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                                    <BarChart3 className="h-4 w-4 text-primary" /> Comparative Monthly Trends ({overviewYear})
                                </CardTitle>
                                <CardDescription className="text-[10px] text-foreground opacity-70">Overlaid performance of selected stores</CardDescription>
                            </div>
                            <Select value={overviewYear.toString()} onValueChange={(v) => {
                                const newYear = parseInt(v);
                                setOverviewYear(newYear);
                                const now = new Date();
                                if (newYear === now.getFullYear() && overviewMonth > (now.getMonth() + 1)) {
                                    setOverviewMonth(now.getMonth() + 1);
                                }
                            }}>
                                <SelectTrigger className="w-[100px] h-8 text-xs font-bold bg-background border-border"><SelectValue /></SelectTrigger>
                                <SelectContent>{getYearsList().map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                            </Select>
                        </CardHeader>
                        <CardContent className="h-[350px] p-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis
                                        dataKey="month"
                                        tickFormatter={(m) => getMonthsList()[m - 1].substring(0, 3)}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fontWeight: 'bold', fill: '#e5e7eb' }}
                                    />
                                    <YAxis
                                        domain={[0, 5]}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: '#e5e7eb' }}
                                    />
                                    <Tooltip
                                        labelFormatter={(m) => getMonthsList()[parseInt(m.toString()) - 1]}
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--popover))',
                                            borderRadius: '8px',
                                            border: '1px solid hsl(var(--border))',
                                            color: 'hsl(var(--popover-foreground))'
                                        }}
                                        labelStyle={{ color: 'hsl(var(--popover-foreground))', fontWeight: 'bold' }}
                                    />
                                    {selectedStoreIds.map((id, idx) => (
                                        <Line
                                            key={id}
                                            type="monotone"
                                            dataKey={stores.find(s => s._id === id)?.name || id}
                                            stroke={idx === 0 ? "hsl(var(--primary))" : idx === 1 ? "#3b82f6" : idx === 2 ? "#10b981" : "#f59e0b"}
                                            strokeWidth={3}
                                            dot={{ r: 5, strokeWidth: 2, fill: 'hsl(var(--card))', stroke: idx === 0 ? "hsl(var(--primary))" : idx === 1 ? "#3b82f6" : idx === 2 ? "#10b981" : "#f59e0b" }}
                                            activeDot={{ r: 7, strokeWidth: 0 }}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Quick Stats Summary for Selected Stores */}
                    <div className="space-y-4">
                        {selectedStoreIds.map(id => {
                            const store = stores.find(s => s._id === id);
                            if (!store) return null;
                            const latestStat = store.monthlyStats?.slice(-1)[0];
                            return (
                                <Card key={id} className="shadow-lg bg-card border-2 border-border">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
                                            <span className="text-[11px] font-black uppercase text-primary tracking-widest">{store.name}</span>
                                            <Select value={overviewMonth.toString()} onValueChange={(v) => setOverviewMonth(parseInt(v))}>
                                                <SelectTrigger className="h-7 w-[110px] text-[10px] bg-background border-border"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {getMonthsList(overviewYear).map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-bold text-foreground uppercase">AVG Rating</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xl font-black italic text-foreground">{latestStat?.avgRating.toFixed(1) || store.googleRating.toFixed(1)}</span>
                                                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-bold text-foreground uppercase">Comments</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xl font-black italic text-foreground">{latestStat?.commentsCount || 0}</span>
                                                    <MessageSquare className="h-4 w-4 text-blue-500" />
                                                </div>
                                            </div>
                                        </div>
                                        {/* Star Dist Minibar */}
                                        <div className="mt-4 flex gap-0.5 h-2.5 w-full rounded-full overflow-hidden bg-muted/60 border-2 border-border">
                                            {[1, 2, 3, 4, 5].map(s => {
                                                const starKey = s as 1 | 2 | 3 | 4 | 5;
                                                const count = (latestStat?.starDistribution?.[starKey] || store.googleStarDistribution?.[starKey] || 0) as number;
                                                const distribution = latestStat?.starDistribution || store.googleStarDistribution || {};
                                                const total = Object.values(distribution).reduce((a, b) => (a as number) + (b as number), 0) as number || 1;
                                                return (
                                                    <div
                                                        key={s}
                                                        className={cn(
                                                            "h-full transition-all",
                                                            s === 5 ? "bg-emerald-500" : s === 4 ? "bg-emerald-400" : s === 3 ? "bg-yellow-400" : s === 2 ? "bg-orange-400" : "bg-red-500"
                                                        )}
                                                        style={{ width: `${(count / total) * 100}%` }}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                        {selectedStoreIds.length === 0 && (
                            <div className="p-8 text-center bg-muted/40 border-2 border-dashed border-border rounded-3xl">
                                <p className="text-xs font-bold uppercase tracking-widest text-foreground">Select stores above to see side-by-side stats</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
