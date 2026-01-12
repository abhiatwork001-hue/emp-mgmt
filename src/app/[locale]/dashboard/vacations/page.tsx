import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllVacationRequests, approveVacationRequest, rejectVacationRequest } from "@/lib/actions/vacation.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Calendar, User, Clock } from "lucide-react";
import { toast } from "sonner";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

// Since we are in app directory, we can use server components but for interactivity like toast/actions 
// strictly speaking the list usually needs client interactivity or we use server forms. 
// For simplicity and speed in this "admin" view, let's make a Client Component wrapper 
// or just use form actions if we want to stay server-side. 
// However, the cleanest way in Next 14 is often Client Components for tables with actions.
// Let's make the Page server-side fetching data, and a Client Component for the List.

import { VacationRequestList } from "@/components/vacations/vacation-request-list";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { AdminRecordVacationDialog } from "@/components/vacations/admin-record-vacation-dialog";
import { YearSelector } from "@/components/layout/year-selector";

import { getEmployeeById } from "@/lib/actions/employee.actions";

import { getAllStores } from "@/lib/actions/store.actions";
import { getAllGlobalDepartments } from "@/lib/actions/department.actions";
import { getAllAbsenceRequests } from "@/lib/actions/absence.actions";

export default async function VacationsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
    const { year } = await searchParams;
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const employee = await getEmployeeById((session.user as any).id);
    const roles = (employee?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
    const ALLOWED_ROLES = ["store_manager", "store_department_head", "department_head", "admin", "owner", "super_user", "hr", "tech"];
    if (!roles.some((r: string) => ALLOWED_ROLES.includes(r))) {
        redirect("/dashboard");
    }

    let storeIdFilter = undefined;
    let deptIdFilter = undefined;
    const isDeptHeadGlobal = roles.includes("department_head");
    const isStoreLevel = roles.some((r: string) => ["store_manager", "store_department_head"].includes(r));
    const isGlobalLevel = roles.some((r: string) => ["admin", "owner", "super_user", "hr", "tech"].includes(r));

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
    const t = await getTranslations("Dashboard.vacations");

    // Parallel fetch for data
    const [requests, stores, departments, absences] = await Promise.all([
        getAllVacationRequests({ storeId: storeIdFilter, storeDepartmentId: deptIdFilter, year: currentYear }),
        getAllStores(),
        getAllGlobalDepartments(),
        getAllAbsenceRequests({ storeId: storeIdFilter, storeDepartmentId: deptIdFilter, year: currentYear })
    ]);

    const pendingCount = requests.filter((r: any) => r.status === 'pending').length;
    const approvedCount = requests.filter((r: any) => r.status === 'approved').length;

    const isGlobal = roles.some((r: string) => ["owner", "admin", "hr", "tech", "super_user"].includes(r));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                    <p className="text-muted-foreground font-medium">{t('subtitle')}</p>
                </div>

                {isGlobal && (
                    <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-lg border border-border/50 h-10 px-3">
                        <YearSelector currentYear={currentYear} />
                    </div>
                )}
            </div>

            {isGlobal && <AdminRecordVacationDialog />}

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-[#1e293b] border-none text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('pendingRequests')}</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingCount}</div>
                    </CardContent>
                </Card>
                <Card className="bg-[#1e293b] border-none text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('approvedThisYear')}</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{approvedCount}</div>
                    </CardContent>
                </Card>
                {/* Stats Card can be added here */}
            </div>

            <VacationRequestList
                initialRequests={requests}
                stores={stores}
                departments={departments}
                initialAbsences={absences}
            />
        </div>
    );
}
