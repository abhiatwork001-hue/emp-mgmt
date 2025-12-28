import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getScheduleById } from "@/lib/actions/schedule.actions";
import { getEmployeeById } from "@/lib/actions/employee.actions";
import { ScheduleEditor } from "./schedule-editor";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default async function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const { id } = await params;
    const schedule = await getScheduleById(id);

    if (!schedule) {
        return <div>Schedule not found</div>;
    }

    const employee = await getEmployeeById((session.user as any).id);
    const roles = employee?.roles || [];
    const normalizedRoles = roles.map((r: string) => r.toLowerCase().replace(/ /g, "_"));

    // Check for edit permission
    const EDIT_ROLES = ["store_manager", "store_department_head", "department_head", "admin", "owner", "super_user", "hr"];
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

            <ScheduleEditor initialSchedule={schedule} userId={(session.user as any).id} canEdit={canEdit} />
        </div>
    );
}
