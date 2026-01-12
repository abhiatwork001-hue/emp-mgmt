import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllAbsenceRequests } from "@/lib/actions/absence.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, History } from "lucide-react";
import { AbsenceRequestList } from "@/components/absences/absence-request-list";
import { ReportAbsenceDialog } from "@/components/absences/report-absence-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { getEmployeeById } from "@/lib/actions/employee.actions";
import { YearSelector } from "@/components/layout/year-selector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AbsenceCalendarView } from "@/components/absences/absence-calendar-view";

export default async function AbsencesPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
    const { year } = await searchParams;
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const employee = await getEmployeeById((session.user as any).id);
    const roles = (employee?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
    const ALLOWED_ROLES = ["store_manager", "store_department_head", "department_head", "admin", "owner", "super_user", "hr"];
    if (!roles.some((r: string) => ALLOWED_ROLES.includes(r))) {
        redirect("/dashboard");
    }

    let storeIdFilter = undefined;
    let deptIdFilter = undefined;
    const isDeptHeadGlobal = roles.includes("department_head");
    const isStoreLevel = roles.some((r: string) => ["store_manager", "store_department_head"].includes(r));
    const isGlobalLevel = roles.some((r: string) => ["admin", "owner", "super_user", "hr"].includes(r));

    if (!isGlobalLevel) {
        if (isDeptHeadGlobal) {
            const { GlobalDepartment, StoreDepartment } = await import("@/lib/models");
            const ledGlobalDepts = await GlobalDepartment.find({ departmentHead: employee._id }).select('_id');
            const ledGlobalDeptIds = ledGlobalDepts.map((d: any) => d._id);
            const storeDepts = await StoreDepartment.find({ globalDepartmentId: { $in: ledGlobalDeptIds } }).select('_id');
            deptIdFilter = { $in: storeDepts.map((sd: any) => sd._id.toString()) };
        } else if (isStoreLevel) {
            storeIdFilter = (employee.storeId?._id || employee.storeId)?.toString();
            if (!storeIdFilter) storeIdFilter = "000000000000000000000000";

            if (roles.includes("store_department_head")) {
                deptIdFilter = (employee.storeDepartmentId?._id || employee.storeDepartmentId)?.toString();
                if (!deptIdFilter) deptIdFilter = "000000000000000000000000";
            }
        } else {
            storeIdFilter = "000000000000000000000000";
        }
    }

    const currentYear = year ? parseInt(year) : new Date().getFullYear();
    const requests = await getAllAbsenceRequests({ storeId: storeIdFilter, storeDepartmentId: deptIdFilter, year: currentYear });

    const pendingCount = requests.filter((r: any) => r.status === 'pending').length;
    const historyCount = requests.filter((r: any) => r.status !== 'pending').length;

    const isGlobal = roles.some((r: string) => ["owner", "admin", "hr", "tech", "super_user"].includes(r));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Absence Management</h1>
                    <p className="text-zinc-400">Track and manage employee absences.</p>
                </div>

                {isGlobal && (
                    <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-lg border border-border/50 h-10 px-3">
                        <YearSelector currentYear={currentYear} />
                    </div>
                )}

                <ReportAbsenceDialog />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-[#1e293b] border-none text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingCount}</div>
                    </CardContent>
                </Card>
                <Card className="bg-[#1e293b] border-none text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Records</CardTitle>
                        <History className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{requests.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="calendar" className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <TabsList>
                        <TabsTrigger value="calendar">Calendar View</TabsTrigger>
                        <TabsTrigger value="list">List View</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="calendar" className="mt-0">
                    <AbsenceCalendarView requests={requests} />
                </TabsContent>

                <TabsContent value="list" className="mt-0">
                    <AbsenceRequestList initialRequests={requests} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
