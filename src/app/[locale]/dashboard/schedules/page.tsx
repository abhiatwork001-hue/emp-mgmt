import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ScheduleDashboardClient from "./dashboard-client";

import { getSchedules } from "@/lib/actions/schedule.actions";
import { getEmployeeById } from "@/lib/actions/employee.actions";

const RESTRICTED_ROLES = ["employee"];

export default async function SchedulesPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const employee = await getEmployeeById((session.user as any).id);
    const roles = (employee?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));

    // If user ONLY has 'employee' role (and no higher roles), block access
    // Or simplified: if not in ALLOWED_ROLES.
    // Let's use negative check: if user is "employee" and NOTHING ELSE high tier.
    // Actually, safer to check for PERMISSION to view.
    // View Schedules: Store Manager, Head, HR, Admin, Owner.
    const ALLOWED_VIEW_ROLES = ["store_manager", "store_department_head", "department_head", "admin", "owner", "super_user", "hr", "employee"];
    const hasPermission = roles.some((r: string) => ALLOWED_VIEW_ROLES.includes(r));

    if (!hasPermission) redirect("/dashboard");

    // Redirect logic for simple employees: Go directly to their department's latest schedule
    const isManagerial = roles.some((r: string) => ["store_manager", "store_department_head", "department_head", "admin", "owner", "super_user", "hr"].includes(r));

    if (!isManagerial && employee.storeDepartmentId) {
        const storeId = employee.storeId?._id || employee.storeId;
        const deptId = employee.storeDepartmentId?._id || employee.storeDepartmentId;

        try {
            // Fetch recent schedules for their department
            const schedules = await getSchedules(storeId, deptId);
            // Find the latest active one (published or approved)
            // Since getSchedules sorts by year/week desc, finding the first valid one gives the latest.
            const latestSchedule = schedules.find((s: any) => ["published", "approved"].includes(s.status));

            if (latestSchedule) {
                redirect(`/dashboard/schedules/${latestSchedule._id}`);
            }
        } catch (error) {
            console.error("Auto-redirect error:", error);
            // Fallthrough to main dashboard if error or no schedule
        }
    }

    // Determine if user is restricted to a specific store
    const isGlobalRole = roles.some((r: string) => ["admin", "owner", "super_user", "hr", "department_head"].includes(r));
    const restrictedStoreId = !isGlobalRole ? (employee.storeId?._id || employee.storeId) : undefined;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Schedules</h2>
                    <p className="text-muted-foreground">Overview of department schedules and statuses.</p>
                </div>
            </div>

            <ScheduleDashboardClient restrictedStoreId={restrictedStoreId} />
        </div>
    );
}
