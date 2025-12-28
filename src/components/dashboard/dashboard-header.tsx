// Header component for the dashboard
"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { CreateNoticeDialog } from "@/components/notices/create-notice-dialog";
import { CreateReminderDialog } from "@/components/reminders/create-reminder-dialog";
import { RoleSwitcher } from "@/components/dashboard/role-switcher";
import { Badge } from "@/components/ui/badge";
import { PushPermissionButton } from "@/components/pwa/push-permission-button";
import { TestNotificationButton } from "@/components/pwa/test-notification-button";

export function DashboardHeader({
    session,
    viewRole,
    employee,
    stores,
    depts,
    localStoreDepartments,
    canSwitchRoles
}: any) {
    const t = useTranslations("Common");

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
            <div className="space-y-1">
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent italic">
                    {t("dashboard")}
                </h1>
                <p className="text-muted-foreground text-sm font-medium">
                    Welcome back, {session?.user?.name?.split(' ')[0] || "User"}
                </p>
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
