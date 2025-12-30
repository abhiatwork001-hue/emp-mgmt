import { getPositionById, getPositionBySlug, getEmployeesInPosition } from "@/lib/actions/position.actions";
import { getAllRoles } from "@/lib/actions/role.actions";
import { PositionFormDialog } from "@/components/positions/position-form-dialog";
import { PositionEmployeesList } from "@/components/positions/position-employees-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Shield } from "lucide-react";
import { Link } from "@/i18n/routing";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { getLocalized } from "@/lib/utils";

export default async function PositionDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const [position, roles, t, locale] = await Promise.all([
        getPositionBySlug(slug),
        getAllRoles(),
        getTranslations("Common"),
        getLocale()
    ]);

    if (!position) {
        redirect("/dashboard/positions");
    }

    const employees = await getEmployeesInPosition(position._id);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/positions">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">
                        {getLocalized(position, "name", locale)}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">Level {position.level || 0}</Badge>
                        {position.isStoreSpecific && <Badge variant="secondary">Store Specific</Badge>}
                        {position.isDepartmentSpecific && <Badge variant="secondary">Dept. Specific</Badge>}
                        {!position.isStoreSpecific && !position.isDepartmentSpecific && <Badge variant="default">HQ / Global</Badge>}
                    </div>
                </div>
                <PositionFormDialog
                    position={position}
                    availableRoles={roles}
                    trigger={
                        <Button variant="outline">
                            <Edit className="mr-2 h-4 w-4" /> {t('edit')}
                        </Button>
                    }
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="glass shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" /> Functional Capabilities
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {position.permissions && position.permissions.length > 0 ? (
                                position.permissions.map((perm: string) => (
                                    <Badge key={perm} variant="secondary" className="bg-primary/5 text-primary border-primary/20 capitalize px-3 py-1">
                                        {perm.replace(/_/g, " ")}
                                    </Badge>
                                ))
                            ) : (
                                <span className="text-sm text-muted-foreground italic">No specific functions assigned.</span>
                            )}
                        </div>

                        {position.roles && position.roles.length > 0 && (
                            <div className="mt-6 pt-6 border-t">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Inherited Roles</p>
                                <div className="flex flex-wrap gap-2">
                                    {position.roles.map((role: any) => (
                                        <Badge key={role._id} variant="outline" className="text-[10px] font-medium">
                                            {role.name}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <PositionEmployeesList employees={employees} />
            </div>
        </div>
    );
}
