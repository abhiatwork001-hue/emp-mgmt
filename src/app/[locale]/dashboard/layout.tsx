import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEmployeeById } from "@/lib/actions/employee.actions";
import { SetupPasswordView } from "@/components/auth/setup-password-view";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ContentWrapper } from "@/components/layout/content-wrapper";
import { redirect } from "next/navigation";

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

    // If session exists but employee not found, redirect to login to clear session
    if (session && userId && !employee) {
        redirect("/api/auth/signout?callbackUrl=/login");
    }

    const userRoles = employee?.roles || user.roles || [];

    // Explicitly check for false. If it's undefined/null, we assume true (legacy users)
    // DB Source of Truth: Prioritize employee record. Session might be stale.
    const isPasswordChanged = employee
        ? employee.isPasswordChanged !== false
        : user.isPasswordChanged !== false;

    // Determine Department Name & Store ID
    const deptName = employee?.storeDepartmentId?.name || "";
    const rawStoreId = employee?.storeId;
    let storeSlug = "";
    if (rawStoreId) {
        const storeIdStr = (typeof rawStoreId === 'object' && '_id' in rawStoreId)
            ? (rawStoreId as any)._id.toString()
            : rawStoreId.toString();

        // We need the slug. Employee usually has storeId as ref.
        // If it's populated, we can get it. If not, we might need a quick fetch or assume it's there if we populate it in getEmployeeById.
        storeSlug = (rawStoreId as any).slug || storeIdStr;
    }

    // Determine primary role
    let primaryRole = "employee";
    const normalize = (r: string) => r.toLowerCase().replace(/ /g, "_");
    const normalizedRoles = userRoles.map((r: string) => normalize(r));

    if (normalizedRoles.includes("super_user")) primaryRole = "super_user";
    else if (normalizedRoles.includes("tech")) primaryRole = "tech"; // High priority
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
                        <Sidebar userRole={primaryRole} departmentName={deptName} storeSlug={storeSlug} />
                    </div>

                    {/* Main Content Area */}
                    <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
                        <Header userRole={primaryRole} departmentName={deptName} />
                        <ContentWrapper>
                            {children}
                        </ContentWrapper>
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
