"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { useTranslations } from "next-intl";
import { ArrowUpRight, ArrowDownRight, Users, Briefcase, Building2, Globe2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AnalyticsData {
    metrics: {
        totalOwed: number;
        totalTaken: number;
        totalLiability: number;
        totalPending: number;
        totalOnVacation: number;
        totalActive: number;
    };
    trends: { name: string; approved: number; requested: number }[];
    breakdowns: {
        hierarchical: {
            name: string;
            taken: number;
            liability: number;
            active: number;
            vacation: number;
            departments: { name: string; taken: number; liability: number; active: number; vacation: number }[];
        }[];
        byGlobalDept: { name: string; taken: number; liability: number; active: number; vacation: number }[];
    };
}

export function VacationAnalytics({ data }: { data: AnalyticsData }) {
    const t = useTranslations("Vacation.analytics"); // Assuming keys, or I'll use hardcoded for now + generic keys
    const tc = useTranslations("Common");

    const { metrics, trends, breakdowns } = data;

    // Chart Colors
    const BAR_COLOR = "#10b981"; // Emerald-500

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <KPICard
                    title="Total Liability"
                    value={`${metrics.totalLiability.toFixed(0)} Days`}
                    subtext="Unused days (Allocation - Taken)"
                    icon={<ArrowDownRight className="h-4 w-4 text-red-500" />}
                />
                <KPICard
                    title="Total Taken"
                    value={`${metrics.totalTaken.toFixed(0)} Days`}
                    subtext="Days consumed this year"
                    icon={<ArrowUpRight className="h-4 w-4 text-emerald-500" />}
                />
                <KPICard
                    title="Pending Requests"
                    value={`${metrics.totalPending.toFixed(0)} Days`}
                    subtext="Awaiting manager approval"
                    icon={<Users className="h-4 w-4 text-amber-500" />}
                />
                <KPICard
                    title="Active Staff"
                    value={`${metrics.totalActive || 0}`}
                    subtext="Employees currently working"
                    icon={<Building2 className="h-4 w-4 text-blue-500" />}
                />
                <KPICard
                    title="On Vacation"
                    value={`${metrics.totalOnVacation || 0}`}
                    subtext="Employees away on leave"
                    icon={<Globe2 className="h-4 w-4 text-purple-500" />}
                />
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Global Departments</CardTitle>
                        <CardDescription>Vacation days taken by global role</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={breakdowns.byGlobalDept}
                                    dataKey="taken"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    fill="#8884d8"
                                    label={(entry) => (entry?.name && entry.name.length > 10) ? `${entry.name.substring(0, 10)}...` : (entry?.name || "")}
                                >
                                    {breakdowns.byGlobalDept.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: '#fff' }}
                                    formatter={(value: any) => `${Number(value || 0).toFixed(0)} Days`}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Unit Performance</CardTitle>
                        <CardDescription>Top Stores: Taken vs Liability</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={breakdowns.hierarchical.slice(0, 8)} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: '#fff' }}
                                />
                                <Legend />
                                <Bar dataKey="taken" name="Taken" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                                <Bar dataKey="liability" name="Liability" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-7">
                {/* Trends Chart */}
                <Card className="md:col-span-4 lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Monthly Trends</CardTitle>
                        <CardDescription>Vacation days taken per month</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={trends} barGap={0}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}`}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                        labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: '#fff' }}
                                    />
                                    <Legend verticalAlign="top" height={36} />
                                    <Bar dataKey="approved" name="Approved" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="requested" name="Requested" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Hierarchical Breakdowns */}
                <Card className="md:col-span-3 lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Units Breakdown</CardTitle>
                        <CardDescription>Usage, Liability & Availability per Unit</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="hierarchical" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="hierarchical"><Building2 className="h-3 w-3 mr-2" />Stores & Depts</TabsTrigger>
                                <TabsTrigger value="global"><Globe2 className="h-3 w-3 mr-2" />Global Roles</TabsTrigger>
                            </TabsList>

                            <TabsContent value="hierarchical" className="mt-4 space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                <HierarchicalBreakdown data={breakdowns.hierarchical} />
                            </TabsContent>
                            <TabsContent value="global" className="mt-4 space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                <BreakdownTable data={breakdowns.byGlobalDept} />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function KPICard({ title, value, subtext, icon }: { title: string, value: string, subtext: string, icon: any }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{subtext}</p>
            </CardContent>
        </Card>
    );
}

function HierarchicalBreakdown({ data }: { data: any[] }) {
    if (data.length === 0) return <div className="text-center text-muted-foreground text-sm py-8">No data available</div>;

    return (
        <div className="space-y-6">
            {data.map((store, i) => (
                <div key={i} className="space-y-2 border-b border-border/40 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-blue-500" />
                            <span className="font-bold text-base">{store.name}</span>
                        </div>
                        <div className="flex gap-4 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            <span>{store.active} Active</span>
                            <span>{store.vacation} Away</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-emerald-50 dark:bg-emerald-950/20 p-2 rounded-md">
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold">Total Taken</div>
                            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{store.taken.toFixed(0)}</div>
                        </div>
                        <div className="bg-red-50 dark:bg-red-950/20 p-2 rounded-md">
                            <div className="text-[10px] text-red-600 dark:text-red-400 uppercase font-bold">Total Owed</div>
                            <div className="text-lg font-bold text-red-700 dark:text-red-300">{store.liability.toFixed(0)}</div>
                        </div>
                    </div>

                    <div className="pl-4 space-y-1 border-l-2 border-muted">
                        {store.departments.map((dept: any, di: number) => (
                            <div key={di} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-sm hover:bg-muted/30 group">
                                <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 group-hover:bg-blue-400 Transition-colors" />
                                    <span className="font-medium text-muted-foreground group-hover:text-foreground">{dept.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-2 text-xs text-muted-foreground mr-2">
                                        <Badge variant="outline" className="h-5 px-1.5 text-[12px] font-bold bg-background">A: {dept.active}</Badge>
                                        <Badge variant="outline" className="h-5 px-1.5 text-[12px] font-bold bg-background">V: {dept.vacation}</Badge>
                                    </div>
                                    <div className="flex gap-3 min-w-[80px] justify-end font-mono">
                                        <span className="text-emerald-600">{dept.taken.toFixed(0)}</span>
                                        <span className="text-red-500">{dept.liability.toFixed(0)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function BreakdownTable({ data }: { data: { name: string; taken: number; liability: number, active: number, vacation: number }[] }) {
    if (data.length === 0) return <div className="text-center text-muted-foreground text-sm py-8">No data available</div>;

    return (
        <div className="space-y-2">
            {data.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm p-3 rounded-md border border-border/50 hover:bg-muted/50 transition-colors">
                    <div className="space-y-1">
                        <div className="font-semibold">{item.name}</div>
                        <div className="flex gap-2 text-xs text-muted-foreground uppercase tracking-tight">
                            <span>{item.active} Active</span>
                            <span>•</span>
                            <span>{item.vacation} On Leave</span>
                        </div>
                    </div>
                    <div className="flex gap-4 text-xs font-mono">
                        <div className="flex flex-col items-end">
                            <span className="text-emerald-600 font-bold">{item.taken.toFixed(0)}</span>
                            <span className="text-[9px] text-muted-foreground uppercase">Taken</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-red-500 font-bold">{item.liability.toFixed(0)}</span>
                            <span className="text-[9px] text-muted-foreground uppercase">Owed</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
