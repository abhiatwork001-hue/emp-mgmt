"use client";

import { Link, usePathname } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { hasAccess } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Store,
    Users,
    ChefHat,
    Briefcase,
    Settings,
    Menu,
    Building2,
    Calendar,
    Palmtree,
    AlertCircle,
    StickyNote,
    Coins,
    User,
    ListTodo,
    Megaphone,
    Inbox,
    MessageSquare,
    ChevronLeft,
    ChevronRight,
    ShieldAlert,
    AlertTriangle,
    Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";

import { SidebarMessageBadge } from "./sidebar-message-badge";

// Role-based access logic has been moved to src/lib/rbac.ts


const routeGroups = [
    { title: "Operations", routes: ["Home", "Schedule", "Approvals"] },
    { title: "People", routes: ["Employees", "Positions", "Vacations", "Absences", "Tips"] },
    { title: "Structure", routes: ["Stores", "Departments", "Recipes", "Credentials"] },
    { title: "Communication", routes: ["Messages", "Notices", "Tasks", "Notes", "Problems"] },
    { title: "Account", routes: ["Profile", "Activities", "Settings"] },
];

const routes = [
    { label: "Home", icon: LayoutDashboard, href: "/dashboard", color: "text-sky-500" },
    { label: "Notices", icon: Megaphone, href: "/dashboard/notices", color: "text-orange-500" },
    { label: "Approvals", icon: Inbox, href: "/dashboard/approvals", color: "text-red-500" },
    { label: "Messages", icon: MessageSquare, href: "/dashboard/messages", color: "text-blue-500" },
    { label: "Tasks", icon: ListTodo, href: "/dashboard/tasks", color: "text-purple-500" },
    { label: "Notes", icon: StickyNote, href: "/dashboard/notes", color: "text-yellow-400" },
    { label: "Problems", icon: AlertTriangle, href: "/dashboard/problems", color: "text-red-600" },
    { label: "Stores", icon: Store, href: "/dashboard/stores", color: "text-violet-500" },
    { label: "Departments", icon: Building2, href: "/dashboard/departments", color: "text-pink-700" },
    { label: "Recipes", icon: ChefHat, href: "/dashboard/recipes", color: "text-orange-700" },
    { label: "Schedule", icon: Calendar, href: "/dashboard/schedules", color: "text-amber-500" },
    { label: "Vacations", icon: Palmtree, href: "/dashboard/vacations", color: "text-emerald-500" },
    { label: "Absences", icon: AlertCircle, href: "/dashboard/absences", color: "text-red-500" },
    { label: "Employees", icon: Users, href: "/dashboard/employees", color: "text-green-700" },
    { label: "Positions", icon: Briefcase, href: "/dashboard/positions", color: "text-blue-700" },
    { label: "Tips", icon: Coins, href: "/dashboard/tips", color: "text-yellow-600" },
    { label: "Profile", icon: User, href: "/dashboard/profile", color: "text-indigo-500" },
    { label: "Activities", icon: ShieldAlert, href: "/dashboard/activity-log", color: "text-red-700" },
    { label: "Credentials", icon: Lock, href: "/dashboard/credentials", color: "text-slate-500" }, // Global Store Credentials
    { label: "Settings", icon: Settings, href: "/dashboard/settings" },
];

export function Sidebar({
    userRoles = ["employee"],
    departmentName = "",
    storeSlug = "",
    isMobile: propsIsMobile = false,
    onNavItemClick
}: {
    userRoles?: string[],
    departmentName?: string,
    storeSlug?: string,
    isMobile?: boolean,
    onNavItemClick?: () => void
}) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const t = useTranslations("Common");
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<string[]>(routeGroups.map(g => g.title));

    const toggleGroup = (title: string) => {
        setExpandedGroups(prev => prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]);
    };

    const testRole = searchParams.get("testRole");
    const effectiveRoles = (userRoles.includes("owner") && testRole) ? [testRole] : userRoles;

    const permissions = (session?.user as any)?.permissions || [];

    const groupedRoutes = routeGroups.map(group => {
        const filtered = group.routes.map(label => {
            const route = routes.find(r => r.label === label);
            if (!route) return null;

            if (route.label === "Stores") {
                // Special handling for Stores:
                // 1. Check if user has full access (Admin, Owner, etc.)
                // User Request: Store Manager & Store Dept Head should ONLY see context link.
                const isContextOnlyRole = effectiveRoles.some(r => ["store_manager", "store_department_head", "employee"].includes(r));

                if (!isContextOnlyRole && hasAccess(effectiveRoles, "/dashboard/stores", departmentName, permissions)) {
                    return route;
                }

                // 2. If no full access (or restricted role), check if they have a specific store context
                if (storeSlug) {
                    return { ...route, label: "Store", href: `/dashboard/stores/${storeSlug}` };
                }
                return null;
            }

            // Rely on central RBAC for everything else (Activities, Tips, Departments, etc.)
            return hasAccess(effectiveRoles, route.href, departmentName, permissions) ? route : null;
        }).filter(Boolean);
        return { ...group, routes: filtered as any[] };
    }).filter(group => group.routes.length > 0);


    return (
        <div className={cn(
            "space-y-4 py-6 flex flex-col h-full glass-sidebar transition-all duration-300 relative shrink-0",
            isCollapsed ? "w-[80px] min-w-[80px] basis-[80px]" : "w-72 min-w-[18rem] basis-72",
            propsIsMobile && "w-full min-w-0 basis-auto bg-transparent border-none glass-sidebar-none"
        )}>
            {!propsIsMobile && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -right-3 top-10 h-6 w-6 rounded-full border bg-background shadow-md hidden md:flex z-50 hover:bg-muted"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
                </Button>
            )}

            <div className="px-6 py-2 flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
                <Link href="/dashboard" className={cn("flex items-center mb-10 transition-all group/logo", isCollapsed ? "justify-center px-0" : "px-2")}>
                    <div className="relative w-10 h-10 shrink-0">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 group-hover/logo:bg-primary/30 transition-all duration-500" />
                        <div className="relative bg-gradient-to-br from-primary to-violet-600 rounded-2xl w-full h-full flex items-center justify-center text-primary-foreground font-black italic shadow-2xl shadow-primary/40 transform group-hover/logo:scale-110 group-hover/logo:-rotate-6 transition-all duration-500">
                            C
                        </div>
                    </div>
                    {!isCollapsed && (
                        <div className="ml-4 flex flex-col justify-center">
                            <h1 className="text-xl font-black text-foreground leading-tight tracking-[-0.05em]">CHICKINHO<span className="text-primary italic">.</span></h1>
                            <p className="text-[9px] font-bold text-muted-foreground/50 tracking-[0.2em] -mt-0.5">ECOSYSTEM</p>
                        </div>
                    )}
                </Link>

                <div className="space-y-8">
                    {groupedRoutes.map((group, groupIdx) => (
                        <motion.div
                            key={group.title}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * groupIdx, duration: 0.4 }}
                            className="space-y-2"
                        >
                            {!isCollapsed && (
                                <button
                                    onClick={() => toggleGroup(group.title)}
                                    className="flex items-center justify-between w-full px-3 mb-3 text-[10px] font-black tracking-[0.15em] text-muted-foreground/40 uppercase hover:text-primary transition-all group/title"
                                >
                                    <span>{group.title}</span>
                                    <div className="h-[1px] flex-1 bg-border/20 mx-3 group-hover/title:bg-primary/20 transition-all" />
                                </button>
                            )}
                            <AnimatePresence initial={false}>
                                {(expandedGroups.includes(group.title) || isCollapsed) && (
                                    <motion.div
                                        initial={isCollapsed ? false : { height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                                        className="overflow-hidden space-y-1.5"
                                    >
                                        {group.routes.map((route) => (
                                            <Link
                                                key={route.href}
                                                href={route.href}
                                                onClick={() => onNavItemClick?.()}
                                                className={cn(
                                                    "text-sm group flex p-3 w-full font-medium cursor-pointer rounded-xl transition-all duration-200 relative",
                                                    pathname === route.href ? "text-primary bg-primary/5 shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent/40",
                                                    isCollapsed ? "justify-center" : "justify-start"
                                                )}
                                                title={isCollapsed ? (route.label === "Store" ? "Store" : t(route.label.toLowerCase())) : undefined}
                                            >
                                                <div className={cn("flex items-center", isCollapsed ? "justify-center" : "flex-1")}>
                                                    {route.label === "Profile" ? (
                                                        <Avatar className="h-5 w-5 shrink-0">
                                                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">{session?.user?.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                                                        </Avatar>
                                                    ) : (
                                                        <route.icon className={cn("h-5 w-5 shrink-0 transition-all group-hover:scale-110", pathname === route.href ? route.color : "text-muted-foreground/70")} />
                                                    )}
                                                    {!isCollapsed && <span className="ml-3 truncate">{route.label === "Store" ? "Store" : t(route.label.toLowerCase())}</span>}
                                                    {route.label === "Messages" && (
                                                        <SidebarMessageBadge userId={(session?.user as any)?.id} collapsed={isCollapsed} />
                                                    )}
                                                </div>
                                                {pathname === route.href && !isCollapsed && <motion.div layoutId="active-pill" className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" />}
                                            </Link>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function MobileSidebar({
    userRoles = ["employee"],
    departmentName = "",
    storeSlug = ""
}: {
    userRoles?: string[],
    departmentName?: string,
    storeSlug?: string
}) {
    const [open, setOpen] = useState(false);
    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden"><Menu /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-sidebar border-r border-sidebar-border">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <Sidebar userRoles={userRoles} departmentName={departmentName} storeSlug={storeSlug} isMobile={true} onNavItemClick={() => setOpen(false)} />
            </SheetContent>
        </Sheet>
    );
}
