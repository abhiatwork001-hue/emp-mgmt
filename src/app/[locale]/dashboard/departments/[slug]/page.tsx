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
import { GlobalDepartmentEmployeeList } from "@/components/departments/global-department-employee-list";

export default async function DepartmentDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const user = session.user as any;
    const { getEmployeeById } = await import("@/lib/actions/employee.actions");
    const employee = await getEmployeeById(user.id);
    const roles = (employee?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
    const canManage = roles.some((r: string) => ["admin", "owner", "hr", "tech", "super_user"].includes(r));
    const isDepartmentHead = roles.includes("department_head");

    const { slug } = await params;
    const department = await getGlobalDepartmentBySlug(slug);

    if (!department) {
        return <div>Department not found</div>;
    }

    // Authorization check: Allow if user can manage OR if they are a head of this department
    console.log("[DepartmentDetails] Employee ID:", employee._id.toString());
    console.log("[DepartmentDetails] Department Heads:", department.departmentHead);
    console.log("[DepartmentDetails] Is Department Head Role:", isDepartmentHead);

    const isHeadOfThisDepartment = isDepartmentHead && department.departmentHead?.some((head: any) => {
        const headId = head._id?.toString() || head.toString();
        console.log("[DepartmentDetails] Checking head ID:", headId, "against employee:", employee._id.toString());
        return headId === employee._id.toString();
    });

    console.log("[DepartmentDetails] Is Head of This Department:", isHeadOfThisDepartment);
    console.log("[DepartmentDetails] Can Manage:", canManage);

    if (!canManage && !isHeadOfThisDepartment) {
        console.log("[DepartmentDetails] Access denied, redirecting to dashboard");
        redirect("/dashboard");
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

                {canManage && (
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
                )}
            </div>

            {/* Info Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 bg-card border-border text-card-foreground">
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

                <Card className="bg-card border-border text-card-foreground">
                    <CardHeader>
                        <CardTitle className="text-lg">Store Locations</CardTitle>
                        <p className="text-sm text-muted-foreground">Stores where this department is active</p>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border">
                            {department.storeDepts?.map((sd: any) => (
                                <div key={sd._id} className="p-4 hover:bg-muted/30 transition-colors">
                                    <p className="font-bold text-sm tracking-tight">{sd.storeInfo?.name}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-medium">{sd.storeInfo?.address || "Main Branch"}</p>
                                </div>
                            ))}
                            {(!department.storeDepts || department.storeDepts.length === 0) && (
                                <div className="p-8 text-center bg-muted/5">
                                    <p className="text-xs font-medium text-muted-foreground italic">No stores found</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

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
                        canManage={canManage}
                    />

                    {/* Department Employees */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="font-medium">Department Employees</p>
                                <p className="text-sm text-muted-foreground">{department.employeeCount || 0} employees assigned across all stores</p>
                            </div>
                        </div>

                        <GlobalDepartmentEmployeeList employees={department.employees || []} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
