import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllGlobalDepartmentsWithStats } from "@/lib/actions/department.actions";
import { DepartmentList } from "@/components/departments/department-list";
import { getEmployeeById } from "@/lib/actions/employee.actions";

export default async function DepartmentsPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    if (!session || !session.user) redirect("/login");
    const user = session.user as any;

    const employee = await getEmployeeById(user.id);
    const roles = (employee?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
    const allowedRoles = ["owner", "admin", "hr", "super_user", "department_head"];

    if (!roles.some((r: string) => allowedRoles.includes(r))) {
        redirect("/dashboard");
    }

    const departments = await getAllGlobalDepartmentsWithStats();

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Departments</h2>
                <p className="text-muted-foreground">Manage company-wide departments.</p>
            </div>

            <DepartmentList initialDepartments={departments} />
        </div>
    );
}
