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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";

// Role-based access logic has been moved to src/lib/rbac.ts


const routeGroups = [
    { title: "Overview", routes: ["Home", "Notices", "Messages", "Tasks", "Notes"] },
    { title: "Operations", routes: ["Stores", "Departments", "Recipes", "Schedule", "Tips"] },
    { title: "Team Management", routes: ["Employees", "Positions", "Vacations", "Absences"] },
    { title: "Account", routes: ["Profile", "Approvals", "Settings"] },
];

const routes = [
    { label: "Home", icon: LayoutDashboard, href: "/dashboard", color: "text-sky-500" },
    { label: "Notices", icon: Megaphone, href: "/dashboard/notices", color: "text-orange-500" },
    { label: "Approvals", icon: Inbox, href: "/dashboard/approvals", color: "text-red-500" },
    { label: "Messages", icon: MessageSquare, href: "/dashboard/messages", color: "text-blue-500" },
    { label: "Tasks", icon: ListTodo, href: "/dashboard/tasks", color: "text-purple-500" },
    { label: "Notes", icon: StickyNote, href: "/dashboard/notes", color: "text-yellow-400" },
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
    { label: "Settings", icon: Settings, href: "/dashboard/settings" },
];

export function Sidebar({
    userRole = "employee",
    departmentName = "",
    storeId = "",
    isMobile: propsIsMobile = false
}: {
    userRole?: string,
    departmentName?: string,
    storeId?: string,
    isMobile?: boolean
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
    const effectiveRole = (userRole === "owner" && testRole) ? testRole : userRole;

    const permissions = (session?.user as any)?.permissions || [];

    const groupedRoutes = routeGroups.map(group => {
        const filtered = group.routes.map(label => {
            const route = routes.find(r => r.label === label);
            if (!route) return null;
            if (route.label === "Stores") {
                if (["owner", "admin", "super_user", "hr", "tech"].includes(effectiveRole)) return route;
                // Functional check for store management
                if (permissions.includes("manage_store")) return route;
                if (storeId) return { ...route, label: "Store", href: `/dashboard/stores/${storeId}` };
                return null;
            }
            if (route.label === "Tips") return effectiveRole === "store_manager" ? route : null;
            return hasAccess(effectiveRole, route.href, departmentName, permissions) ? route : null;
        }).filter(Boolean);
        return { ...group, routes: filtered as any[] };
    }).filter(group => group.routes.length > 0);


    // Wait, the previous tool call replaced lines 71-73.
    // It replaced:
    // departmentName?: string,
    // storeId?: string
    // }) {
    // WITH
    // departmentName?: string,
    // storeId?: string,
    // isMobile?: boolean
    // }) {

    // But the destructuring at the top of function `Sidebar({ ... })` also needs to be updated? 
    // Line 65: `export function Sidebar({`
    // Line 66: `    userRole = "employee",`
    // ...
    // Line 69: `}: {`

    // I DID NOT update the destructuring part yet, only the type definition part?
    // Let's check the file content again or just assume I need to fix it.
    // lines 65-73:
    /*
    export function Sidebar({
        userRole = "employee",
        departmentName = "",
        storeId = ""
    }: {
        userRole?: string,
        departmentName?: string,
        storeId?: string
    }) {
    */

    // My previous replace targeted the Type definition part (lines 70-73).
    // I missed the destructuring part (lines 66-68).

    // I should probably fix the destructuring first.
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
                            <h1 className="text-xl font-black text-foreground leading-tight tracking-[-0.05em]">CHICK<span className="text-primary italic">.</span></h1>
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

export function MobileSidebar() {
    const [open, setOpen] = useState(false);
    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden"><Menu /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-sidebar border-r border-sidebar-border">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <Sidebar isMobile={true} />
            </SheetContent>
        </Sheet>
    );
}
