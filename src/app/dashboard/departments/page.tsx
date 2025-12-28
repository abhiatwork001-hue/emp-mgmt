import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllGlobalDepartmentsWithStats } from "@/lib/actions/department.actions";
import { DepartmentList } from "@/components/departments/department-list";

export default async function DepartmentsPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

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
