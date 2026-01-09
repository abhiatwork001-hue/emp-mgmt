"use client";

import { useState } from "react";
import { Edit2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { EmployeeLink } from "@/components/common/employee-link";
import { RemoveStoreEmployeeButton } from "@/components/stores/remove-store-employee-button";
import { AssignEmployeeDialog } from "@/components/stores/assign-employee-dialog";

interface StoreEmployeesListProps {
    storeId: string | any;
    employees: any[];
    canManage: boolean;
    departments: any[];
    currentUserRoles: string[];
}

const isWorkingNow = (details: string | undefined) => {
    if (!details || !details.includes(' - ')) return false;
    const [start, end] = details.split(' - ');
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    const startTime = startH * 60 + startM;
    let endTime = endH * 60 + endM;

    // Handle overnight shifts (end time < start time)
    if (endTime < startTime) endTime += 24 * 60;

    return currentTime >= startTime && currentTime <= endTime;
};

export function StoreEmployeesList({
    storeId,
    employees,
    canManage,
    departments,
    currentUserRoles
}: StoreEmployeesListProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [activeFilter, setActiveFilter] = useState("all");
    const [editMode, setEditMode] = useState(false);

    // Ensure storeId is a string for child components
    const storeIdStr = storeId.toString();

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = (
            emp.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const matchesDepartment = departmentFilter === "all" ||
            emp.departmentId === departmentFilter ||
            (emp.departments && emp.departments.some((d: any) => d._id === departmentFilter || d === departmentFilter));

        let matchesStatus = true;
        if (statusFilter === "working_now") {
            matchesStatus = emp.todayStatus === "working" && isWorkingNow(emp.statusDetails);
        } else if (statusFilter !== "all") {
            matchesStatus = emp.todayStatus === statusFilter;
        }

        const matchesActive = activeFilter === "all" ||
            (activeFilter === "active" ? (emp.isActive !== false) : (emp.isActive === false));

        return matchesSearch && matchesDepartment && matchesStatus && matchesActive;
    });

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 items-center gap-2">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search employees..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Department" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Depts</SelectItem>
                            {departments.map((dept: any) => (
                                <SelectItem key={dept._id} value={dept._id}>
                                    {dept.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="working">Working Today</SelectItem>
                            <SelectItem value="working_now">Working Now</SelectItem>
                            <SelectItem value="day_off">Day Off</SelectItem>
                            <SelectItem value="leave">On Leave</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={activeFilter} onValueChange={setActiveFilter}>
                        <SelectTrigger className="w-[110px]">
                            <SelectValue placeholder="Active" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                    {canManage && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditMode(!editMode)}
                                className={editMode ? "bg-accent" : ""}
                            >
                                <Edit2 className="h-4 w-4 mr-2" />
                                {editMode ? "Done" : "Manage"}
                            </Button>
                            <AssignEmployeeDialog storeId={storeIdStr} />
                        </>
                    )}
                </div>
            </div>

            {/* List */}
            {filteredEmployees.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg bg-muted/20">
                    No employees found matching filter.
                </div>
            ) : (
                <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-3">
                        {filteredEmployees.map((emp: any) => (
                            <div key={emp._id} className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-foreground font-bold overflow-hidden border">
                                        {emp.image ? (
                                            <img src={emp.image} alt={emp.firstName} className="h-full w-full object-cover" />
                                        ) : (
                                            <span>{emp.firstName?.[0]}{emp.lastName?.[0]}</span>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <EmployeeLink
                                                employeeId={emp._id}
                                                slug={emp.slug}
                                                name={`${emp.firstName} ${emp.lastName}`}
                                                currentUserRoles={currentUserRoles}
                                                className="font-medium text-foreground hover:underline"
                                            />
                                            {emp.isStoreManager && <Badge variant="secondary" className="text-[10px]">Manager</Badge>}
                                        </div>
                                        <p className="text-xs text-muted-foreground">{emp.positionId?.name || emp.position || "No Position"}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{emp.email}</p>

                                        {/* Status Badge */}
                                        <div className="mt-1 flex gap-2">
                                            {emp.todayStatus === "working" && (
                                                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                                    Working {emp.statusDetails ? `(${emp.statusDetails})` : ""}
                                                </Badge>
                                            )}
                                            {emp.todayStatus === "leave" && (
                                                <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                                                    {emp.statusDetails || "On Leave"}
                                                </Badge>
                                            )}
                                            {emp.todayStatus === "day_off" && (
                                                <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-600 border-gray-200">
                                                    Day Off
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {editMode && (
                                    <RemoveStoreEmployeeButton
                                        storeId={storeIdStr}
                                        employeeId={emp._id}
                                        employeeName={`${emp.firstName} ${emp.lastName}`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            )}
        </div>
    );
}
