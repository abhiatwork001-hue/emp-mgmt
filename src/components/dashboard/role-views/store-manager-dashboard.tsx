"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ClipboardList, Users, Package, TrendingUp, AlertCircle, ShoppingCart, MessageSquare, Sun, CheckCircle2, Palmtree } from "lucide-react";
import { format } from "date-fns";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { PendingApprovalsWidget } from "@/components/dashboard/pending-approvals-widget";
import { CredentialManager } from "@/components/credentials/credential-list";
import { BirthdayWidget } from "@/components/dashboard/widgets/birthday-widget";
import { HolidayWidget } from "@/components/dashboard/widgets/holiday-widget";
import { EmployeeScheduleTab } from "@/components/employees/employee-schedule-tab";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface StoreManagerDashboardProps {
    employee: any;
    pendingRequests: any[];
    requests?: {
        vacations: any[];
        absences: any[];
        overtime: any[];
        schedules: any[];
    };
    storeStats: {
        totalEmployees: number;
        onVacation: number;
        todayShifts: number;
    };
    todaysCoworkers?: any[];
    currentScheduleId?: string | null;
    currentUserRole?: string;
}

import { motion } from "framer-motion";

export function StoreManagerDashboard({ employee, pendingRequests, requests, storeStats, todaysCoworkers = [], currentScheduleId, currentUserRole = "store_manager" }: StoreManagerDashboardProps) {
    const [greeting, setGreeting] = useState("");
    const t = useTranslations("Common");

    // Helpers to hide sections for high-level roles (Admin/HR/Owner) who view this dashboard
    const isHighLevel = ["owner", "admin", "hr", "super_user"].includes(currentUserRole);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting("Good Morning");
        else if (hour < 18) setGreeting("Good Afternoon");
        else setGreeting("Good Evening");
    }, []);

    return (
        <div className="space-y-8">
            {/* Header / Greeting */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        {greeting}, <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">{employee.firstName}</span>
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium mt-1 uppercase tracking-wider">Store Management Overview</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-bold tracking-wide">Store Operations: Optimal</span>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { title: "Team Size", value: storeStats.totalEmployees, label: "active", icon: Users, color: "text-primary" },
                    { title: "Today's Shifts", value: storeStats.todayShifts, label: "scheduled", icon: Calendar, color: "text-orange-500" },
                    { title: "On Vacation", value: storeStats.onVacation, label: "employees", icon: Palmtree, color: "text-emerald-500" },
                    { title: "Pending Approvals", value: pendingRequests.length, label: "requests", icon: ClipboardList, color: "text-destructive", highlight: true },
                ].map((stat, i) => (
                    <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * i, duration: 0.4 }}
                    >
                        <Card glass premium className={cn("relative group overflow-hidden border-border/40", stat.highlight && "border-destructive/20 shadow-destructive/5")}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">{stat.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-baseline gap-2">
                                    <span className={cn("text-4xl font-bold tracking-tighter", stat.highlight && "text-destructive")}>{stat.value}</span>
                                    <span className="text-xs font-semibold text-muted-foreground/60 uppercase">{stat.label}</span>
                                </div>
                            </CardContent>
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500">
                                <stat.icon className={cn("h-12 w-12", stat.color)} />
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Pending Approvals Widget */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                    >
                        <PendingApprovalsWidget
                            overtime={requests?.overtime || []}
                            vacations={requests?.vacations || []}
                            absences={requests?.absences || []}
                            schedules={requests?.schedules || []}
                        />
                    </motion.div>

                    {/* Today's Team Coworkers - HIDDEN FOR HIGH LEVEL */}
                    {!isHighLevel && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <Card glass className="border-border/40 overflow-hidden">
                                <CardHeader className="bg-muted/30 border-b border-border/20 py-4">
                                    <CardTitle className="flex justify-between items-center text-sm font-bold uppercase tracking-wider">
                                        <span className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Working Today
                                        </span>
                                        {currentScheduleId && (
                                            <Link href={`/dashboard/schedules/${currentScheduleId}`} className="text-[10px] font-bold text-primary hover:underline transition-all group/link">
                                                VIEW FULL SCHEDULE <span className="inline-block group-hover:translate-x-1 transition-transform">&rarr;</span>
                                            </Link>
                                        )}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    {todaysCoworkers.length > 0 ? (
                                        <div className="flex -space-x-3 overflow-hidden p-2">
                                            {todaysCoworkers.map((cw: any, i: number) => (
                                                <motion.div
                                                    key={i}
                                                    whileHover={{ y: -5, scale: 1.1, zIndex: 10 }}
                                                    className="relative shrink-0"
                                                    title={`${cw.firstName} ${cw.lastName}`}
                                                >
                                                    <Avatar className="h-12 w-12 border-4 border-background shadow-xl">
                                                        <AvatarImage src={cw.image} alt={cw.firstName} />
                                                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                                            {cw.firstName[0]}{cw.lastName[0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </motion.div>
                                            ))}
                                            {todaysCoworkers.length > 8 && (
                                                <div className="h-12 w-12 rounded-full border-4 border-background bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground z-0">
                                                    +{todaysCoworkers.length - 8}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 bg-accent/5 rounded-2xl border border-dashed border-border/60">
                                            <p className="text-sm text-muted-foreground font-medium">No coworkers found for today.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <Card glass className="border-border/40 overflow-hidden">
                            <CardHeader className="bg-muted/30 border-b border-border/20 py-4">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider">My Schedule</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <EmployeeScheduleTab employeeId={employee._id.toString()} />
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Sidebar: Management Actions */}
                <div className="space-y-8">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                    >
                        <Card glass premium className="border-primary/10 overflow-hidden">
                            <CardHeader className="bg-primary/5 border-b border-primary/10 py-4">
                                <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary">Management Suite</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                {[
                                    { href: "/dashboard/schedules", icon: Calendar, label: "Manage Schedules", color: "hover:bg-primary/10 hover:text-primary" },
                                    { href: "/dashboard/employees", icon: Users, label: "Manage Employees", color: "hover:bg-primary/10 hover:text-primary" },
                                    { href: "/dashboard/tips", icon: TrendingUp, label: "Tips Analytics", hide: isHighLevel, color: "hover:bg-emerald-500/10 hover:text-emerald-600" },
                                ].filter(item => !item.hide).map((item, idx) => (
                                    <div key={idx}>
                                        <Link href={item.href} className="block group">
                                            <Button variant="ghost" className={cn("w-full justify-start h-12 rounded-xl transition-all border border-transparent group-hover:border-current", item.color)}>
                                                <item.icon className="mr-3 h-5 w-5 opacity-70" />
                                                <span className="font-semibold">{item.label}</span>
                                            </Button>
                                        </Link>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Birthday Widget */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                        <BirthdayWidget storeId={employee.storeId?._id || employee.storeId} currentUserId={employee._id} />
                    </motion.div>

                    {/* Holiday Widget */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                        <HolidayWidget storeId={employee.storeId?._id || employee.storeId} />
                    </motion.div>
                </div>
            </div>
        </div >
    );
}
