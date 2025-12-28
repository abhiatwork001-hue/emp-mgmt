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
    const allowedRoles = ["owner", "admin", "hr", "super_user"];

    if (!roles.some((r: string) => allowedRoles.includes(r))) {
        redirect("/dashboard"); // Or show forbidden
    }

    const stores = await getAllStoresWithStats();
    /*     console.log(stores); */
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <div className="flex items-center text-sm text-muted-foreground">
                    {/* Mock breadcrumbs if needed, simplified for now */}
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Stores</h2>
            </div>
            <StoreList initialStores={stores} />
        </div>
    );
}
