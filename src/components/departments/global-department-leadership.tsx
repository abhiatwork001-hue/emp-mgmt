"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserCog, Trash2, Edit } from "lucide-react";
import { AssignGlobalDepartmentHeadDialog } from "@/components/departments/assign-global-department-head-dialog";
import { RemoveGlobalDepartmentHeadButton } from "@/components/departments/remove-global-department-head-button";

interface GlobalDepartmentLeadershipProps {
    departmentId: string;
    departmentName: string;
    departmentHeads: any[];
    subHeads: any[];
    canManage?: boolean;
}

export function GlobalDepartmentLeadership({
    departmentId,
    departmentName,
    departmentHeads,
    subHeads,
    canManage = false,
}: GlobalDepartmentLeadershipProps) {
    const [isEditing, setIsEditing] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">Manage department heads and employees for this department</p>
                {canManage && (
                    <Button
                        variant={isEditing ? "secondary" : "outline"}
                        size="sm"
                        className=""
                        onClick={() => setIsEditing(!isEditing)}
                    >
                        {isEditing ? (
                            "Done Editing"
                        ) : (
                            <>
                                <UserCog className="mr-2 h-4 w-4" /> Manage Leadership
                            </>
                        )}
                    </Button>
                )}
            </div>

            {/* Department Head */}
            <div className="flex items-start justify-between border-b border-zinc-700/50 pb-6">
                <div className="space-y-1 w-full">
                    <p className="font-medium text-foreground">Department Head</p>
                    {departmentHeads && departmentHeads.length > 0 ? (
                        <div className="space-y-2 mt-2">
                            {departmentHeads.map((head: any) => (
                                <div key={head._id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 border">
                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground text-xs font-bold overflow-hidden">
                                        {head.image ? (
                                            <img src={head.image} alt={head.firstName} className="h-full w-full object-cover" />
                                        ) : (
                                            <span>{head.firstName?.[0]}{head.lastName?.[0]}</span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-foreground">{head.firstName} {head.lastName}</p>
                                        <p className="text-xs text-muted-foreground">{head.email}</p>
                                    </div>
                                    {isEditing && (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                            <RemoveGlobalDepartmentHeadButton departmentId={departmentId} employeeId={head._id} type="head" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground mt-2 italic">No department head assigned</p>
                    )}
                </div>
                {isEditing && (
                    <div className="ml-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <AssignGlobalDepartmentHeadDialog departmentId={departmentId} departmentName={departmentName} type="head" />
                    </div>
                )}
            </div>

            {/* Sub Head */}
            <div className="flex items-start justify-between border-b border-zinc-700/50 pb-6">
                <div className="space-y-1 w-full">
                    <p className="font-medium text-foreground">Sub Head</p>
                    {subHeads && subHeads.length > 0 ? (
                        <div className="space-y-2 mt-2">
                            {subHeads.map((subHead: any) => (
                                <div key={subHead._id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 border">
                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground text-xs font-bold overflow-hidden">
                                        {subHead.image ? (
                                            <img src={subHead.image} alt={subHead.firstName} className="h-full w-full object-cover" />
                                        ) : (
                                            <span>{subHead.firstName?.[0]}{subHead.lastName?.[0]}</span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-foreground">{subHead.firstName} {subHead.lastName}</p>
                                        <p className="text-xs text-muted-foreground">{subHead.email}</p>
                                    </div>
                                    {isEditing && (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                            <RemoveGlobalDepartmentHeadButton departmentId={departmentId} employeeId={subHead._id} type="subHead" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground mt-2 italic">No sub head assigned</p>
                    )}
                </div>
                {isEditing && (
                    <div className="ml-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <AssignGlobalDepartmentHeadDialog departmentId={departmentId} departmentName={departmentName} type="subHead" />
                    </div>
                )}
            </div>
        </div>
    );
}
