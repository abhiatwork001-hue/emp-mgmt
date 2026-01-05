"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddDepartmentDialog } from "@/components/stores/add-department-dialog";
import { EditStoreDepartmentDialog } from "@/components/stores/edit-store-department-dialog";

interface StoreDepartmentsListClientProps {
    storeDepartments: any[];
    storeSlug: string;
    storeId: string;
}

export function StoreDepartmentsListClient({ storeDepartments, storeSlug, storeId }: StoreDepartmentsListClientProps) {
    const [isEditing, setIsEditing] = useState(false);

    return (
        <Card className="bg-[#1e293b] border-none text-white">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg">Departments</CardTitle>
                    <p className="text-sm text-zinc-400">Departments operating in this store</p>
                </div>
                <div className="flex gap-2">
                    {/* AddDepartmentDialog needs ID for backend */}
                    <AddDepartmentDialog storeId={storeId} />
                    <Button
                        variant={isEditing ? "secondary" : "outline"}
                        size="sm"
                        className="border-zinc-700 hover:bg-zinc-800"
                        onClick={() => setIsEditing(!isEditing)}
                    >
                        {isEditing ? "Done Editing" : "Edit Departments"}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {storeDepartments.length === 0 ? (
                    <p className="text-zinc-500 text-sm">No departments assigned to this store.</p>
                ) : (
                    <div className="space-y-4">
                        {storeDepartments.map((dept: any) => (
                            <div key={dept._id} className="flex items-center justify-between rounded-lg border border-zinc-700/50 p-4 hover:bg-zinc-800 transition group">
                                <Link
                                    href={`/dashboard/stores/${storeSlug}/departments/${dept.slug}`}
                                    className="flex-1"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center">
                                            <Building2 className="h-5 w-5 text-zinc-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-white group-hover:text-zinc-200">{dept.name}</p>
                                            <p className="text-sm text-zinc-500">{dept.globalDepartmentId?.description || "No description available"}</p>
                                        </div>
                                    </div>
                                    <div className="mt-2 ml-14 flex items-center gap-2">
                                        {/* Display Department Head(s) if available */}
                                        {dept.headOfDepartment && dept.headOfDepartment.length > 0 ? (
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs font-bold bg-zinc-800 px-1 rounded text-zinc-400">HD</span>
                                                <div className="flex -space-x-2">
                                                    {dept.headOfDepartment.map((head: any) => (
                                                        <div key={`${dept._id}-head-${head._id}`} className="h-5 w-5 rounded-full bg-zinc-700 border border-zinc-900 flex items-center justify-center overflow-hidden" title={`${head.firstName} ${head.lastName}`}>
                                                            {head.image ? (
                                                                <img src={head.image} alt={head.firstName} className="h-full w-full object-cover" />
                                                            ) : (
                                                                <span className="text-[8px] font-bold text-zinc-300">{head.firstName?.[0]}{head.lastName?.[0]}</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 opacity-50">
                                                <span className="text-xs font-bold bg-zinc-800 px-1 rounded text-zinc-400">HD</span>
                                                <span className="text-sm text-zinc-500">Unassigned</span>
                                            </div>
                                        )}
                                    </div>
                                </Link>

                                {isEditing && (
                                    <div className="ml-4 flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <EditStoreDepartmentDialog department={dept} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
