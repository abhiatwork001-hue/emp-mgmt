"use client";

import { useState } from "react";
import { Edit2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RemoveStoreEmployeeButton } from "./remove-store-employee-button";
import { AssignEmployeeDialog } from "./assign-employee-dialog";

interface StoreEmployeesListProps {
    storeId: string;
    employees: any[];
    canManage?: boolean;
}

export function StoreEmployeesList({ storeId, employees, canManage = false }: StoreEmployeesListProps) {
    const [editMode, setEditMode] = useState(false);

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">Employees</h3>
                    <p className="text-sm text-muted-foreground">Staff assigned to this store</p>
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

            {employees.length === 0 ? (
                <p className="text-muted-foreground text-sm">No employees assigned to this store.</p>
            ) : (
                <div className="space-y-3">
                    {employees.map((emp: any) => (
                        <div key={emp._id} className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-foreground font-bold">
                                    {emp.firstName?.[0]}{emp.lastName?.[0]}
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">{emp.firstName} {emp.lastName}</p>
                                    <p className="text-xs text-muted-foreground">{emp.positionId?.name || "No Position"}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{emp.email}</p>
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
