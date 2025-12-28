import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEmployeeById } from "@/lib/actions/employee.actions";
import { SetupPasswordView } from "@/components/auth/setup-password-view";
import { BottomNav, BottomNavSpacer } from "@/components/layout/bottom-nav";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);
    const user = (session?.user as any) || {};
    const userId = user.id;

    // Fetch full employee to get department info
    const employee = userId ? await getEmployeeById(userId) : null;
    const userRoles = employee?.roles || user.roles || [];

    // Explicitly check for false. If it's undefined/null, we assume true (legacy users)
    // DB Source of Truth: Prioritize employee record. Session might be stale.
    const isPasswordChanged = employee
        ? employee.isPasswordChanged !== false
        : user.isPasswordChanged !== false;

    // Determine Department Name & Store ID
    const deptName = employee?.storeDepartmentId?.name || "";
    const rawStoreId = employee?.storeId;
    const storeId = (rawStoreId && typeof rawStoreId === 'object' && '_id' in rawStoreId)
        ? (rawStoreId as any)._id.toString()
        : rawStoreId?.toString() || "";

    // Determine primary role
    let primaryRole = "employee";
    const normalize = (r: string) => r.toLowerCase().replace(/ /g, "_");
    const normalizedRoles = userRoles.map((r: string) => normalize(r));

    if (normalizedRoles.includes("super_user")) primaryRole = "super_user";
    else if (normalizedRoles.includes("owner")) primaryRole = "owner";
    else if (normalizedRoles.includes("admin")) primaryRole = "admin";
    else if (normalizedRoles.includes("hr")) primaryRole = "hr";
    else if (normalizedRoles.includes("store_manager")) primaryRole = "store_manager";
    else if (normalizedRoles.includes("department_head")) primaryRole = "department_head";
    else if (normalizedRoles.includes("store_department_head")) primaryRole = "store_department_head";

    return (
        <div className="flex h-screen overflow-hidden bg-background text-foreground">


            {isPasswordChanged ? (
                <>
                    {/* Sidebar Wrapper */}
                    <div className="hidden md:flex h-full z-[80] bg-sidebar text-sidebar-foreground border-r border-sidebar-border shrink-0 overflow-visible">
                        <Sidebar userRole={primaryRole} departmentName={deptName} storeId={storeId} />
                    </div>

                    {/* Main Content Area */}
                    <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
                        <Header userRole={primaryRole} departmentName={deptName} />
                        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8">
                            {children}
                            <BottomNavSpacer />
                        </div>
                        <BottomNav />
                    </main>
                </>
            ) : (
                <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden items-center justify-center bg-background">
                    <SetupPasswordView />
                </main>
            )}
        </div>
    );
}
