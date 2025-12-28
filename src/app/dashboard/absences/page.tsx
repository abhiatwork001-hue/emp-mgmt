import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllAbsenceRequests } from "@/lib/actions/absence.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, History } from "lucide-react";
import { AbsenceRequestList } from "@/components/absences/absence-request-list";
import { ReportAbsenceDialog } from "@/components/absences/report-absence-dialog";

export default async function AbsencesPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const requests = await getAllAbsenceRequests();

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
