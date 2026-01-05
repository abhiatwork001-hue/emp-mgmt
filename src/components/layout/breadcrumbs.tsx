"use client";

import { usePathname } from "next/navigation";
import { Link } from "@/i18n/routing";
import { ChevronRight, Home } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { hasAccess } from "@/lib/rbac";

export function Breadcrumbs({
    userRoles = ["employee"],
    departmentName = ""
}: {
    userRoles?: string[],
    departmentName?: string
}) {
    const pathname = usePathname();
    const t = useTranslations("Common");

    // Split pathname and filter out empty strings and the locale/dashboard prefix
    // Pathname looks like /[locale]/dashboard/...
    const segments = pathname.split("/").filter(s => s && s !== "en" && s !== "fr"); // Basic locale filter, though usually we want to skip the first two

    // Better logic: handle any locale
    const parts = pathname.split("/").filter(Boolean);
    const dashboardIndex = parts.indexOf("dashboard");
    const breadcrumbParts = parts.slice(dashboardIndex); // ["dashboard", "employees", "ID"]

    return (
        <nav className="flex items-center space-x-2 text-sm font-medium text-muted-foreground/80">
            <Link
                href="/dashboard"
                className="hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-accent/50"
            >
                <Home className="h-4 w-4" />
            </Link>

            {breadcrumbParts.slice(1).map((part, index) => {
                const isLast = index === breadcrumbParts.length - 2;
                // Important: reconstruct the path correctly for access check
                // Path segments in breadcrumbParts start from "dashboard"
                // but usually the full app path includes the locale: /[locale]/dashboard/...
                // The rbac paths start with /dashboard/...
                const pathToCheck = `/${breadcrumbParts.slice(0, index + 2).join("/")}`;
                const href = pathToCheck; // i18n Link handles the locale prefix automatically if used via "@/i18n/routing"

                const canAccess = hasAccess(userRoles, pathToCheck, departmentName);

                // ID Detection (24 chars hex)
                const isId = part.length === 24 && /^[0-9a-fA-F]+$/.test(part);

                let label = part.charAt(0).toUpperCase() + part.slice(1);

                if (isId) {
                    label = "Details";
                } else {
                    // Skip translation for slugs (e.g. chick-city-1-781) or if it contains digits
                    const isSlug = /[0-9]/.test(part) || part.includes("-");

                    if (!isSlug) {
                        try {
                            const translated = t(part.toLowerCase());
                            if (translated && translated !== part.toLowerCase()) {
                                label = translated;
                            }
                        } catch (e) {
                            // Ignore translation errors
                        }
                    }
                }

                return (
                    <div key={href} className="flex items-center space-x-2">
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                        {canAccess && !isLast ? (
                            <Link
                                href={href}
                                className="hover:text-foreground transition-all px-2.5 py-1.5 rounded-lg whitespace-nowrap hover:bg-accent/50"
                            >
                                {label}
                            </Link>
                        ) : (
                            <span
                                className={cn(
                                    "px-2.5 py-1.5 rounded-lg whitespace-nowrap",
                                    isLast ? "text-foreground font-bold tracking-tight" : "text-muted-foreground/40 cursor-default"
                                )}
                            >
                                {label}
                            </span>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}
