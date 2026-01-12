import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllGlobalDepartmentsWithStats } from "@/lib/actions/department.actions";
import { getLocale } from "next-intl/server";
import { DepartmentList } from "@/components/departments/department-list";
import { getEmployeeById } from "@/lib/actions/employee.actions";

export default async function DepartmentsPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    if (!session || !session.user) redirect("/login");
    const user = session.user as any;

    const employee = await getEmployeeById(user.id);
    const roles = (employee?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
    const GLOBAL_ADMIN_ROLES = ["owner", "admin", "hr", "super_user", "tech"];

    // 1. Global Admins: View All
    if (roles.some((r: string) => GLOBAL_ADMIN_ROLES.includes(r))) {
        // Proceed to view list
    }
    // 2. Department Heads: specific redirect
    else if (roles.includes("department_head")) {
        const { GlobalDepartment } = await import("@/lib/models");
        const ledGlobalDepts = await GlobalDepartment.find({ departmentHead: user.id }).select('slug').lean();

        if (ledGlobalDepts.length > 0) {
            // Redirect to their first department
            redirect(`/dashboard/departments/${ledGlobalDepts[0].slug}`);
        } else {
            // Head with no department assigned?
            redirect("/dashboard");
        }
    } else {
        // 3. Unauthorized
        const locale = await getLocale();
        redirect(`/${locale}/access-denied`);
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
