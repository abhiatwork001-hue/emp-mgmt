"use client";

import { useState } from "react";
import { Edit2, UserPlus, Briefcase, CalendarOff, Palmtree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RemoveStoreEmployeeButton } from "./remove-store-employee-button";
import { AssignEmployeeDialog } from "./assign-employee-dialog";

interface StoreEmployeesListProps {
    storeId: string;
    employees: any[];
    canManage?: boolean;
    departments?: any[];
}

export function StoreEmployeesList({ storeId, employees, canManage = false, departments = [] }: StoreEmployeesListProps) {
    const [editMode, setEditMode] = useState(false);
    const [statusFilter, setStatusFilter] = useState("all");
    const [deptFilter, setDeptFilter] = useState("all");

    // Filter Logic
    const filteredEmployees = employees.filter(emp => {
        const matchesStatus = statusFilter === "all" || (statusFilter === "working" && emp.todayStatus === "working") || (statusFilter === "leave" && emp.todayStatus === "leave") || (statusFilter === "day_off" && emp.todayStatus === "day_off");
        const matchesDept = deptFilter === "all" || (emp.storeDepartmentId?._id === deptFilter || emp.storeDepartmentId === deptFilter);
        return matchesStatus && matchesDept;
    });

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">Employees</h3>
                    <p className="text-sm text-muted-foreground">{filteredEmployees.length} active staff</p>
                </div>
                {canManage && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant={editMode ? "default" : "outline"}
                            size="sm"
                            onClick={() => setEditMode(!editMode)}
                        >
                            <Edit2 className="h-4 w-4 mr-2" />
                            {editMode ? "Done" : "Edit Employees"}
                        </Button>
                        <AssignEmployeeDialog storeId={storeId} />
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <Tabs defaultValue="all" value={statusFilter} onValueChange={setStatusFilter} className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="working">
                            <Briefcase className="w-3 h-3 mr-1 md:mr-2" />
                            <span className="hidden md:inline">Working</span>
                        </TabsTrigger>
                        <TabsTrigger value="leave">
                            <Palmtree className="w-3 h-3 mr-1 md:mr-2" />
                            <span className="hidden md:inline">Leave</span>
                        </TabsTrigger>
                        <TabsTrigger value="day_off">
                            <CalendarOff className="w-3 h-3 mr-1 md:mr-2" />
                            <span className="hidden md:inline">Day Off</span>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {departments.length > 0 && (
                    <Select value={deptFilter} onValueChange={setDeptFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Department" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            {departments.map((dept: any) => (
                                <SelectItem key={dept._id} value={dept._id}>{dept.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {filteredEmployees.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg bg-muted/20">
                    No employees found matching filter.
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredEmployees.map((emp: any) => (
                        <div key={emp._id} className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-foreground font-bold">
                                    {emp.firstName?.[0]}{emp.lastName?.[0]}
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">{emp.firstName} {emp.lastName}</p>
                                    <p className="text-xs text-muted-foreground">{emp.positionId?.name || "No Position"}</p>
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
                                    storeId={storeId}
                                    employeeId={emp._id}
                                    employeeName={`${emp.firstName} ${emp.lastName}`}
                                />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
