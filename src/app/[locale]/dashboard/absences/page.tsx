import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllAbsenceRequests } from "@/lib/actions/absence.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, History } from "lucide-react";
import { AbsenceRequestList } from "@/components/absences/absence-request-list";
import { ReportAbsenceDialog } from "@/components/absences/report-absence-dialog";

import { getEmployeeById } from "@/lib/actions/employee.actions";

export default async function AbsencesPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const employee = await getEmployeeById((session.user as any).id);
    const roles = (employee?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
    const ALLOWED_ROLES = ["store_manager", "store_department_head", "department_head", "admin", "owner", "super_user", "hr"];
    if (!roles.some((r: string) => ALLOWED_ROLES.includes(r))) {
        redirect("/dashboard");
    }

    let storeIdFilter = undefined;
    const isStoreLevel = roles.some((r: string) => ["store_manager", "store_department_head"].includes(r));
    const isGlobalLevel = roles.some((r: string) => ["admin", "owner", "super_user", "hr", "department_head"].includes(r));

    if (!isGlobalLevel && isStoreLevel) {
        storeIdFilter = (employee.storeId?._id || employee.storeId)?.toString();
    }

    const requests = await getAllAbsenceRequests({ storeId: storeIdFilter });

    const pendingCount = requests.filter((r: any) => r.status === 'pending').length;
    const historyCount = requests.filter((r: any) => r.status !== 'pending').length;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight text-white">Absence Management</h2>
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

            <AbsenceRequestList initialRequests={requests} />
        </div>
    );
}
