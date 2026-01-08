"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Building2, Users, Briefcase } from "lucide-react";
import { EditGlobalDepartmentDialog } from "@/components/departments/edit-global-department-dialog";
import { EmptyState } from "@/components/ui/empty-state";

interface Department {
    _id: string;
    slug: string;
    name: string;
    description?: string;
    active: boolean;
    storeCount: number;
    employeeCount: number;
}

export function DepartmentList({ initialDepartments }: { initialDepartments: Department[] }) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredDependencies = initialDepartments
        .filter((dept) =>
            dept.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            // Sort active first
            if (a.active === b.active) return 0;
            return a.active ? -1 : 1;
        });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="relative w-full max-w-xl">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search departments..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Link href="/dashboard/departments/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Add Department
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDependencies.map((dept) => (
                    <Link href={`/dashboard/departments/${dept.slug}`} key={dept._id}>
                        <Card className="bg-card border hover:bg-accent/50 transition cursor-pointer">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-semibold text-lg text-foreground">{dept.name}</h3>
                                            {dept.active ? (
                                                <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-xs">Active</Badge>
                                            ) : (
                                                <Badge className="bg-red-500/10 text-red-500 border-0 text-xs">Inactive</Badge>
                                            )}
                                        </div>
                                        <p className="text-muted-foreground text-sm max-w-md truncate">
                                            {dept.description || "No description provided"}
                                        </p>
                                    </div>
                                    {/* Edit button removed as per request */}
                                </div>

                                <div className="mt-6 flex items-center gap-6">
                                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                        <Building2 className="h-4 w-4" />
                                        <span>{dept.storeCount} stores</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                        <Users className="h-4 w-4" />
                                        <span>{dept.employeeCount} employees</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                        <Briefcase className="h-4 w-4" />
                                        <span>Department Head</span>
                                        {/* Placeholder for Head, logic to find global head is complex if not explicit */}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
                {filteredDependencies.length === 0 && (
                    <div className="col-span-full">
                        <EmptyState
                            title={searchTerm ? "No departments found" : "No departments"}
                            description={searchTerm ? "Try adjusting your search terms." : "Get started by creating your first global department."}
                            icon={Building2}
                            actionLabel={!searchTerm ? "Add Department" : undefined}
                            actionHref="/dashboard/departments/new"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
