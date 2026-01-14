import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllAbsenceRequests, approveAbsenceRequest, rejectAbsenceRequest } from "@/lib/actions/absence.actions";
import { getAbsenceAnalytics } from "@/lib/actions/analytics/absence-analytics.actions";
import { AbsenceAnalytics } from "@/components/dashboard/absences/absence-analytics";
import { getAllStores } from "@/lib/actions/store.actions";
import { getAllGlobalDepartments } from "@/lib/actions/department.actions";
import { getAllVacationRequests } from "@/lib/actions/vacation.actions";
import { getEmployeeById } from "@/lib/actions/employee.actions";
import { YearSelector } from "@/components/layout/year-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, History } from "lucide-react";
import { AbsenceRequestList } from "@/components/absences/absence-request-list";
import { ReportAbsenceDialog } from "@/components/absences/report-absence-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AbsenceCalendarView } from "@/components/absences/absence-calendar-view";
import { getTranslations } from "next-intl/server";

export default async function AbsencesPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
    const { year } = await searchParams;
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const employee = await getEmployeeById((session.user as any).id);
    const rawRoles = (employee?.roles || []);
    const roles = rawRoles.map((r: string) => r.toLowerCase().replace(/ /g, "_").replace(/manager/g, "_manager").replace(/head/g, "_head").replace(/__/g, "_"));

    // Normalize commonly used checks
    const hasRole = (r: string) => roles.some((role: string) => role.includes(r));

    const ALLOWED_ROLES = ["store_manager", "store_department_head", "department_head", "admin", "owner", "super_user", "hr", "tech"];
    if (!roles.some((r: string) => ALLOWED_ROLES.includes(r)) && !hasRole("manager")) {
        redirect("/dashboard");
    }

    let storeIdFilter: any = undefined;
    let deptIdFilter: any = undefined;

    const isGlobalLevel = roles.some((r: string) => ["admin", "owner", "super_user", "hr", "tech"].includes(r));
    const isDeptHeadGlobal = roles.includes("department_head");
    const isStoreLevel = roles.some((r: string) => ["store_manager", "store_department_head"].includes(r)) || hasRole("manager");

    if (!isGlobalLevel) {
        const deptIds: string[] = [];

        if (isDeptHeadGlobal) {
            const { GlobalDepartment, StoreDepartment } = await import("@/lib/models");
            const ledGlobalDepts = await GlobalDepartment.find({ departmentHead: employee._id }).select('_id');
            const ledGlobalDeptIds = ledGlobalDepts.map((d: any) => d._id);
            if (ledGlobalDeptIds.length > 0) {
                const storeDepts = await StoreDepartment.find({ globalDepartmentId: { $in: ledGlobalDeptIds } }).select('_id');
                storeDepts.forEach((sd: any) => deptIds.push(sd._id.toString()));
            }
        }

        if (isStoreLevel) {
            const currentStoreId = (employee.storeId?._id || employee.storeId)?.toString();
            if (roles.includes("store_manager") || hasRole("manager")) {
                const { getStoreManagedByUser } = await import("@/lib/actions/store.actions");
                const managedStoreId = await getStoreManagedByUser(employee._id);
                storeIdFilter = managedStoreId || currentStoreId;
            } else {
                storeIdFilter = currentStoreId;
            }

            // Store Department Head
            if (roles.includes("store_department_head") && !roles.includes("store_manager") && !hasRole("manager")) {
                const sdId = (employee.storeDepartmentId?._id || employee.storeDepartmentId)?.toString();
                if (sdId) deptIds.push(sdId);
            }
        }

        // Finalize filters
        if (deptIds.length > 0) {
            deptIdFilter = deptIds.length === 1 ? deptIds[0] : { $in: deptIds };
        }

        // Fallback for storeId if strictly store-level but somehow missing
        if (isStoreLevel && !storeIdFilter) {
            storeIdFilter = "000000000000000000000000";
        }

        // If they have NO filters set but are NOT global, they should see nothing (dummy)
        if (!storeIdFilter && !deptIdFilter) {
            storeIdFilter = "000000000000000000000000";
        }
    }

    const currentYear = year ? parseInt(year) : new Date().getFullYear();
    const t = await getTranslations("Dashboard.absences");

    const [requests, analytics, stores, departments, vacations] = await Promise.all([
        getAllAbsenceRequests({ storeId: storeIdFilter, storeDepartmentId: deptIdFilter, year: currentYear }),
        getAbsenceAnalytics({ storeId: storeIdFilter, storeDepartmentId: deptIdFilter, year: currentYear }),
        getAllStores(),
        getAllGlobalDepartments(),
        getAllVacationRequests({ storeId: storeIdFilter, storeDepartmentId: deptIdFilter, year: currentYear, status: 'approved' })
    ]);

    const isGlobal = roles.some((r: string) => ["owner", "admin", "hr", "tech", "super_user"].includes(r));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Absence Management</h1>
                    <p className="text-muted-foreground font-medium">Track and manage employee absences and coverage.</p>
                </div>

                <div className="flex items-center gap-3">
                    {isGlobal && (
                        <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-lg border border-border/50 h-10 px-3">
                            <YearSelector currentYear={currentYear} />
                        </div>
                    )}
                    <ReportAbsenceDialog />
                </div>
            </div>

            <Tabs defaultValue="calendar" className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <TabsList className="bg-muted/50 border">
                        <TabsTrigger value="calendar">Calendar View</TabsTrigger>
                        <TabsTrigger value="list">List View</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="calendar" className="mt-0">
                    <AbsenceCalendarView
                        requests={requests}
                        year={currentYear}
                        canManage={isGlobalLevel || isStoreLevel || isDeptHeadGlobal}
                        stores={stores}
                        departments={departments}
                        vacations={vacations}
                        key={currentYear}
                    />
                </TabsContent>

                <TabsContent value="list" className="mt-0">
                    <AbsenceRequestList initialRequests={requests} />
                </TabsContent>
            </Tabs>

            <Separator className="my-10" />

            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Analytics & Trends</h2>
                    <p className="text-muted-foreground text-sm font-medium">Deep dive into unit performance and absence patterns.</p>
                </div>
                <AbsenceAnalytics data={analytics} storeId={storeIdFilter?.toString()} />
            </div>
        </div>
    );
}
