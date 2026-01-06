// Header component for the dashboard
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { CreateNoticeDialog } from "@/components/notices/create-notice-dialog";
import { CreateReminderDialog } from "@/components/reminders/create-reminder-dialog";
import { RoleSwitcher } from "@/components/dashboard/role-switcher";
import { Badge } from "@/components/ui/badge";
import { PushPermissionButton } from "@/components/pwa/push-permission-button";
import { TestNotificationButton } from "@/components/pwa/test-notification-button";
import { Store } from "lucide-react";

export function DashboardHeader({
    session,
    viewRole,
    employee,
    stores,
    depts,
    localStoreDepartments,
    canSwitchRoles
}: any) {
    const [greeting, setGreeting] = useState("");

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting("Good Morning");
        else if (hour < 18) setGreeting("Good Afternoon");
        else setGreeting("Good Evening");
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
            <div className="space-y-0.5">
                <h1 className="text-3xl font-black tracking-tight text-foreground italic flex items-center gap-2">
                    {greeting}, <span className="bg-gradient-to-r from-primary via-violet-500 to-primary bg-clip-text text-transparent animate-gradient-x">{session?.user?.name?.split(' ')[0] || employee?.firstName || "User"}</span>
                </h1>
                <div className="flex flex-col gap-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-primary/40" />
                        Welcome back to your workspace
                    </p>
                    {(employee.storeId && ["employee", "store_manager", "store_department_head"].includes(viewRole)) && (
                        <div className="flex items-center gap-1.5 ml-3 text-emerald-600/80">
                            <Store className="w-3 h-3" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                {employee.storeId.name || stores?.find((s: any) => s._id === employee.storeId || s._id === employee.storeId?._id)?.name || "Store"}
                            </span>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-3">
                {/* Push Notifications (All Users) */}
                <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-2xl border border-border/40 backdrop-blur-sm">
                    <PushPermissionButton />
                </div>

                {["admin", "hr", "owner", "super_user", "store_manager", "department_head", "store_department_head"].includes(viewRole) && (
                    <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-2xl border border-border/40 backdrop-blur-sm">
                        <CreateNoticeDialog
                            userId={(session.user as any).id}
                            currentUserRole={viewRole}
                            storeId={employee.storeId?._id || employee.storeId}
                            storeDepartmentId={employee.storeDepartmentId?._id || employee.storeDepartmentId}
                            globalDepartmentId={employee.storeDepartmentId?.globalDepartmentId}
                            stores={stores}
                            departments={depts}
                            storeDepartments={localStoreDepartments}
                        />
                        <CreateReminderDialog userId={(session.user as any).id} />
                        {["admin", "owner", "super_user", "hr"].includes(viewRole) && <TestNotificationButton />}
                    </div>
                )}
                {canSwitchRoles && <RoleSwitcher currentUserRole={viewRole} />}
            </div>
        </motion.div>
    );
}
