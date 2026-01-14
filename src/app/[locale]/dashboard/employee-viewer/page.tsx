
import { EmployeeList } from "@/components/employees/employee-list";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Employee, Store, StoreDepartment } from "@/lib/models";
import connectToDB from "@/lib/db";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

export default async function StaffViewerPage({ params: { locale } }: { params: { locale: string } }) {
    await connectToDB();
    const session = await getServerSession(authOptions);

    if (!session?.user) return redirect("/api/auth/signin");

    const employee = await Employee.findOne({ email: session.user.email }).lean();
    if (!employee) return redirect("/api/auth/signin");

    // Scoping Logic
    const isStoreManager = employee.roles.includes("store_manager") || employee.roles.includes("manager");
    const isDeptHead = employee.roles.includes("store_department_head");

    // If Global Admin/Owner, redirect to main list (optional, but good for consistency)
    if (employee.roles.some((r: string) => ["admin", "owner", "hr", "super_user", "tech"].includes(r))) {
        // They can use the main page, but if they land here, show everything or specific scope?
        // Let's treat this page as "My Staff" view.
    }

    const initialFilters: any = {};
    let scopeType: "global" | "store" | "department" = "global";
    let scopeId = undefined;

    if (employee.storeId) {
        initialFilters.storeId = employee.storeId.toString();
        scopeType = "store";
        scopeId = employee.storeId.toString();
    }

    if (isDeptHead && employee.storeDepartmentId) {
        initialFilters.storeDepartmentId = employee.storeDepartmentId.toString();
        scopeType = "department";
        scopeId = employee.storeDepartmentId.toString();
    }

    // Fetch initial data for the list (reusing existing fetch logic or client component handles it)
    // EmployeeList is a client component that fetches? Let's check.
    // Assuming EmployeeList takes initial props or handles fetching.
    // Based on previous file reads, it seems to have internal state but might accept props.
    // I'll check EmployeeList source again in a moment if needed, but standardizing passing 'currentUser' and 'scope'.

    // Fetch dependencies for filters
    const stores = await Store.find({}).select("name _id").lean();
    const departments = await StoreDepartment.find({}).select("name _id").lean();
    const positions = await (await import("@/lib/models")).Position.find({}).select("name _id translations").lean();

    // Fetch Initial Data
    const { getAllEmployees } = await import("@/lib/actions/employee.actions");
    const { employees: initialEmployees, pagination } = await getAllEmployees(initialFilters, 1, 20);

    const t = await getTranslations("Employees");

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black italic tracking-tighter text-foreground">
                    {t('staffViewerTitle', { defaultValue: 'My Staff' })}
                </h1>
                <p className="text-muted-foreground font-medium">
                    {t('staffViewerDesc', { defaultValue: 'Manage employees within your scope.' })}
                </p>
            </div>

            <EmployeeList
                currentUser={JSON.parse(JSON.stringify(employee))}
                initialEmployees={initialEmployees}
                pagination={pagination}
                stores={JSON.parse(JSON.stringify(stores))}
                departments={JSON.parse(JSON.stringify(departments))}
                positions={JSON.parse(JSON.stringify(positions))}
                initialScope={{ type: scopeType, id: scopeId }}
            />
        </div>
    );
}
