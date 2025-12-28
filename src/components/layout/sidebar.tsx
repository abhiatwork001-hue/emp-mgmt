"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Store,
    Users,
    ChefHat,
    CalendarDays,
    Briefcase,
    Settings,
    Menu,
    Building2,
    Calendar,
    Palmtree,
    AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

const routes = [
    {
        label: "Home",
        icon: LayoutDashboard,
        href: "/dashboard",
        color: "text-sky-500",
    },
    {
        label: "Stores",
        icon: Store,
        href: "/dashboard/stores",
        color: "text-violet-500",
    },
    {
        label: "Departments",
        icon: Building2,
        href: "/dashboard/departments",
        color: "text-pink-700",
    },
    {
        label: "Recipes",
        icon: ChefHat,
        href: "/dashboard/recipes",
        color: "text-orange-700",
    },
    {
        label: "Schedule",
        icon: Calendar,
        href: "/dashboard/schedule",
        color: "text-amber-500"
    },
    {
        label: "Vacations",
        icon: Palmtree,
        href: "/dashboard/vacations",
        color: "text-emerald-500"
    },
    {
        label: "Absences",
        icon: AlertCircle,
        href: "/dashboard/absences",
        color: "text-red-500"
    },
    {
        label: "Employees",
        icon: Users,
        href: "/dashboard/employees",
        color: "text-green-700",
    },
    {
        label: "Positions",
        icon: Briefcase,
        href: "/dashboard/positions",
        color: "text-blue-700",
    },
    {
        label: "Settings",
        icon: Settings,
        href: "/dashboard/settings",
    },
];

// Role-based access config
const roleAccess: Record<string, string[]> = {
    owner: ["*"], // All access
    hr: ["*"], // All access (typically) except maybe advanced financial settings? Prompt says "almost access to everything but cannot change nothing about company"
    store_manager: ["/dashboard", "/dashboard/stores", "/dashboard/departments", "/dashboard/recipes", "/dashboard/schedule", "/dashboard/vacations", "/dashboard/absences", "/dashboard/employees", "/dashboard/settings"],
    department_head: ["/dashboard", "/dashboard/schedule", "/dashboard/vacations", "/dashboard/absences", "/dashboard/recipes", "/dashboard/employees"], // Can manage schedule for dept
    employee: ["/dashboard", "/dashboard/schedule", "/dashboard/vacations", "/dashboard/absences", "/dashboard/recipes"] // View schedule, request vac/abs, view recipes
};

// Helper check
const hasAccess = (role: string, path: string) => {
    const allowed = roleAccess[role] || roleAccess["employee"]; // fallback
    if (allowed.includes("*")) return true;
    return allowed.some(p => path === p || path.startsWith(p + "/")); // Simple prefix match or exact
};

export function Sidebar({ userRole = "employee" }: { userRole?: string }) { // Accept role prop
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Test Role Logic: Allow owner to simulate
    const testRole = searchParams.get("testRole");
    const effectiveRole = (userRole === "owner" && testRole) ? testRole : userRole;

    // Filter routes
    const filteredRoutes = routes.filter(route => {
        // Special case for Settings?
        // HR cannot change company -> maybe hide company settings? 
        // For now, mapping top-level routes.

        // HR Restriction: "cannot change nothing about company" -> likely restrictions inside Settings or Store creation. 
        // Sidebar usually just shows "Stores" or "Settings". We'll assume HR can see list but maybe not edit.

        return hasAccess(effectiveRole, route.href);
    });

    return (
        <div className="space-y-4 py-4 flex flex-col h-full bg-sidebar text-sidebar-foreground">
            <div className="px-3 py-2 flex-1">
                <Link href="/dashboard" className="flex items-center pl-3 mb-14">
                    <div className="relative w-8 h-8 mr-4">
                        {/* Logo placeholder */}
                        <div className="bg-sidebar-foreground rounded-full w-full h-full flex items-center justify-center text-sidebar font-bold">L</div>
                    </div>
                    <h1 className="text-2xl font-bold">LaGasy</h1>
                </Link>
                <div className="space-y-1">
                    {filteredRoutes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-sidebar-accent-foreground hover:bg-sidebar-accent rounded-lg transition",
                                pathname === route.href ? "text-sidebar-accent-foreground bg-sidebar-accent" : "text-muted-foreground"
                            )}
                        >
                            <div className="flex items-center flex-1">
                                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                                {route.label}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function MobileSidebar() {
    const [open, setOpen] = useState(false);
    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 bg-sidebar">
                <Sidebar />
            </SheetContent>
        </Sheet>
    );
}
