import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getEmployeeById } from "@/lib/actions/employee.actions";
import { getAllStores } from "@/lib/actions/store.actions";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Lock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function CredentialsPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const employee = await getEmployeeById((session.user as any).id);
    const roles = employee?.roles?.map((r: string) => r.toLowerCase().replace(/ /g, "_")) || [];

    // Access Check: Admins, HR, Tech, Owner, SuperUser
    const canViewAll = roles.some((r: string) => ["admin", "hr", "owner", "tech", "super_user"].includes(r));

    if (!canViewAll) {
        // If Manager, redirect to their store if possible
        if (roles.includes("store_manager") && employee.storeId) {
            redirect(`/dashboard/stores/${employee.storeId.slug || employee.storeId}/credentials`);
            // Note: We haven't created a sub-route /credentials for store yet. 
            // Maybe just redirect to store page?
            // redirect(`/dashboard/stores/${employee.storeId.slug || employee.storeId}`);
        }
        return <div>Access Denied</div>;
    }

    const stores = await getAllStores();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Store Credentials Vault</h1>
                <p className="text-muted-foreground">Securely manage access credentials for all locations.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stores.map((store: any) => (
                    <Link key={store._id} href={`/dashboard/stores/${store.slug}#credentials`}>
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Building2 className="h-5 w-5 text-muted-foreground" />
                                    {store.name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Lock className="h-3 w-3" /> Manage Credentials
                                    </span>
                                    <ArrowRight className="h-4 w-4" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
