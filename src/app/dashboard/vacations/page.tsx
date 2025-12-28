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

// Since we are in app directory, we can use server components but for interactivity like toast/actions 
// strictly speaking the list usually needs client interactivity or we use server forms. 
// For simplicity and speed in this "admin" view, let's make a Client Component wrapper 
// or just use form actions if we want to stay server-side. 
// However, the cleanest way in Next 14 is often Client Components for tables with actions.
// Let's make the Page server-side fetching data, and a Client Component for the List.

import { VacationRequestList } from "@/components/vacations/vacation-request-list";
import { AdminRecordVacationDialog } from "@/components/vacations/admin-record-vacation-dialog";

export default async function VacationsPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const requests = await getAllVacationRequests();

    // Calculate basic stats
    const pendingCount = requests.filter((r: any) => r.status === 'pending').length;
    const approvedCount = requests.filter((r: any) => r.status === 'approved').length;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-[#1e293b] p-6 rounded-lg border border-zinc-800">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Vacation Management</h1>
                    <p className="text-zinc-400">Overview of all vacation requests</p>
                </div>
                {/* Admin Tools */}
                <AdminRecordVacationDialog />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-[#1e293b] border-none text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingCount}</div>
                    </CardContent>
                </Card>
                <Card className="bg-[#1e293b] border-none text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Approved This Year</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{approvedCount}</div>
                    </CardContent>
                </Card>
            </div>

            <VacationRequestList initialRequests={requests} />
        </div>
    );
}
