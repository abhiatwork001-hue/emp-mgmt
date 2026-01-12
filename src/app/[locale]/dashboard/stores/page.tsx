import { getAllStoresWithStats } from "@/lib/actions/store.actions";
import { StoreList } from "@/components/stores/store-list";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEmployeeById } from "@/lib/actions/employee.actions";


export default async function StoresPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    if (!session || !session.user) redirect("/login");
    const user = session.user as any;

    // Server-side Role Check
    const employee = await getEmployeeById(user.id);
    const roles = (employee?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
    const allowedRoles = ["owner", "admin", "hr", "super_user", "tech", "department_head", "store_manager"];

    if (!roles.some((r: string) => allowedRoles.includes(r))) {
        redirect("/dashboard"); // Or show forbidden
    }

    let stores = await getAllStoresWithStats();

    // Scoping for non-admin roles
    const isGlobalAdmin = roles.some((r: string) => ["owner", "admin", "hr", "super_user", "tech"].includes(r));

    if (!isGlobalAdmin) {
        if (roles.includes("department_head")) {
            const { GlobalDepartment, StoreDepartment } = await import("@/lib/models");
            const ledGlobalDepts = await GlobalDepartment.find({ departmentHead: employee._id }).select('_id');
            const ledGlobalDeptIds = ledGlobalDepts.map((d: any) => d._id);
            const storeDepts = await StoreDepartment.find({ globalDepartmentId: { $in: ledGlobalDeptIds } }).select('storeId');
            const allowedStoreIds = storeDepts.map((sd: any) => sd.storeId.toString());
            stores = stores.filter((s: any) => allowedStoreIds.includes(s._id.toString()));
        } else if (roles.includes("store_manager")) {
            const userStoreId = (employee.storeId?._id || employee.storeId)?.toString();
            stores = stores.filter((s: any) => s._id.toString() === userStoreId);
        } else {
            // Other roles see nothing if not admin or these specific managers
            stores = [];
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <div className="flex items-center text-sm text-muted-foreground">
                    {/* Breadcrumbs */}
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Stores</h2>
            </div>
            <StoreList initialStores={stores} currentUserRoles={roles} />
        </div>
    );
}
