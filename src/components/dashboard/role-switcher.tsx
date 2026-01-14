"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { useTranslations } from "next-intl";

export function RoleSwitcher({ currentUserRole, allRoles = [] }: { currentUserRole: string, allRoles?: string[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentTestRole = searchParams.get("testRole") || currentUserRole;
    const t = useTranslations("RoleSwitcher");
    const tCommon = useTranslations("Common");

    // List of roles to test, filtered by user's actual roles
    const availableRoles = [
        { value: "super_user", label: tCommon('roleTypes.super_user') },
        { value: "owner", label: tCommon('roleTypes.owner') },
        { value: "admin", label: tCommon('roleTypes.admin') },
        { value: "hr", label: tCommon('roleTypes.hr') },
        { value: "tech", label: tCommon('roleTypes.tech') },
        { value: "department_head", label: tCommon('roleTypes.department_head') },
        { value: "store_manager", label: tCommon('roleTypes.store_manager') },
        { value: "store_department_head", label: tCommon('roleTypes.store_department_head') },
        { value: "employee", label: tCommon('roleTypes.employee') }
    ].filter(r => allRoles.includes(r.value));

    const handleRoleChange = (role: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (role === currentUserRole) {
            params.delete("testRole");
        } else {
            params.set("testRole", role);
        }
        router.push(`?${params.toString()}`);
        router.refresh();
    };

    if (availableRoles.length <= 1) return null;

    return (
        <div className="flex items-center gap-2 p-1.5 px-3 bg-muted/40 border border-border/50 rounded-2xl backdrop-blur-sm">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('viewAs') || "View As"}</Label>
            <Select value={currentTestRole} onValueChange={handleRoleChange}>
                <SelectTrigger className="h-7 w-[160px] bg-background border-border/50 text-[10px] font-bold uppercase tracking-wider text-foreground rounded-xl shadow-none focus:ring-0">
                    <SelectValue placeholder={t('selectRole')} />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50">
                    {availableRoles.map(role => (
                        <SelectItem key={role.value} value={role.value} className="text-[10px] font-bold uppercase tracking-wider">
                            {role.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
