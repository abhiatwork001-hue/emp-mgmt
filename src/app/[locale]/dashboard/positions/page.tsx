import { getAllPositions } from "@/lib/actions/position.actions";
import { getAllRoles } from "@/lib/actions/role.actions"; // Import role fetcher
import { getEmployeeById } from "@/lib/actions/employee.actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PositionFormDialog } from "@/components/positions/position-form-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Briefcase } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import { EmptyState } from "@/components/ui/empty-state";

export default async function PositionsPage() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) redirect("/login");
    const user = session.user as any;

    const employee = await getEmployeeById(user.id);
    const roles = (employee?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
    const allowedRoles = ["owner", "admin", "hr", "super_user", "tech"];

    if (!roles.some((r: string) => allowedRoles.includes(r))) {
        redirect("/dashboard");
    }

    const rolesList = await getAllRoles();
    const positions = await getAllPositions();

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Positions</h2>
                <p className="text-muted-foreground">Manage job titles and hierarchy levels across the organization.</p>
            </div>

            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search positions..."
                        className="pl-8 bg-card"
                    />
                </div>
                <PositionFormDialog availableRoles={rolesList} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {positions.map((pos: any) => (
                    <Link key={pos._id} href={`/dashboard/positions/${pos.slug}`}>
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-border">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {pos.name}
                                </CardTitle>
                                {pos.isStoreSpecific ? (
                                    <Badge variant="secondary">Store</Badge>
                                ) : (
                                    <Badge variant="outline">Global</Badge>
                                )}
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">Lvl {pos.level || 0}</div>
                                <p className="text-xs text-muted-foreground">
                                    Click to view details and employees
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
                {positions.length === 0 && (
                    <div className="col-span-full">
                        <EmptyState
                            title="No positions found"
                            description="Get started by creating your first position hierarchy."
                            icon={Briefcase}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
