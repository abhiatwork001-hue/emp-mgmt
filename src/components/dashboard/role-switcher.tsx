"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { useTranslations } from "next-intl";

export function RoleSwitcher({ currentUserRole }: { currentUserRole: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentTestRole = searchParams.get("testRole") || currentUserRole;
    const t = useTranslations("RoleSwitcher");
    const tCommon = useTranslations("Common");

    // Only 'owner' or 'admin' (mapped to owner) should see this generally, but we'll control visibility at usage site.

    // List of roles to test
    const roles = [
        { value: "super_user", label: tCommon('roleTypes.super_user') },
        { value: "owner", label: tCommon('roleTypes.owner') },
        { value: "admin", label: tCommon('roleTypes.admin') },
        { value: "hr", label: tCommon('roleTypes.hr') },
        { value: "store_manager", label: tCommon('roleTypes.store_manager') },
        { value: "department_head", label: tCommon('roleTypes.department_head') },
        { value: "store_department_head", label: tCommon('roleTypes.store_department_head') },
        { value: "employee", label: tCommon('roleTypes.employee') }
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
        <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded-lg">
            <Users className="h-4 w-4 text-primary" />
            <Label className="text-primary text-xs font-semibold whitespace-nowrap">{t('testView')}</Label>
            <Select value={currentTestRole} onValueChange={handleRoleChange}>
                <SelectTrigger className="h-8 w-[180px] bg-background border-border text-xs text-foreground">
                    <SelectValue placeholder={t('selectRole')} />
                </SelectTrigger>
                <SelectContent>
                    {roles.map(role => (
                        <SelectItem key={role.value} value={role.value} className="text-xs">
                            {role.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Badge variant="outline" className="ml-auto text-xs text-primary border-primary/50">
                {t('testingMode')}
            </Badge>
        </div>
    );
}
