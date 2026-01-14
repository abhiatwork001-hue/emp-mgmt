"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from "recharts";
import { Building2, Globe2, AlertCircle, CheckCircle2, UserCheck, UserMinus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AbsenceAnalyticsProps {
    data: {
        metrics: {
            totalApproved: number;
            totalPending: number;
            totalAway: number;
            totalActive: number;
        };
        trends: { name: string; approved: number; requested: number }[];
        breakdowns: {
            hierarchical: any[];
            byGlobalDept: any[];
        };
    };
    storeId?: string;
}

export function AbsenceAnalytics({ data, storeId }: AbsenceAnalyticsProps) {
    const { metrics, trends, breakdowns } = data;

    // Determine if we are scoped to a single store
    const isStoreScoped = breakdowns.hierarchical.length === 1;
    const comparisonData = isStoreScoped
        ? breakdowns.hierarchical[0].departments.map((d: any) => ({
            name: d.name,
            approved: d.approved,
            pending: d.pending
        })).sort((a: any, b: any) => b.approved - a.approved)
        : breakdowns.hierarchical.map((s: any) => ({
            name: s.name,
            approved: s.approved,
            pending: s.pending
        })).sort((a: any, b: any) => b.approved - a.approved);

    const comparisonTitle = isStoreScoped ? "Department Performance" : "Unit Performance";
    const comparisonSub = isStoreScoped ? "Comparing Departments within Store" : "Top Stores: Approved vs Pending";

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KPICard
                    title="Approved Absences"
                    value={metrics.totalApproved}
                    subtext="Total confirmed this year"
                    icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                />
                <KPICard
                    title="Pending Reports"
                    value={metrics.totalPending}
                    subtext="Awaiting manager review"
                    icon={<AlertCircle className="h-4 w-4 text-amber-500" />}
                />
                <KPICard
                    title="Active Staff"
                    value={metrics.totalActive}
                    subtext="Currently working"
                    icon={<UserCheck className="h-4 w-4 text-blue-500" />}
                />
                <KPICard
                    title="Away Today"
                    value={metrics.totalAway}
                    subtext="Currently off work"
                    icon={<UserMinus className="h-4 w-4 text-rose-500" />}
                />
            </div>

            {/* Trends & Distribution Row */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Absence Trends</CardTitle>
                        <CardDescription>Requested vs Approved absences per month</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trends} barGap={0}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: '#fff' }}
                                />
                                <Legend verticalAlign="top" height={36} />
                                <Bar dataKey="approved" name="Approved" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="requested" name="Requested" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{comparisonTitle}</CardTitle>
                        <CardDescription>{comparisonSub}</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={comparisonData.slice(0, 8)} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                                <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis dataKey="name" type="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={100} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: '#fff' }}
                                />
                                <Legend verticalAlign="top" height={36} />
                                <Bar dataKey="approved" name="Approved" fill="#10b981" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Global Dept Distribution</CardTitle>
                        <CardDescription>Comparison: Approved vs Active Staff</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={breakdowns.byGlobalDept.slice(0, 8)}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: '#fff' }}
                                />
                                <Legend verticalAlign="top" height={36} />
                                <Bar dataKey="approved" name="Approved Absences" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="active" name="Total Staff" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Distribution Share</CardTitle>
                        <CardDescription>Absences by Global Role</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={breakdowns.byGlobalDept.slice(0, 6)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="approved"
                                >
                                    {breakdowns.byGlobalDept.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: '#fff' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6">
                {/* Hierarchical Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>Units Breakdown</CardTitle>
                        <CardDescription>Absence stats and current availability per Unit</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="hierarchical">
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

function KPICard({ title, value, subtext, icon }: any) {
    return (
        <Card className="overflow-hidden border-none shadow-md bg-card/50 hover:bg-card transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-[10px] text-muted-foreground mt-1 font-medium">{subtext}</p>
            </CardContent>
        </Card>
    );
}

function HierarchicalBreakdown({ data }: { data: any[] }) {
    return (
        <div className="space-y-4">
            {data.map((store: any) => (
                <div key={store.name} className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-full">
                                <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <div className="font-bold text-sm">{store.name}</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1 font-medium">
                                    <span className="flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5" /> {store.active} Active</span>
                                    <span className="opacity-40">|</span>
                                    <span className="flex items-center gap-1.5"><UserMinus className="h-3.5 w-3.5" /> {store.away} Away</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4 items-center">
                            <div className="text-right">
                                <div className="text-xs font-bold text-emerald-600">{store.approved}</div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-tight">Appr.</div>
                            </div>
                            <div className="h-8 w-[1px] bg-border/50" />
                            <div className="text-right">
                                <div className="text-xs font-bold text-amber-600">{store.pending}</div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-tight">Pend.</div>
                            </div>
                        </div>
                    </div>
                    <div className="pl-6 space-y-1">
                        {store.departments.map((dept: any) => (
                            <div key={dept.name} className="flex items-center justify-between p-2 hover:bg-muted/20 rounded-md transition-colors text-xs border-l-2 border-border/20 ml-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{dept.name}</span>
                                    <div className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                                        <UserCheck className="h-3 w-3" /> {dept.active}
                                    </div>
                                    {dept.away > 0 && <Badge variant="outline" className="h-4 text-[10px] bg-rose-50 text-rose-600 border-rose-200 font-bold">{dept.away} Away</Badge>}
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-emerald-600 font-bold w-6 text-right">{dept.approved}</span>
                                    <span className="text-amber-600 font-bold w-6 text-right">{dept.pending}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function BreakdownTable({ data }: { data: any[] }) {
    return (
        <div className="space-y-2">
            {data.map((item: any) => (
                <div key={item.name} className="flex items-center justify-between p-3 hover:bg-muted/30 rounded-lg transition-colors border border-transparent hover:border-border/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-full">
                            <Globe2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                            <div className="font-bold text-sm">{item.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 font-medium flex items-center gap-1">
                                <UserCheck className="h-3 w-3" /> {item.active} Active staff
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-6">
                        <div className="text-center min-w-[50px]">
                            <div className="text-xs font-bold text-emerald-600">{item.approved}</div>
                            <div className="text-[9px] text-muted-foreground uppercase">Appr.</div>
                        </div>
                        <div className="text-center min-w-[50px]">
                            <div className="text-xs font-bold text-amber-600">{item.pending}</div>
                            <div className="text-[9px] text-muted-foreground uppercase">Pend.</div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'];
