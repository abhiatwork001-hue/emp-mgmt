"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Building2,
    Search,
    ChevronLeft,
    ChevronRight,
    Filter
} from "lucide-react";

interface Employee {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    image?: string;
    storeId?: {
        _id: string;
        name: string;
    };
    positionId?: {
        name: string;
    };
    active: boolean;
}

interface GlobalDepartmentEmployeeListProps {
    employees: Employee[];
}

export function GlobalDepartmentEmployeeList({ employees = [] }: GlobalDepartmentEmployeeListProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [storeFilter, setStoreFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("active"); // default active
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Extract unique stores for filter
    const uniqueStores = useMemo(() => {
        const stores = new Map();
        employees.forEach(emp => {
            if (emp.storeId) {
                stores.set(emp.storeId._id, emp.storeId.name);
            }
        });
        return Array.from(stores.entries()).map(([id, name]) => ({ id, name }));
    }, [employees]);

    // Filter Logic
    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const matchesSearch =
                emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.email.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStore = storeFilter === "all" || (emp.storeId?._id === storeFilter);

            const matchesStatus = statusFilter === "all"
                ? true
                : statusFilter === "active" ? emp.active
                    : !emp.active;

            return matchesSearch && matchesStore && matchesStatus;
        });
    }, [employees, searchTerm, storeFilter, statusFilter]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
    const paginatedEmployees = filteredEmployees.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search employees..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <Select value={storeFilter} onValueChange={(v) => { setStoreFilter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="All Stores" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Stores</SelectItem>
                            {uniqueStores.map(store => (
                                <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Showing {filteredEmployees.length} employees
                </p>
            </div>

            <div className="space-y-3">
                {paginatedEmployees.length > 0 ? (
                    paginatedEmployees.map((emp) => (
                        <div key={emp._id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border hover:border-sidebar-ring transition">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold overflow-hidden border border-border">
                                    {emp.image ? (
                                        <img src={emp.image} alt={emp.firstName} className="h-full w-full object-cover" />
                                    ) : (
                                        <span>{emp.firstName?.[0]}{emp.lastName?.[0]}</span>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-foreground">{emp.firstName} {emp.lastName}</p>
                                        {!emp.active && <Badge variant="secondary" className="text-[10px] h-4 px-1">Inactive</Badge>}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{emp.email}</p>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                                <Badge variant="outline" className="border-border text-muted-foreground">
                                    {emp.positionId?.name || "No Position"}
                                </Badge>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Building2 className="h-3 w-3" />
                                    <span>{emp.storeId?.name || "Unknown Store"}</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                        No employees found matching your filters.
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
                        {currentPage} / {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
