"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

export function RoleSwitcher({ currentUserRole }: { currentUserRole: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentTestRole = searchParams.get("testRole") || currentUserRole;

    // Only 'owner' or 'admin' (mapped to owner) should see this generally, but we'll control visibility at usage site.

    // List of roles to test
    const roles = [
        { value: "owner", label: "Owner (Super Admin)" },
        { value: "hr", label: "HR Manager" },
        { value: "store_manager", label: "Store Manager" },
        { value: "department_head", label: "Department Head" },
        { value: "employee", label: "Employee" }
    ];

    const handleRoleChange = (role: string) => {
        // We'll use a query param 'testRole' to override the view
        const params = new URLSearchParams(searchParams.toString());
        if (role === currentUserRole) {
            params.delete("testRole");
        } else {
            params.set("testRole", role);
        }
        router.push(`?${params.toString()}`);
        router.refresh();
    };

    return (
        <div className="flex items-center gap-2 mb-4 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <Users className="h-4 w-4 text-yellow-500" />
            <Label className="text-yellow-500 text-xs font-semibold whitespace-nowrap">Test View:</Label>
            <Select value={currentTestRole} onValueChange={handleRoleChange}>
                <SelectTrigger className="h-8 w-[180px] bg-slate-900 border-zinc-700 text-xs">
                    <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                    {roles.map(role => (
                        <SelectItem key={role.value} value={role.value} className="text-xs">
                            {role.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Badge variant="outline" className="ml-auto text-xs text-yellow-500 border-yellow-500/50">
                Testing Mode
            </Badge>
        </div>
    );
}
