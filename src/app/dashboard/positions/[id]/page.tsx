import { getPositionById, getEmployeesInPosition } from "@/lib/actions/position.actions";
import { PositionFormDialog } from "@/components/positions/position-form-dialog";
import { PositionEmployeesList } from "@/components/positions/position-employees-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Shield } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function PositionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const position = await getPositionById(id);

    if (!position) {
        redirect("/dashboard/positions");
    }

    const employees = await getEmployeesInPosition(id);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/positions">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">{position.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">Level {position.level || 0}</Badge>
                        {position.isStoreSpecific ? (
                            <Badge variant="secondary">Store Specific</Badge>
                        ) : (
                            <Badge variant="default">HQ / Global</Badge>
                        )}
                    </div>
                </div>
                <PositionFormDialog
                    position={position}
                    trigger={
                        <Button variant="outline">
                            <Edit className="mr-2 h-4 w-4" /> Edit Position
                        </Button>
                    }
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Shield className="h-4 w-4" /> Permissions & Access
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-sm">
                            Permissions linked to this level:
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {position.permissions && position.permissions.length > 0 ? (
                                position.permissions.map((perm: string) => (
                                    <Badge key={perm} variant="secondary" className="font-mono text-xs">
                                        {perm}
                                    </Badge>
                                ))
                            ) : (
                                <span className="text-sm text-muted-foreground italic">No specific permissions defined or permissions are inherited from role level.</span>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <PositionEmployeesList employees={employees} />
            </div>
        </div>
    );
}
