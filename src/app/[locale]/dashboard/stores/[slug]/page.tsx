import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStoreBySlug } from "@/lib/actions/store.actions";
import { getEmployeesByStore, getStoreEmployeesWithTodayStatus } from "@/lib/actions/employee.actions";
import { getStoreDepartments } from "@/lib/actions/store-department.actions";
import { AddDepartmentDialog } from "@/components/stores/add-department-dialog";
import { AssignEmployeeDialog } from "@/components/stores/assign-employee-dialog";
import { ManageStoreManagersDialog } from "@/components/stores/manage-store-managers-dialog";
import { RemoveStoreEmployeeButton } from "@/components/stores/remove-store-employee-button";
import { StoreEmployeesList } from "@/components/stores/store-employees-list";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, Trash, Mail, MapPin, Phone, Building2, Users, Calendar as CalendarIcon, Layers } from "lucide-react";
import { Link } from "@/i18n/routing";
import { StoreDepartmentsListClient } from "@/components/stores/store-departments-list-client";
import { RemoveStoreManagerButton } from "@/components/stores/remove-store-manager-button";
import { CreateScheduleDialog } from "@/components/schedules/create-schedule-dialog";
import { CredentialManager } from "@/components/credentials/credential-list";


export default async function StoreDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const { slug } = await params;
    const store = await getStoreBySlug(slug);

    if (!store) {
        return <div>Store not found</div>;
    }

    const storeId = store._id.toString();
    const currentUser = await import("@/lib/actions/employee.actions").then(m => m.getEmployeeById((session.user as any).id));
    const userRoles = (currentUser?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));

    // Permission Logic
    const isGlobalAdmin = userRoles.some((r: string) => ["admin", "owner", "super_user", "hr"].includes(r));
    const isStoreManager = userRoles.includes("store_manager");

    // "employee and storeDepartmentHead should not see the edit store Button"
    // "storeManager... cannot edit employee... or add employee... and manage team"
    const canEditStore = isGlobalAdmin; // Store Managers restricted to View Only

    // "storeManager... cannot assign manager to the store"
    const canManageManagers = isGlobalAdmin;

    // "employee, storeManager and storeDepartmentHead cannot edit employee... or add employee... and manage team"
    const canManageEmployees = isGlobalAdmin;

    // Credentials: "none can add storeCredentials for the store, just the manager... hr, tech, admin, owner"
    // Clarification: Request said "just the manager" BUT later "storeManager... cannot add".
    // "but storeManager, storeDepartmentHead can see... hr, tech, admin and owner can edit and see"
    const canEditCredentials = isGlobalAdmin; // Tech/Admin/Owner/HR

    const employees = await getStoreEmployeesWithTodayStatus(storeId);
    const storeDepartments = await getStoreDepartments(storeId);

    return (
        <div className="space-y-6">
            {/* Header */}
            {/*             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/dashboard/stores" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                            <span>←</span> Back to Stores
                        </Link>
                    </Button>
                </div>
            </div> */}

            {/* Title Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">{store.name}</h2>
                    <p className="text-muted-foreground">Store Profile & Management</p>
                </div>
                <div className="flex items-center gap-2">
                    {canEditStore && (
                        <Button variant="default" asChild>
                            <a href={`/dashboard/stores/${store.slug}/edit`}>
                                <Edit className="mr-2 h-4 w-4" /> Edit Store
                            </a>
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Content Grid - 3 columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Store Information (2 cols on large screens) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Store Information Card */}
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-3 pb-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Store Information</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-sm font-medium text-muted-foreground">Store Name</span>
                                    <p className="font-semibold">{store.name}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-sm font-medium text-muted-foreground">Manager</span>
                                    <p className="font-semibold">
                                        {store.managers && store.managers.length > 0
                                            ? `${store.managers[0].firstName} ${store.managers[0].lastName}`
                                            : "Not assigned"}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <span className="text-sm font-medium text-muted-foreground">Address</span>
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <p className="font-medium">{store.address || "N/A"}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-sm font-medium text-muted-foreground">Phone</span>
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <p className="font-medium">+1 (555) 123-4567</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-sm font-medium text-muted-foreground">Status</span>
                                    {store.active ? (
                                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">active</Badge>
                                    ) : (
                                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">inactive</Badge>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Departments Section */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                                    <Layers className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <CardTitle className="text-lg">Departments</CardTitle>
                            </div>
                            <Link href={`/dashboard/schedules`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                <CalendarIcon className="h-4 w-4" />
                                Show Schedule
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <StoreDepartmentsListClient storeDepartments={storeDepartments} storeSlug={store.slug} storeId={store._id.toString()} />
                        </CardContent>
                    </Card>

                    {/* Employees Section */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                                    <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Employees</CardTitle>
                                    <p className="text-sm text-muted-foreground">{employees.length} total</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <StoreEmployeesList storeId={store._id} employees={employees} canManage={canManageEmployees} departments={storeDepartments} currentUserRoles={userRoles} />
                        </CardContent>
                    </Card>

                    {/* Credentials Section */}
                    <CredentialManager storeId={store._id.toString()} userId={(session.user as any).id} canEdit={canEditCredentials} />
                </div>

                {/* Right Column - Quick Stats & Quick Actions */}
                <div className="space-y-6">
                    {/* Quick Stats */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Quick Stats</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Total Employees</span>
                                    <span className="text-2xl font-bold">{store.employees?.length || 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Departments</span>
                                    <span className="text-2xl font-bold">{storeDepartments.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Active Schedules</span>
                                    <span className="text-2xl font-bold">-</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button variant="outline" className="w-full justify-start" asChild>
                                <Link href="/dashboard/schedules">
                                    <CalendarIcon className="mr-2 h-4 w-4 text-blue-600" />
                                    View All Schedules
                                </Link>
                            </Button>
                            {canManageEmployees && (
                                <Button variant="outline" className="w-full justify-start" asChild>
                                    <Link href={`#employees`}>
                                        <Users className="mr-2 h-4 w-4 text-emerald-600" />
                                        Manage Employees
                                    </Link>
                                </Button>
                            )}
                            <Button variant="outline" className="w-full justify-start" asChild>
                                <Link href="/dashboard/absences">
                                    <CalendarIcon className="mr-2 h-4 w-4 text-purple-600" />
                                    View Absences
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Management Card */}
                    {canManageManagers && (
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">Management</CardTitle>
                                    <ManageStoreManagersDialog
                                        storeId={store._id}
                                        storeName={store.name}
                                        managers={store.managers || []}
                                        subManagers={store.subManagers || []}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Store Managers */}
                                <div className="space-y-2">
                                    <span className="text-xs text-muted-foreground uppercase font-semibold">Store Manager</span>
                                    {store.managers && store.managers.length > 0 ? (
                                        <div className="space-y-2">
                                            {store.managers.map((manager: any) => (
                                                <div key={manager._id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold overflow-hidden border">
                                                        {manager.image ? (
                                                            <img src={manager.image} alt={manager.firstName} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <span>{manager.firstName?.[0]}{manager.lastName?.[0]}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{manager.firstName} {manager.lastName}</p>
                                                        <p className="text-xs text-muted-foreground truncate">{manager.email}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground italic py-2">No manager assigned</p>
                                    )}
                                </div>

                                {/* Sub-Managers */}
                                {store.subManagers && store.subManagers.length > 0 && (
                                    <div className="space-y-2 pt-2 border-t">
                                        <span className="text-xs text-muted-foreground uppercase font-semibold">Sub-Managers</span>
                                        <div className="space-y-2">
                                            {store.subManagers.map((subManager: any) => (
                                                <div key={subManager._id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold overflow-hidden border">
                                                        {subManager.image ? (
                                                            <img src={subManager.image} alt={subManager.firstName} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <span>{subManager.firstName?.[0]}{subManager.lastName?.[0]}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{subManager.firstName} {subManager.lastName}</p>
                                                        <p className="text-xs text-muted-foreground truncate">{subManager.email}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Remove Tabs Section - content is now integrated above */}
        </div >
    );
}
