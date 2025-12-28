import { getStoreDepartmentById } from "@/lib/actions/store-department.actions";
import { ArrowLeft, Edit, Trash2, MapPin, Users, Info, AlertCircle } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AssignStoreEmployeeToDepartmentDialog } from "@/components/stores/assign-store-employee-dialog";
import { RemoveStoreEmployeeButton } from "@/components/stores/remove-employee-button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ManageDepartmentHeadsDialog } from "@/components/stores/manage-department-heads-dialog";
import { EditStoreDepartmentDialog } from "@/components/stores/edit-store-department-dialog";
import { CreateScheduleDialog } from "@/components/schedules/create-schedule-dialog";
import { ViewScheduleButton } from "@/components/schedules/view-schedule-button";

interface PageProps {
    params: Promise<{
        storeId: string;
        departmentId: string;
    }>;
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getEmployeeById } from "@/lib/actions/employee.actions";

export default async function StoreDepartmentPage({ params }: PageProps) {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const { storeId, departmentId } = await params;

    const currentUser = await getEmployeeById((session.user as any).id);
    const userRoles = (currentUser?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));

    const isGlobalAdmin = userRoles.some((r: string) => ["admin", "owner", "super_user", "hr"].includes(r));
    const isStoreManager = userRoles.includes("store_manager");

    // "only storeManager can assign storeEmployee to storeDepartment"
    const canAssignEmployees = isGlobalAdmin || isStoreManager;
    const canManageDepartment = isGlobalAdmin || isStoreManager;
    const canManageHeads = isGlobalAdmin || isStoreManager;

    const department = await getStoreDepartmentById(departmentId);

    if (!department) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        Department not found
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-6">
                    <Link
                        href={`/dashboard/stores/${storeId}`}
                        className="p-2 rounded-full hover:bg-accent transition text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">{department.name}</h1>
                    <Badge variant={department.active ? "success" : "secondary"} className="ml-2">
                        {department.active ? "Active" : "Inactive"}
                    </Badge>
                </div>
                <div className="flex gap-2">
                    <ViewScheduleButton storeId={storeId} departmentId={departmentId} />
                    <CreateScheduleDialog storeId={storeId} preSelectedDepartmentId={departmentId} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content - Left Column */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Department Info Card */}
                    <div className="bg-card border rounded-xl p-6 shadow-sm">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-xl font-semibold text-foreground">Department Information</h2>
                            <div className="flex gap-2">
                                {canManageDepartment && <EditStoreDepartmentDialog department={department} />}
                                {canManageDepartment && (
                                    <Button variant="destructive" size="sm">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 mb-6">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Name</p>
                                <p className="font-medium text-foreground">{department.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Status</p>
                                <Badge variant="outline">
                                    {department.active ? "Active" : "Inactive"}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Parent Global Department</p>
                                <div className="flex items-center gap-2">
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                    <p className="font-medium text-foreground">
                                        {department.globalDepartmentId?.name || "N/A"}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Total Employees</p>
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <p className="font-medium text-foreground">{department.employees?.length || 0}</p>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-zinc-800 my-6" />

                        <div>
                            <p className="text-sm text-muted-foreground mb-2">Description</p>
                            <p className="text-foreground leading-relaxed">
                                {department.globalDepartmentId?.description || "No description provided for this department."}
                            </p>
                        </div>
                    </div>

                    {/* Employees List */}
                    <div className="bg-card border rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-foreground">Department Employees</h2>
                            {canAssignEmployees && (
                                <AssignStoreEmployeeToDepartmentDialog
                                    storeId={storeId}
                                    departmentId={departmentId}
                                    departmentName={department.name}
                                />
                            )}
                        </div>

                        <div className="space-y-4">
                            {department.employees?.length === 0 ? (
                                <p className="text-muted-foreground text-sm italic">No employees assigned to this department yet.</p>
                            ) : (
                                department.employees?.map((emp: any) => (
                                    <div key={emp._id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-foreground">
                                                {emp.firstName?.[0]}{emp.lastName?.[0]}
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">{emp.firstName} {emp.lastName}</p>
                                                <p className="text-sm text-muted-foreground">{emp.email}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center gap-2">
                                            <Badge variant="secondary">
                                                {emp.positionId?.name || "No Position"}
                                            </Badge>
                                            {canAssignEmployees && <RemoveStoreEmployeeButton departmentId={department._id} employeeId={emp._id} />}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar - Right Column */}
                <div className="space-y-8">
                    {/* Management Actions */}
                    <div className="bg-card border rounded-xl p-6 shadow-sm">
                        <h3 className="font-semibold mb-4 text-lg text-foreground">Department Management</h3>
                        {canManageHeads && (
                            <div className="space-y-3">
                                <ManageDepartmentHeadsDialog
                                    departmentId={department._id}
                                    departmentName={department.name}
                                    currentHeads={department.headOfDepartment || []}
                                    employees={department.employees || []}
                                    roleType="head"
                                />
                                <ManageDepartmentHeadsDialog
                                    departmentId={department._id}
                                    departmentName={department.name}
                                    currentHeads={department.subHead || []}
                                    employees={department.employees || []}
                                    roleType="subHead"
                                />
                            </div>
                        )}
                        {!canManageHeads && <p className="text-sm text-muted-foreground italic">You do not have permission to manage heads.</p>}
                    </div>

                    {/* Global Department Heads (Reference) */}
                    <div className="bg-card border rounded-xl p-6 shadow-sm">
                        <h3 className="font-semibold mb-4 text-lg text-foreground">Global Leadership</h3>
                        <div className="space-y-4">
                            {/* Global Head */}
                            <div className="space-y-2">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Global Head</span>
                                {department.globalDepartmentId?.departmentHead && department.globalDepartmentId.departmentHead.length > 0 ? (
                                    department.globalDepartmentId.departmentHead.map((head: any) => (
                                        <div key={head._id} className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                                                {head.image ? (
                                                    <img src={head.image} alt={head.firstName} className="h-full w-full object-cover" />
                                                ) : (
                                                    <span className="text-xs font-medium text-foreground">{head.firstName?.[0]}{head.lastName?.[0]}</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{head.firstName} {head.lastName}</p>
                                                <p className="text-xs text-muted-foreground">{head.email}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-muted-foreground italic">No global head assigned</p>
                                )}
                            </div>

                            <Separator className="bg-zinc-800" />

                            {/* Global Sub-Head */}
                            <div className="space-y-2">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Global Sub-Head</span>
                                {department.globalDepartmentId?.subHead && department.globalDepartmentId.subHead.length > 0 ? (
                                    department.globalDepartmentId.subHead.map((head: any) => (
                                        <div key={head._id} className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                                                {head.image ? (
                                                    <img src={head.image} alt={head.firstName} className="h-full w-full object-cover" />
                                                ) : (
                                                    <span className="text-xs font-medium text-foreground">{head.firstName?.[0]}{head.lastName?.[0]}</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{head.firstName} {head.lastName}</p>
                                                <p className="text-xs text-muted-foreground">{head.email}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-muted-foreground italic">No global sub-head assigned</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Store Department Key People */}
                    <div className="bg-card border rounded-xl p-6 shadow-sm">
                        <h3 className="font-semibold mb-4 text-lg text-foreground">Local Leadership</h3>
                        <div className="space-y-4">
                            {/* Local Head */}
                            <div className="space-y-2">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Department Head</span>
                                {department.headOfDepartment && department.headOfDepartment.length > 0 ? (
                                    department.headOfDepartment.map((head: any) => (
                                        <div key={head._id} className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                                                {head.image ? (
                                                    <img src={head.image} alt={head.firstName} className="h-full w-full object-cover" />
                                                ) : (
                                                    <span className="text-xs font-medium text-foreground">{head.firstName?.[0]}{head.lastName?.[0]}</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{head.firstName} {head.lastName}</p>
                                                <p className="text-xs text-muted-foreground">{head.email}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-muted-foreground italic">Not assigned</p>
                                )}
                            </div>

                            <Separator className="bg-zinc-800" />

                            {/* Local Sub-Head */}
                            <div className="space-y-2">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Sub-Head</span>
                                {department.subHead && department.subHead.length > 0 ? (
                                    department.subHead.map((head: any) => (
                                        <div key={head._id} className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                                                {head.image ? (
                                                    <img src={head.image} alt={head.firstName} className="h-full w-full object-cover" />
                                                ) : (
                                                    <span className="text-xs font-medium text-foreground">{head.firstName?.[0]}{head.lastName?.[0]}</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{head.firstName} {head.lastName}</p>
                                                <p className="text-xs text-muted-foreground">{head.email}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-muted-foreground italic">Not assigned</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
