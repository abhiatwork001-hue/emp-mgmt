import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllEmployees, getEmployeeById } from "@/lib/actions/employee.actions";
import { getAllStores } from "@/lib/actions/store.actions";
import { getAllGlobalDepartments } from "@/lib/actions/department.actions";
import { getAllPositions } from "@/lib/actions/position.actions";
import { EmployeeList } from "@/components/employees/employee-list";

interface EmployeesPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) redirect("/login");
    const user = session.user as any;

    const employee = await getEmployeeById(user.id);
    const roles = (employee?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
    const allowedRoles = ["owner", "admin", "hr", "super_user", "store_manager", "department_head", "tech"];

    if (!roles.some((r: string) => allowedRoles.includes(r))) {
        redirect("/dashboard");
    }

    // Await searchParams before access to ensure compatibility with Next.js specific behavior or future changes
    const resolvedParams = await searchParams;
    const { search, storeId, departmentId, positionId, sort, page } = resolvedParams;
    const currentPage = Number(page) || 1;

    const [employeesData, stores, departments, positions] = await Promise.all([
        getAllEmployees({
            search: typeof search === 'string' ? search : undefined,
            storeId: typeof storeId === 'string' ? storeId : undefined,
            departmentId: typeof departmentId === 'string' ? departmentId : undefined,
            positionId: typeof positionId === 'string' ? positionId : undefined,
            sort: typeof sort === 'string' ? sort : undefined,
        }, currentPage),
        getAllStores(),
        getAllGlobalDepartments(),
        getAllPositions()
    ]);

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Employees</h2>
            <EmployeeList
                initialEmployees={employeesData.employees}
                pagination={employeesData.pagination}
                stores={stores}
                departments={departments}
                positions={positions}
            />
        </div>
    );
}
