"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface EmployeeLinkProps {
    employeeId: string;
    slug: string;
    name: string;
    currentUserRoles: string[];
    className?: string;
}

export function EmployeeLink({ employeeId, slug, name, currentUserRoles, className }: EmployeeLinkProps) {
    const isPrivileged = currentUserRoles.some(role =>
        ['admin', 'hr', 'owner', 'tech', 'super_user'].includes(role.toLowerCase().replace(/ /g, '_'))
    );

    if (!isPrivileged || !slug) {
        return <span className={className}>{name}</span>;
    }

    return (
        <Link
            href={`/dashboard/employees/${slug}`}
            className={cn(
                "font-semibold text-primary hover:underline transition-all decoration-primary/30 underline-offset-4",
                className
            )}
        >
            {name}
        </Link>
    );
}
