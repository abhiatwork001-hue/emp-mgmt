"use client";

import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Calendar, ListTodo, User, Bell, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

const navItems = [
    { label: "Home", icon: LayoutDashboard, href: "/dashboard" },
    { label: "Schedule", icon: Calendar, href: "/dashboard/schedules" },
    { label: "Messages", icon: MessageSquare, href: "/dashboard/messages" },
    { label: "Tasks", icon: ListTodo, href: "/dashboard/tasks" },
    { label: "Profile", icon: User, href: "/dashboard/profile" },
];

export function BottomNav() {
    const pathname = usePathname();
    const t = useTranslations("Common");

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 pb-safe-offset-2 pt-2">
            <div className="bg-background/80 backdrop-blur-xl border border-border/40 rounded-3xl shadow-2xl flex items-center justify-around h-16 premium-shadow relative overflow-hidden">
                {/* Subtle glass effect highlight at bottom */}
                <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center relative w-full h-full gap-1 transition-all duration-300",
                                isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <item.icon className={cn("h-5 w-5", isActive ? "fill-primary/10" : "")} />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">
                                {t(item.label.toLowerCase())}
                            </span>

                            {isActive && (
                                <motion.div
                                    layoutId="bottom-nav-active"
                                    className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary"
                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

// Add a spacer to prevent content from being hidden behind the nav
export function BottomNavSpacer() {
    return <div className="md:hidden h-24" />;
}
