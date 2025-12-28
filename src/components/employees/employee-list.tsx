"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Building2, MapPin, Briefcase, Filter, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

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

    // Local state for search to allow debouncing (or just enter key)
    const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");

    // Sync local search with URL if URL changes externally
    useEffect(() => {
        setSearchTerm(searchParams.get("search") || "");
    }, [searchParams]);

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

    const hasFilters = searchParams.toString().length > 0;

    return (
        <div className="space-y-6">
            {/* Controls Filter Bar */}
            <div className="flex flex-col gap-4 p-4 border rounded-lg bg-card/50">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    {/* Search */}
                    <div className="relative w-full md:w-1/3">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or email..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                // Simple debounce
                                const params = new URLSearchParams(searchParams.toString());
                                if (e.target.value) params.set("search", e.target.value);
                                else params.delete("search");
                                // We need a way to not push every keystroke instantly without debounce util.
                                // For simplicity in this tool: I will just set state, and user must hit enter? 
                                // No, users expect live search. 
                                // I'll use a pragmatic approach: Just pass to handler which won't debounce properly inline.
                                // Let's just use onBlur or Enter for search to save specific debounce impl overhead.
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    applyFilter("search", searchTerm);
                                }
                            }}
                            onBlur={() => applyFilter("search", searchTerm)}
                        />
                    </div>
                    <Link href="/dashboard/employees/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Add Employee
                        </Button>
                    </Link>
                </div>

                <Separator />

                <div className="flex flex-wrap gap-2 items-center">
                    <Filter className="h-4 w-4 text-muted-foreground mr-2" />

                    {/* Store Filter */}
                    <Select
                        value={searchParams.get("storeId") || "all"}
                        onValueChange={(val) => applyFilter("storeId", val)}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by Store" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Stores</SelectItem>
                            {stores.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    {/* Department Filter (Global) */}
                    <Select
                        value={searchParams.get("departmentId") || "all"}
                        onValueChange={(val) => applyFilter("departmentId", val)}
                    >
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filter by Department" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            {departments.map(d => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    {/* Position Filter */}
                    <Select
                        value={searchParams.get("positionId") || "all"}
                        onValueChange={(val) => applyFilter("positionId", val)}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by Position" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Positions</SelectItem>
                            {positions.map(p => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    {/* Sort */}
                    <Select
                        value={searchParams.get("sort") || "newest"}
                        onValueChange={(val) => applyFilter("sort", val)}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Sort By" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                            <SelectItem value="joined-desc">Joined (Recent)</SelectItem>
                            <SelectItem value="joined-asc">Joined (Oldest)</SelectItem>
                            <SelectItem value="contract">Contract Type</SelectItem>
                        </SelectContent>
                    </Select>

                    {hasFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
                            <X className="h-4 w-4 mr-2" /> Clear
                        </Button>
                    )}
                </div>
            </div>

            <div className="rounded-md border bg-card overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 p-4 border-b text-sm font-medium text-muted-foreground bg-muted/40">
                    <div className="col-span-4 pl-2">Employee</div>
                    <div className="col-span-2">Position</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Store</div>
                    <div className="col-span-2">Department</div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-zinc-800">
                    {initialEmployees.map((emp) => (
                        <Link href={`/dashboard/employees/${emp._id}`} key={emp._id} className="grid grid-cols-12 gap-4 p-4 hover:bg-accent/50 transition items-center group">
                            <div className="col-span-4 flex items-center gap-3">
                                <Avatar className="h-10 w-10 border border-zinc-700 transition group-hover:border-primary/50">
                                    <AvatarImage src={emp.image} alt={`${emp.firstName} ${emp.lastName}`} />
                                    <AvatarFallback className="bg-muted text-foreground font-bold">
                                        {emp.firstName?.[0]}{emp.lastName?.[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-foreground font-medium group-hover:text-primary transition-colors">{emp.firstName} {emp.lastName}</p>
                                    <p className="text-xs text-muted-foreground">{emp.email}</p>
                                </div>
                            </div>
                            <div className="col-span-2 text-sm text-foreground">
                                {emp.positionId?.name || "No Position"}
                            </div>
                            <div className="col-span-2">
                                {emp.active ? (
                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-xs hover:bg-emerald-500/20">Active</Badge>
                                ) : (
                                    <Badge className="bg-red-500/10 text-red-500 border-0 text-xs hover:bg-red-500/20">Inactive</Badge>
                                )}
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate" title={emp.storeId?.name}>{emp.storeId?.name || "-"}</span>
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground flex items-center gap-2">
                                <Briefcase className="h-3 w-3" />
                                <span className="truncate" title={emp.storeDepartmentId?.name}>{emp.storeDepartmentId?.name || "-"}</span>
                            </div>
                        </Link>
                    ))}
                    {initialEmployees.length === 0 && (
                        <div className="p-12 text-center flex flex-col items-center justify-center text-muted-foreground">
                            <Search className="h-12 w-12 opacity-20 mb-4" />
                            <p className="text-lg font-medium text-foreground">No employees found</p>
                            <p className="text-sm">Try adjusting your filters or search terms.</p>
                            <Button variant="link" onClick={clearFilters} className="mt-2">Clear all filters</Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="text-xs text-muted-foreground text-center">
                Showing {initialEmployees.length} result{initialEmployees.length !== 1 && 's'}
            </div>
        </div>
    );
}
