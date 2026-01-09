import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { FadeIn } from "@/components/dashboard/dashboard-animations";
import { authOptions } from "@/lib/auth";
import { getEmployeeById, getEmployeeByIdCached } from "@/lib/actions/employee.actions";
import { getAllStores, getStoreDepartments } from "@/lib/actions/store.actions";
import { getAllGlobalDepartments } from "@/lib/actions/department.actions";
import { getTranslations } from "next-intl/server";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { AsyncDashboard } from "@/components/dashboard/async-dashboard";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { Suspense } from "react";

interface DashboardPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DashboardPage(props: DashboardPageProps) {
    const searchParams = await props.searchParams;
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const employee = await getEmployeeById((session.user as any).id);
    if (!employee) {
        redirect("/api/auth/signout?callbackUrl=/login");
    }

    // Determine Role & Dashboard Type
    const directRoles = employee.roles || [];
    const positionRoles = employee.positionId?.roles?.map((r: any) => r.name) || [];
    const allRolesRaw = [...new Set([...directRoles, ...positionRoles])];

    const normalize = (r: any) => {
        if (!r) return "";
        if (typeof r === "object" && r.name) return r.name.toLowerCase().replace(/ /g, "_");
        if (typeof r === "string") return r.toLowerCase().replace(/ /g, "_");
        return String(r).toLowerCase();
    };
    const allRoles = allRolesRaw.map(normalize).filter(Boolean);

    const isOwner = allRoles.includes("owner");
    const isAdmin = allRoles.includes("admin");
    const canSwitchRoles = allRoles.includes("tech");

    // Check for role override
    const testRoleParam = canSwitchRoles && searchParams?.testRole;
    const testRole = testRoleParam
        ? (Array.isArray(testRoleParam) ? testRoleParam[0] : testRoleParam)
        : null;

    // Determine effective role for rendering
    let viewRole = "employee";
    if (testRole) {
        viewRole = testRole;
    } else {
        if (allRoles.includes("super_user")) viewRole = "super_user";
        else if (allRoles.includes("tech")) viewRole = "tech";
        else if (isOwner) viewRole = "owner";
        else if (isAdmin) viewRole = "admin";
        else if (allRoles.includes("hr")) viewRole = "hr";
        else if (allRoles.includes("store_manager")) viewRole = "store_manager";
        else if (allRoles.includes("department_head")) viewRole = "department_head";
        else if (allRoles.includes("store_department_head")) viewRole = "store_department_head";
    }

    // Lightweight Fetches for Header
    // We assume these are relatively fast compared to the full dashboard aggregation
    const stores = await getAllStores();
    const depts = await getAllGlobalDepartments();

    let localStoreDepartments: any[] = [];
    if (viewRole === "store_manager") {
        const storeId = employee.storeId?._id || employee.storeId;
        if (storeId) {
            localStoreDepartments = await getStoreDepartments(storeId.toString());
        }
    }

    const managers: never[] = []; // We don't fetch managers here anymore to save time

    return (
        <div className="min-h-screen bg-transparent">
            <div className="space-y-4 p-4 md:p-8 max-w-[98%] mx-auto relative z-10">
                <FadeIn y={-20}>
                    <DashboardHeader
                        session={session}
                        viewRole={viewRole}
                        employee={employee}
                        stores={stores}
                        depts={depts}
                        localStoreDepartments={localStoreDepartments}
                        canSwitchRoles={canSwitchRoles}
                    />
                </FadeIn>
                <div className="mt-2 text-primary">
                    <Suspense fallback={<DashboardSkeleton />}>
                        <AsyncDashboard
                            employee={employee}
                            viewRole={viewRole}
                            stores={stores}
                            depts={depts}
                            allRoles={allRoles}
                            managers={managers} // Passed as empty, fetched inside if needed or ignored if not critical
                        />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
