import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGlobalDepartmentBySlug } from "@/lib/actions/department.actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssignGlobalDepartmentHeadDialog } from "@/components/departments/assign-global-department-head-dialog";
import { Edit, Trash, Building2, Users, Plus } from "lucide-react";
import { RemoveGlobalDepartmentHeadButton } from "@/components/departments/remove-global-department-head-button";
import { GlobalDepartmentLeadership } from "@/components/departments/global-department-leadership";
import { TestNotificationButton } from "@/components/test-notification-button";

export default async function DepartmentDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const { slug } = await params;
    const department = await getGlobalDepartmentBySlug(slug);

    if (!department) {
        return <div>Department not found</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" asChild>
                        <a href="/dashboard/departments">{"<"}</a>
                    </Button>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">{department.name}</h2>
                    {department.active ? (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-0">Active</Badge>
                    ) : (
                        <Badge className="bg-red-500/10 text-red-500 border-0">Inactive</Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" asChild>
                        <a href={`/dashboard/departments/${department.slug}/edit`}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </a>
                    </Button>
                    <Button variant="destructive">
                        <Trash className="mr-2 h-4 w-4" /> Delete
                    </Button>
                    <TestNotificationButton />
                </div>
            </div>

            {/* Info Card */}
            <Card className="bg-card border-border text-card-foreground">
                <CardHeader>
                    <CardTitle className="text-lg">Global Department Information</CardTitle>
                    <p className="text-sm text-muted-foreground">Information about this department across all stores</p>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <span className="text-sm text-muted-foreground">Department Name</span>
                            <p className="font-medium">{department.name}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-sm text-muted-foreground">Total Stores</span>
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <p className="font-medium">{department.storeCount || 0} stores</p>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-sm text-muted-foreground">Description</span>
                            <p className="text-sm text-foreground/80">{department.description || "No description available"}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-sm text-muted-foreground">Total Employees</span>
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <p className="font-medium">{department.employeeCount || 0} employees</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Management Section */}
            <Card className="bg-card border-border text-card-foreground">
                <CardHeader>
                    <CardTitle className="text-lg">Global Department Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <GlobalDepartmentLeadership
                        departmentId={department._id}
                        departmentName={department.name}
                        departmentHeads={department.departmentHead}
                        subHeads={department.subHead}
                    />

                    {/* Department Employees */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="font-medium">Department Employees</p>
                                <p className="text-sm text-muted-foreground">{department.employeeCount || 0} employees assigned across all stores</p>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            {department.employees && department.employees.length > 0 ? (
                                department.employees.map((emp: any) => (
                                    <div key={emp._id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border hover:border-sidebar-ring transition">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold overflow-hidden border border-border">
                                                {emp.image ? (
                                                    <img src={emp.image} alt={emp.firstName} className="h-full w-full object-cover" />
                                                ) : (
                                                    <span>{emp.firstName?.[0]}{emp.lastName?.[0]}</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{emp.firstName} {emp.lastName}</p>
                                                <p className="text-xs text-muted-foreground">{emp.email}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-1">
                                            <Badge variant="outline" className="border-border text-muted-foreground">
                                                {emp.positionId?.name || "No Position"}
                                            </Badge>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Building2 className="h-3 w-3" />
                                                <span>{emp.storeId?.name || "Unknown Store"}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground italic py-4">No employees assigned to this department in any store.</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
