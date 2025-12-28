"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Building2, MapPin, Briefcase, Filter, X, KeyRound, ShieldAlert } from "lucide-react";
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
}

interface FilterOption {
    _id: string;
    name: string;
}

interface EmployeeListProps {
    initialEmployees: Employee[];
    stores: FilterOption[];
    departments: FilterOption[];
    positions: FilterOption[];
}

export function EmployeeList({ initialEmployees, stores, departments, positions }: EmployeeListProps) {
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
        router.push(pathname + "?" + createQueryString(key, value));
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
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
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
            </motion.div>

            <Card glass premium className="p-0 overflow-hidden border-border/40">
                {/* Header */}
                <div className="hidden md:grid md:grid-cols-12 md:gap-4 p-5 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 border-b">
                    <div className="col-span-4 pl-4">{t("employees")}</div>
                    <div className="col-span-2">{t("positions")}</div>
                    <div className="col-span-2">Status & Actions</div>
                    <div className="col-span-2">{t("stores")}</div>
                    <div className="col-span-2">{t("departments")}</div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-border/20">
                    <AnimatePresence>
                        {initialEmployees.map((emp, index) => (
                            <motion.div
                                key={emp._id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Link href={`/dashboard/employees/${emp._id}`} className="block hover:bg-primary/5 transition-all group border-b last:border-0 md:border-0 relative">
                                    {/* Link overlay to handle full card click while buttons still work */}
                                    <div className="flex flex-col gap-3 p-6 md:hidden">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <Avatar className="h-12 w-12 border-2 border-border group-hover:border-primary/50 transition-all shadow-sm">
                                                    <AvatarImage src={emp.image} alt={`${emp.firstName} ${emp.lastName}`} />
                                                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                        {emp.firstName?.[0]}{emp.lastName?.[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-foreground font-bold group-hover:text-primary transition-colors">{emp.firstName} {emp.lastName}</p>
                                                    <p className="text-xs text-muted-foreground">{emp.email}</p>
                                                </div>
                                            </div>
                                            {emp.active ? (
                                                <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px] font-bold uppercase tracking-tighter">{t('active')}</Badge>
                                            ) : (
                                                <Badge className="bg-red-500/10 text-red-600 border-0 text-[10px] font-bold uppercase tracking-tighter">{t('inactive')}</Badge>
                                            )}
                                        </div>

                                        {emp.passwordResetRequested && (
                                            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-2 rounded-lg flex items-center justify-between mt-1">
                                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-500 flex items-center gap-1 uppercase">
                                                    <ShieldAlert className="h-3.5 w-3.5" /> Identity Reset
                                                </span>
                                                <Button size="sm" className="h-7 px-3 bg-amber-600 text-white border-0" onClick={(e) => handleConfirmReset(e, emp._id)}>Confirm</Button>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4 text-sm mt-2 p-3 bg-muted/20 rounded-xl border border-border/40">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{t("positions")}</span>
                                                <span className="font-semibold text-foreground/90">{getLocalized(emp.positionId, "name", locale) || "No Position"}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{t("stores")}</span>
                                                <div className="flex items-center gap-1.5 text-foreground/80">
                                                    <MapPin className="h-3 w-3 text-primary/60" />
                                                    <span className="truncate font-semibold">{getLocalized(emp.storeId, "name", locale) || "-"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Desktop View (Grid) */}
                                    <div className="hidden md:grid md:grid-cols-12 md:gap-4 md:p-5 md:items-center">
                                        <div className="col-span-4 flex items-center gap-4 pl-2">
                                            <div className="relative">
                                                <Avatar className="h-12 w-12 border-2 border-border group-hover:border-primary/50 transition-all shadow-md">
                                                    <AvatarImage src={emp.image} alt={`${emp.firstName} ${emp.lastName}`} />
                                                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                        {emp.firstName?.[0]}{emp.lastName?.[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {emp.active && (
                                                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-background rounded-full" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-foreground font-bold text-base group-hover:text-primary transition-colors">{emp.firstName} {emp.lastName}</p>
                                                <p className="text-xs text-muted-foreground font-medium">{emp.email}</p>
                                            </div>
                                        </div>
                                        <div className="col-span-2 text-sm font-semibold text-foreground/90">
                                            {getLocalized(emp.positionId, "name", locale) || "No Position"}
                                        </div>
                                        <div className="col-span-2">
                                            <div className="flex flex-col gap-2">
                                                {emp.active ? (
                                                    <Badge className="w-fit bg-emerald-500/10 text-emerald-600 border-0 text-[10px] font-bold uppercase hover:bg-emerald-500/20">{t('active')}</Badge>
                                                ) : (
                                                    <Badge className="w-fit bg-red-500/10 text-red-600 border-0 text-[10px] font-bold uppercase hover:bg-red-500/20">{t('inactive')}</Badge>
                                                )}
                                                {emp.passwordResetRequested && (
                                                    <motion.div
                                                        initial={{ scale: 0.9, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        className="flex flex-col gap-1.5"
                                                    >
                                                        <Badge variant="outline" className="w-fit text-[9px] border-amber-500/50 text-amber-700 bg-amber-50 gap-1 animate-pulse uppercase font-extrabold">
                                                            <ShieldAlert className="h-3 w-3" /> Reset Req
                                                        </Badge>
                                                        <Button
                                                            size="sm"
                                                            className="h-7 px-3 text-[9px] gap-1 bg-amber-600 hover:bg-amber-700 text-white border-0 shadow-lg shadow-amber-200 dark:shadow-none font-bold uppercase tracking-tight"
                                                            onClick={(e) => handleConfirmReset(e, emp._id)}
                                                        >
                                                            <KeyRound className="h-3 w-3" /> Confirm Reset
                                                        </Button>
                                                    </motion.div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="col-span-2 text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-muted/50">
                                                <MapPin className="h-3.5 w-3.5 text-primary/60" />
                                            </div>
                                            <span className="truncate max-w-[120px]" title={getLocalized(emp.storeId, "name", locale)}>
                                                {getLocalized(emp.storeId, "name", locale) || "-"}
                                            </span>
                                        </div>
                                        <div className="col-span-2 text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-muted/50">
                                                <Briefcase className="h-3.5 w-3.5 text-primary/60" />
                                            </div>
                                            <span className="truncate max-w-[120px]" title={getLocalized(emp.storeDepartmentId, "name", locale)}>
                                                {getLocalized(emp.storeDepartmentId, "name", locale) || "-"}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
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
            </Card>

            <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground text-center pt-4">
                {initialEmployees.length} result{initialEmployees.length !== 1 && 's'} in registry
            </div>
        </div>
    );
}
