import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getScheduleById, getScheduleBySlug } from "@/lib/actions/schedule.actions";
import { getEmployeeById } from "@/lib/actions/employee.actions";
import { ScheduleEditor } from "./schedule-editor";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default async function SchedulePage({ params }: { params: Promise<{ slug: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const { slug } = await params;
    let schedule = null;
    let error: any = null;

    try {
        schedule = await getScheduleBySlug(slug);
    } catch (e: any) {
        if (e?.digest?.startsWith?.('NEXT_REDIRECT')) throw e;
        // Likely unauthorized or not found
        error = e;
    }

    if (error || !schedule) {
        if (error?.message?.includes('Unauthorized')) {
            return <AccessDenied />;
        }
        return <div>Schedule not found</div>;
    }

    const employee = await getEmployeeById((session.user as any).id);
    const roles = employee?.roles || [];
    const normalizedRoles = roles.map((r: string) => r.toLowerCase().replace(/ /g, "_"));

    // Check for edit permission
    const EDIT_ROLES = ["store_manager", "store_department_head", "department_head", "admin", "owner", "super_user", "hr", "tech"];
    const canEdit = normalizedRoles.some((r: string) => EDIT_ROLES.includes(r));

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight">
                        {schedule.storeId?.name || "Store"} - {schedule.storeDepartmentId?.name || "Department"}
                    </h1>
                    <Badge variant={schedule.status === 'published' ? 'default' : 'outline'} className="capitalize">
                        {schedule.status}
                    </Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                    Week {schedule.weekNumber}, {schedule.year} • {format(new Date(schedule.dateRange.startDate), "MMM d")} - {format(new Date(schedule.dateRange.endDate), "MMM d, yyyy")}
                </p>
            </div>

            <ScheduleEditor
                initialSchedule={schedule}
                userId={(session.user as any).id}
                canEdit={canEdit}
                userRoles={normalizedRoles}
                userStoreId={employee?.storeId?._id ? employee.storeId._id.toString() : employee?.storeId?.toString()}
                userDepartmentId={employee?.storeDepartmentId?._id ? employee.storeDepartmentId._id.toString() : employee?.storeDepartmentId?.toString()}
            />
        </div>
    );
}

// Helper Access Denied Component
function AccessDenied() {
    return (
        <div className="flex flex-col items-center justify-center p-12 space-y-4 text-center border rounded-lg bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50">
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/40">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 dark:text-red-400"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
            </div>
            <div>
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-200">Access Restricted</h3>
                <p className="text-sm text-red-800/80 dark:text-red-300/80 max-w-sm mt-1">
                    You do not have permission to view this schedule.
                </p>
            </div>
            <a
                href="/dashboard/schedules"
                className="inline-flex items-center justify-center h-9 px-4 py-2 text-sm font-medium transition-colors rounded-md bg-primary text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
                View My Schedules
            </a>
        </div>
    );
}
