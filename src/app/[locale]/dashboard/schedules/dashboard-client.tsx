"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format, startOfWeek, addWeeks, subWeeks } from "date-fns";
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Filter,
    Layers,
    Loader2,
    Store as StoreIcon,
    AlertCircle,
    CheckCircle2,
    Clock,
    Users
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getDashboardData } from "@/lib/actions/schedule.actions";
import { getOrCreateSchedule } from "@/lib/actions/schedule.actions";
import { cn } from "@/lib/utils";

export default function ScheduleDashboardClient({ restrictedStoreId }: { restrictedStoreId?: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState<Date>(new Date());
    const [data, setData] = useState<any>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [storeFilter, setStoreFilter] = useState<string>(restrictedStoreId || "all");
    const [navigatingId, setNavigatingId] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const dashboardData = await getDashboardData(date, restrictedStoreId);
            setData(dashboardData);
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [date]);

    const handleDepartmentClick = async (storeId: string, departmentId: string) => {
        setNavigatingId(departmentId);
        try {
            const schedule = await getOrCreateSchedule(storeId, departmentId, date);
            if (schedule && (schedule.slug || schedule._id)) {
                router.push(`/dashboard/schedules/${schedule.slug || schedule._id}`);
            }
        } catch (error) {
            console.error("Navigation failed", error);
        } finally {
            setNavigatingId(null);
        }
    };

    const handlePrevWeek = () => setDate(subWeeks(date, 1));
    const handleNextWeek = () => setDate(addWeeks(date, 1));
    const handleResetWeek = () => setDate(new Date());

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'approved': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            case 'draft': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    const formatStatus = (status: string) => {
        if (status === 'pending') return 'Pending Approval';
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    // Filter Logic
    const filteredStores = data?.stores?.map((store: any) => {
        // Filter departments based on status
        const filteredDepts = store.departments.filter((dept: any) => {
            if (statusFilter === 'all') return true;
            if (statusFilter === 'missing') return !dept.schedule;

            const currentStatus = dept.schedule?.status;
            if (statusFilter === 'approved') return currentStatus === 'approved' || currentStatus === 'published';
            if (statusFilter === 'pending') return currentStatus === 'pending' || currentStatus === 'review';

            return currentStatus === statusFilter;
        });

        // If store filter is active, check store ID
        if (storeFilter !== 'all' && store._id !== storeFilter) return null;

        // If no departments match filters, hide store (unless it's empty and we aren't filtering strict)
        // Actually, let's hide store if no departments match the status filter
        if (filteredDepts.length === 0) return null;

        return { ...store, departments: filteredDepts };
    }).filter(Boolean) || [];


    const { summary } = data || { summary: { total: 0, inProgress: 0, pending: 0, approved: 0, notStarted: 0, totalDepartments: 0 } };
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });

    if (loading && !data) {
        return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    // Ensure hooks are consistent by not adding any hooks after this point (which is true)
    // But to be absolutely safe, let's wrap the content in a fragment.

    return (
        <div className="space-y-6">
            {/* Top Controls */}

            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-card p-4 rounded-lg border shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <div className="w-full sm:w-[200px]">
                        <span className="text-xs font-semibold text-muted-foreground mb-1 block uppercase">Status</span>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="draft">In Progress</SelectItem>
                                <SelectItem value="pending">Pending Approval</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="published">Published</SelectItem>
                                <SelectItem value="missing">Not Started</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {!restrictedStoreId && (
                        <div className="w-full sm:w-[200px]">
                            <span className="text-xs font-semibold text-muted-foreground mb-1 block uppercase">Store</span>
                            <Select value={storeFilter} onValueChange={setStoreFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Stores" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Stores</SelectItem>
                                    {data?.stores?.map((s: any) => (
                                        <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                    <Button variant="outline" size="icon" onClick={handlePrevWeek}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex flex-col items-center">
                        <span className="font-medium text-sm">Week of {format(weekStart, "MMMM d, yyyy")}</span>
                        <Button variant="link" className="h-auto p-0 text-[10px] text-muted-foreground" onClick={handleResetWeek}>
                            Current Week
                        </Button>
                    </div>
                    <Button variant="outline" size="icon" onClick={handleNextWeek}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start">
                            <div className="p-2 bg-primary/10 rounded-full">
                                <Clock className="h-4 w-4 text-primary" />
                            </div>
                            {loading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                        </div>
                        <div className="mt-2">
                            <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                            <h3 className="text-2xl font-bold text-foreground">{summary.inProgress}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-amber-500/10 border-amber-500/20">
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start">
                            <div className="p-2 bg-amber-500/20 rounded-full">
                                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            {loading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                        </div>
                        <div className="mt-2">
                            <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
                            <h3 className="text-2xl font-bold text-foreground">{summary.pending}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-500/10 border-emerald-500/20">
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start">
                            <div className="p-2 bg-emerald-500/20 rounded-full">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            {loading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                        </div>
                        <div className="mt-2">
                            <p className="text-sm font-medium text-muted-foreground">Approved</p>
                            <h3 className="text-2xl font-bold text-foreground">{summary.approved}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-500/10 border-gray-500/20">
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start">
                            <div className="p-2 bg-gray-500/20 rounded-full">
                                <Filter className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            </div>
                            {loading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                        </div>
                        <div className="mt-2">
                            <p className="text-sm font-medium text-muted-foreground">Not Started</p>
                            <h3 className="text-2xl font-bold text-foreground">{summary.notStarted} <span className="text-xs font-normal text-muted-foreground">/ {summary.totalDepartments}</span></h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* List Content */}
            {filteredStores.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                        <Filter className="h-12 w-12 mb-4 opacity-20" />
                        <p>No schedules match filter for this week.</p>
                        <Button variant="link" onClick={() => { setStatusFilter('all'); setStoreFilter('all') }}>Clear Filters</Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {filteredStores.map((store: any) => (
                        <div key={store._id} className="space-y-3">
                            <h3 className="text-lg font-semibold flex items-center gap-2 px-1">
                                <StoreIcon className="h-5 w-5 text-muted-foreground" />
                                {store.name}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {store.departments.map((dept: any) => (
                                    <Card
                                        key={dept._id}
                                        className="hover:shadow-md transition-shadow cursor-pointer group border-l-4"
                                        style={{ borderLeftColor: dept.schedule ? 'transparent' : 'transparent' }} // Could assign color by status
                                        onClick={() => handleDepartmentClick(store._id, dept._id)}
                                    >
                                        <CardContent className="p-5">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h4 className="font-semibold text-base group-hover:text-primary transition-colors">{dept.name}</h4>
                                                    <p className="text-xs text-muted-foreground">{store.name}</p>
                                                </div>
                                                {dept.schedule ? (
                                                    <Badge className={cn("capitalize shadow-none font-normal", getStatusColor(dept.schedule.status))}>
                                                        {formatStatus(dept.schedule.status)}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-muted-foreground font-normal bg-muted/50">
                                                        Not Started
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="flex items-end justify-between mt-6">
                                                <div className="flex gap-4">
                                                    <div>
                                                        <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-0.5">Employees</p>
                                                        <p className="text-lg font-semibold leading-none">{dept.schedule?.employeeCount || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-0.5">Total Hours</p>
                                                        <p className="text-lg font-semibold leading-none">{dept.schedule?.totalHours || '-'}</p>
                                                    </div>
                                                </div>

                                                {navigatingId === dept._id ? (
                                                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                                ) : (
                                                    <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                                                        <ChevronRight className="h-4 w-4" />
                                                    </div>
                                                )}
                                            </div>

                                            {dept.schedule?.updatedAt && (
                                                <div className="mt-4 pt-4 border-t text-[10px] text-muted-foreground flex justify-between">
                                                    <span>Updated {new Date(dept.schedule.updatedAt).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
