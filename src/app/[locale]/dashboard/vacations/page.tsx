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
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { AdminRecordVacationDialog } from "@/components/vacations/admin-record-vacation-dialog";
import { YearSelector } from "@/components/layout/year-selector";

import { getEmployeeById } from "@/lib/actions/employee.actions";

export default async function VacationsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
    const { year } = await searchParams;
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const employee = await getEmployeeById((session.user as any).id);
    const roles = (employee?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
    // Vacations Management Page: Likely only for HR, Admin, Managers, Heads.
    const ALLOWED_ROLES = ["store_manager", "store_department_head", "department_head", "admin", "owner", "super_user", "hr"];
    if (!roles.some((r: string) => ALLOWED_ROLES.includes(r))) {
        redirect("/dashboard");
    }

    // Determine strict scope
    let storeIdFilter = undefined;
    const isStoreLevel = roles.some((r: string) => ["store_manager", "store_department_head"].includes(r));
    const isGlobalLevel = roles.some((r: string) => ["admin", "owner", "super_user", "hr", "department_head"].includes(r));

    if (!isGlobalLevel && isStoreLevel) {
        storeIdFilter = (employee.storeId?._id || employee.storeId)?.toString();
    }

    const currentYear = year ? parseInt(year) : new Date().getFullYear();
    const requests = await getAllVacationRequests({ storeId: storeIdFilter, year: currentYear });

    // Calculate basic stats
    const pendingCount = requests.filter((r: any) => r.status === 'pending').length;
    const approvedCount = requests.filter((r: any) => r.status === 'approved').length;

    // Role-based visibility
    const isGlobal = roles.some((r: string) => ["owner", "admin", "hr", "tech", "super_user"].includes(r));
    const isManager = roles.includes("store_manager");

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Vacations</h1>
                    <p className="text-muted-foreground font-medium">Manage and review employee vacation requests.</p>
                </div>

                {isGlobal && (
                    <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-lg border border-border/50 h-10 px-3">
                        <YearSelector currentYear={currentYear} />
                    </div>
                )}
            </div>
            {/* Admin Tools */}
            <AdminRecordVacationDialog />

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
