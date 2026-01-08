"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Building2, MapPin, Briefcase, Filter, X, KeyRound, ShieldAlert, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { confirmPasswordReset } from "@/lib/actions/employee.actions";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useTranslations, useLocale } from "next-intl";
import { getLocalized } from "@/lib/utils";

interface Employee {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    positionId?: { name: string };
    storeId?: { name: string };
    storeDepartmentId?: { name: string };
    active: boolean;
    image?: string;
    joinedOn?: string;
    contract?: { employmentType?: string };
    passwordResetRequested?: boolean;
    slug: string;
    currentStatus?: string;
    vacationTracker?: {
        defaultDays: number;
        rolloverDays: number;
        usedDays: number;
        year: number;
    };
}

interface FilterOption {
    _id: string;
    name: string;
}

interface PaginationMeta {
    total: number;
    pages: number;
    current: number;
    limit: number;
}

interface EmployeeListProps {
    initialEmployees: Employee[];
    pagination: PaginationMeta;
    stores: FilterOption[];
    departments: FilterOption[];
    positions: FilterOption[];
}

export function EmployeeList({ initialEmployees, pagination, stores, departments, positions }: EmployeeListProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const t = useTranslations("Common");
    const locale = useLocale();

    // Local state for search to allow debouncing (or just enter key)
    const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");

    // Sync local search with URL if URL changes externally
    useEffect(() => {
        setSearchTerm(searchParams.get("search") || "");
    }, [searchParams]);
    // Live search debouncing
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== (searchParams.get("search") || "")) {
                const params = new URLSearchParams(searchParams.toString());
                if (searchTerm) params.set("search", searchTerm);
                else params.delete("search");
                router.push(pathname + "?" + params.toString());
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, pathname, router, searchParams]);
    const createQueryString = useCallback(
        (name: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value && value !== "all") {
                params.set(name, value);
            } else {
                params.delete(name);
            }
            return params.toString();
        },
        [searchParams]
    );

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        // Optional: Debounce here if needed, or just search on enter/blur. 
        // For now, let's update on every change but maybe with a timeout? 
        // Or simpler: User hits enter or we wait 500ms.
        // Let's implement a simple delay.

        const timeoutId = setTimeout(() => {
            router.push(pathname + "?" + createQueryString("search", term));
        }, 500);
        return () => clearTimeout(timeoutId);
    };

    // Better handler for inputs that doesn't need return cleanup effectively here inside the render loop
    // Instead we usually use a separate effect for debounce or just update on blur.
    // Let's just update immediately for now, or on blur for text.
    // Actually, controlled input + onKeyDown Enter is best for search.


    const applyFilter = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value && value !== "all") {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        params.delete("page"); // Reset page when filtering
        router.push(pathname + "?" + params.toString());
    };

    const changePage = (newPage: number) => {
        if (newPage < 1 || newPage > pagination.pages) return;
        router.push(pathname + "?" + createQueryString("page", newPage.toString()));
    };

    const clearFilters = () => {
        router.push(pathname);
        setSearchTerm("");
    };

    const handleConfirmReset = async (e: React.MouseEvent, empId: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm("Are you sure you want to reset this employee's password? A new OTP will be sent to their email.")) {
            return;
        }

        try {
            await confirmPasswordReset(empId);
            toast.success("Password reset confirmed and new OTP sent.");
            router.refresh();
        } catch (error) {
            toast.error("Failed to confirm password reset.");
        }
    };

    const hasFilters = searchParams.toString().length > 0;

    return (
        <div className="space-y-8">
            {/* Controls Filter Bar */}
            <div
                /*                 initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }} */
                className="glass-card p-6 rounded-2xl border-primary/10 flex flex-col gap-6"
            >
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    {/* Search */}
                    <div className="relative w-full md:w-1/3 group">
                        <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder={t("search") + "..."}
                            className="pl-11 h-12 bg-background/50 border-border/40 focus:ring-primary/20 transition-all rounded-xl"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Link href="/dashboard/employees/new">
                        <Button className="h-12 px-6 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all rounded-xl">
                            <Plus className="mr-2 h-5 w-5" /> {t("add")} {t("employees")}
                        </Button>
                    </Link>
                </div>

                <Separator className="bg-border/20" />

                <div className="flex flex-wrap gap-3 items-center">
                    <div className="p-2 rounded-lg bg-primary/5 mr-2">
                        <Filter className="h-4 w-4 text-primary" />
                    </div>

                    <Select value={searchParams.get("storeId") || "all"} onValueChange={(val) => applyFilter("storeId", val)}>
                        <SelectTrigger className="w-[200px] h-10 bg-background/50 border-border/40 rounded-lg">
                            <SelectValue placeholder={t('filterByStore')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('allStores')}</SelectItem>
                            {stores.map(s => <SelectItem key={s._id} value={s._id}>{getLocalized(s, "name", locale)}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={searchParams.get("departmentId") || "all"} onValueChange={(val) => applyFilter("departmentId", val)}>
                        <SelectTrigger className="w-[220px] h-10 bg-background/50 border-border/40 rounded-lg">
                            <SelectValue placeholder={t('filterByDept')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('allDepts')}</SelectItem>
                            {departments.map(d => <SelectItem key={d._id} value={d._id}>{getLocalized(d, "name", locale)}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={searchParams.get("positionId") || "all"} onValueChange={(val) => applyFilter("positionId", val)}>
                        <SelectTrigger className="w-[200px] h-10 bg-background/50 border-border/40 rounded-lg">
                            <SelectValue placeholder={t('filterByPosition')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('allPositions')}</SelectItem>
                            {positions.map(p => <SelectItem key={p._id} value={p._id}>{getLocalized(p, "name", locale)}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    {hasFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto text-muted-foreground hover:text-foreground">
                            <X className="h-4 w-4 mr-2" /> Clear All Filters
                        </Button>
                    )}
                </div>
            </div>

            <Card glass premium className="p-0 overflow-hidden border-border/40">
                <div className="overflow-x-auto">
                    <div className="min-w-full sm:min-w-[1000px]">
                        {/* Header */}
                        <div className="hidden md:grid md:grid-cols-12 md:gap-4 p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 border-b">
                            <div className="col-span-4 pl-4">{t("employees")}</div>
                            <div className="col-span-2">Status</div>
                            <div className="col-span-2">{t("positions")}</div>
                            <div className="col-span-2">{t("stores")}</div>
                            <div className="col-span-2">{t("departments")}</div>
                        </div>

                        {/* Rows */}
                        <div className="divide-y divide-border/20">
                            <AnimatePresence>
                                {initialEmployees.map((emp, index) => (
                                    <div key={emp._id}>
                                        <Link href={`/dashboard/employees/${emp.slug}`} className="block hover:bg-primary/5 transition-colors group relative">


                                            {/* Desktop View (Grid) */}
                                            <div className="hidden md:grid md:grid-cols-12 md:gap-4 md:p-4 md:items-center">
                                                <div className="col-span-4 flex items-center gap-3 pl-2">
                                                    <Avatar className="h-9 w-9 border border-border group-hover:border-primary/50 transition-all">
                                                        <AvatarImage src={emp.image} alt={`${emp.firstName} ${emp.lastName}`} />
                                                        <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                                                            {emp.firstName?.[0]}{emp.lastName?.[0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">{emp.firstName} {emp.lastName}</p>
                                                        <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{emp.email}</p>
                                                    </div>
                                                </div>

                                                <div className="col-span-2 flex flex-wrap gap-1.5">
                                                    {emp.active ? (
                                                        <Badge className="w-fit bg-emerald-500/10 text-emerald-600 border-0 text-[10px] font-bold uppercase tracking-tight">{t('active')}</Badge>
                                                    ) : (
                                                        <Badge className="w-fit bg-red-500/10 text-red-600 border-0 text-[10px] font-bold uppercase tracking-tight">{t('inactive')}</Badge>
                                                    )}
                                                    {emp.currentStatus === 'vacation' && (
                                                        <Badge variant="outline" className="w-fit border-amber-500/30 text-amber-600 bg-amber-500/5 text-[10px] uppercase font-bold tracking-tight">On Vacation</Badge>
                                                    )}
                                                    {emp.currentStatus === 'absence' && (
                                                        <Badge variant="outline" className="w-fit border-red-500/30 text-red-600 bg-red-500/5 text-[10px] uppercase font-bold tracking-tight">Absent</Badge>
                                                    )}
                                                </div>

                                                <div className="col-span-2 text-sm text-foreground/80 truncate">
                                                    {getLocalized(emp.positionId, "name", locale) || "-"}
                                                </div>

                                                <div className="col-span-2 text-sm text-muted-foreground truncate flex items-center gap-1.5">
                                                    <MapPin className="h-3 w-3 opacity-50" />
                                                    {getLocalized(emp.storeId, "name", locale) || "-"}
                                                </div>

                                                <div className="col-span-2 text-sm text-muted-foreground truncate flex items-center gap-1.5">
                                                    <Briefcase className="h-3 w-3 opacity-50" />
                                                    {getLocalized(emp.storeDepartmentId, "name", locale) || "-"}
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                ))}
                            </AnimatePresence>

                            {initialEmployees.length === 0 && (
                                <div className="p-20 text-center flex flex-col items-center justify-center text-muted-foreground bg-accent/5">
                                    <div className="p-6 rounded-full bg-muted/20 mb-6">
                                        <Search className="h-12 w-12 opacity-20" />
                                    </div>
                                    <p className="text-xl font-bold text-foreground">No matching employees</p>
                                    <p className="text-sm mt-1">Try adjusting your filters or searching for another name.</p>
                                    <Button variant="link" onClick={clearFilters} className="mt-4 font-bold text-primary">Clear all filters</Button>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </Card>

            {/* Pagination Controls */}
            {pagination.pages > 1 && (
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.current <= 1}
                            onClick={() => changePage(pagination.current - 1)}
                            className="h-8 w-8 p-0"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="uppercase tracking-widest text-xs font-bold">
                            Page {pagination.current} of {pagination.pages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.current >= pagination.pages}
                            onClick={() => changePage(pagination.current + 1)}
                            className="h-8 w-8 p-0"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground text-center pt-2">
                {pagination.total} result{pagination.total !== 1 && 's'} in registry
            </div>
        </div>
    );
}
