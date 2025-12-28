"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Edit, Check } from "lucide-react";
import { RemoveFromPositionButton } from "./remove-from-position-button";

interface PositionEmployeesListProps {
    employees: any[];
}

export function PositionEmployeesList({ employees }: PositionEmployeesListProps) {
    const [isEditing, setIsEditing] = useState(false);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Employees ({employees.length})
                </CardTitle>
                {employees.length > 0 && (
                    <Button
                        variant={isEditing ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setIsEditing(!isEditing)}
                    >
                        {isEditing ? (
                            <>
                                <Check className="mr-2 h-4 w-4" /> Done
                            </>
                        ) : (
                            <>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </>
                        )}
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {employees.length > 0 ? (
                    <div className="space-y-4">
                        {employees.map((emp: any) => (
                            <div key={emp._id} className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/30">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                        {emp.firstName?.[0]}{emp.lastName?.[0]}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                                        <p className="text-xs text-muted-foreground">{emp.email}</p>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground mr-2">
                                        {emp.storeId?.name || "No Store"}
                                    </span>
                                    {isEditing && (
                                        <div className="animate-in fade-in zoom-in duration-200">
                                            <RemoveFromPositionButton employeeId={emp._id} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-sm py-4">
                        No employees currently hold this position.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
