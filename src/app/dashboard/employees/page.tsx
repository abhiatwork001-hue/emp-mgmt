import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllEmployees } from "@/lib/actions/employee.actions";
import { getAllStores } from "@/lib/actions/store.actions";
import { getAllGlobalDepartments } from "@/lib/actions/department.actions";
import { getAllPositions } from "@/lib/actions/position.actions";
import { EmployeeList } from "@/components/employees/employee-list";

interface EmployeesPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    // Await searchParams before access to ensure compatibility with Next.js specific behavior or future changes
    const resolvedParams = await searchParams;
    const { search, storeId, departmentId, positionId, sort } = resolvedParams;

    const [employees, stores, departments, positions] = await Promise.all([
        getAllEmployees({
            search: typeof search === 'string' ? search : undefined,
            storeId: typeof storeId === 'string' ? storeId : undefined,
            departmentId: typeof departmentId === 'string' ? departmentId : undefined,
            positionId: typeof positionId === 'string' ? positionId : undefined,
            sort: typeof sort === 'string' ? sort : undefined,
        }),
        getAllStores(),
        getAllGlobalDepartments(),
        getAllPositions()
    ]);

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Employees</h2>
            <EmployeeList
                initialEmployees={employees}
                stores={stores}
                departments={departments}
                positions={positions}
            />
        </div>
    );
}
