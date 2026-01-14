import { Sidebar } from "@/components/layout/sidebar";
import Footer from '@/components/layout/footer';
import { Header } from "@/components/layout/header";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEmployeeById, getEmployeeByIdCached } from "@/lib/actions/employee.actions";
import { SetupPasswordView } from "@/components/auth/setup-password-view";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ContentWrapper } from "@/components/layout/content-wrapper";
import { redirect } from "next/navigation";
import { hasPendingCoverageActions } from "@/lib/actions/coverage.actions";
import { hasRecipesForUser } from "@/lib/actions/recipe.actions";
import { getTranslations } from "next-intl/server";
import { routes } from "@/lib/sidebar-config";

import { RealtimeToaster } from "@/components/layout/realtime-toaster";
import { PwaInstallPrompt } from "@/components/pwa/install-prompt";

export default async function DashboardLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const session = await getServerSession(authOptions);
    const user = (session?.user as any) || {};
    const userId = user.id;

    // Fetch full employee to get department info
    const employee = userId ? await getEmployeeByIdCached(userId) : null;

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

    // For Global Dept Heads, fetch their department slug for direct redirect
    let deptSlug = "";
    if (primaryRole === "department_head") {
        const { getGlobalDepartmentsByHead } = await import("@/lib/actions/department.actions");
        const ledDepts = await getGlobalDepartmentsByHead(userId);
        if (ledDepts.length > 0) {
            deptSlug = ledDepts[0].slug;
        }
    }

    // --- Visibility Checks for Sidebar ---
    const isPrivileged = ["admin", "hr", "owner", "super_user", "tech"].includes(primaryRole);

    // 1. Coverage Visibility
    const hasCoverageActions = await hasPendingCoverageActions(userId, isPrivileged);

    // 2. Recipe Visibility
    // Kitchen staff should ALWAYS see the recipes link even if empty
    const kitchenRoles = ["chef", "head_chef", "cook", "kitchen_staff"];
    const isKitchenStaff = normalizedRoles.some((role: string) => kitchenRoles.includes(role));
    const isAdmin = normalizedRoles.some((role: string) => ["admin", "owner", "hr", "tech", "super_user"].includes(role));

    // Check if user is in Kitchen global department or is a Kitchen department head
    let isInKitchenDepartment = false;
    const isDepartmentHead = normalizedRoles.includes("department_head") || primaryRole === "department_head";

    try {
        if (isDepartmentHead) {
            const { getGlobalDepartmentsByHead } = await import("@/lib/actions/department.actions");
            const ledDepts = await getGlobalDepartmentsByHead(userId);
            isInKitchenDepartment = ledDepts.some((dept: any) =>
                dept.name?.toLowerCase().includes("kitchen") ||
                dept.slug?.toLowerCase().includes("kitchen")
            );
        } else {
            // Check if employee's store department is linked to Kitchen global department
            const { getEmployeeById } = await import("@/lib/actions/employee.actions");
            const emp = await getEmployeeById(userId);

            if (emp?.storeDepartmentId) {
                const { StoreDepartment } = await import("@/lib/models");
                const storeDept = await StoreDepartment.findById(emp.storeDepartmentId).populate("globalDepartmentId", "name slug").lean();

                if (storeDept?.globalDepartmentId) {
                    const globalDept = storeDept.globalDepartmentId as any;
                    isInKitchenDepartment = globalDept.name?.toLowerCase().includes("kitchen") ||
                        globalDept.slug?.toLowerCase().includes("kitchen");
                }
            }
        }
    } catch (error) {
        console.error("[DashboardLayout] Error checking kitchen department:", error);
    }

    const shouldAlwaysSeeRecipes = isAdmin || isKitchenStaff || isInKitchenDepartment;
    const hasRecipes = shouldAlwaysSeeRecipes || (await hasRecipesForUser());


    // 3. Translations for Sidebar
    const tCommon = await getTranslations("Common");
    const tSidebar = await getTranslations("Sidebar");
    const sidebarTranslations: { [key: string]: string } = {};

    // Route Labels
    routes.forEach(r => {
        const key = r.label.toLowerCase();
        sidebarTranslations[key] = tCommon(key);
    });

    // Group Titles
    const groups = ["operations", "people", "structure", "communication", "account"];
    groups.forEach(g => {
        sidebarTranslations[`group.${g}`] = tSidebar(`groups.${g}`);
    });

    return (
        <div className="flex h-screen overflow-hidden bg-background text-foreground">
            {userId && <RealtimeToaster userId={userId} />}
            <PwaInstallPrompt />
            {isPasswordChanged ? (
                <>
                    <div className="hidden md:flex h-full z-[80] bg-sidebar text-sidebar-foreground border-r border-sidebar-border shrink-0 overflow-visible print-hidden">
                        <Sidebar
                            userRoles={normalizedRoles}
                            departmentName={deptName}
                            storeSlug={storeSlug}
                            deptSlug={deptSlug}
                            hasRecipes={hasRecipes}
                            hasCoverage={hasCoverageActions}
                            translations={sidebarTranslations}
                        />
                    </div>

                    {/* Main Content Area */}
                    <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative print:overflow-visible print:h-auto print:block">
                        <div className="print-hidden">
                            <Header
                                userRoles={normalizedRoles}
                                departmentName={deptName}
                                employee={employee ? JSON.parse(JSON.stringify(employee)) : null}
                                translations={sidebarTranslations}
                                storeSlug={storeSlug}
                                deptSlug={deptSlug}
                                hasRecipes={hasRecipes}
                                hasCoverage={hasCoverageActions}
                            />
                        </div>
                        <ContentWrapper>
                            {children}
                            <div className="mt-auto">
                                <Footer />
                            </div>
                        </ContentWrapper>
                        <div className="print-hidden">
                            <BottomNav />
                        </div>
                    </main>
                </>
            ) : (
                <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden items-center justify-center bg-background">
                    <SetupPasswordView userId={userId} />
                </main>
            )}
        </div>
    );
}
