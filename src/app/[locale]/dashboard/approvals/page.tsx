import { getPendingOvertimeRequests, respondToOvertimeRequest } from "@/lib/actions/overtime.actions";
import { getPendingVacationRequests, approveVacationRequest, rejectVacationRequest } from "@/lib/actions/vacation.actions";
import { getPendingAbsenceRequests, approveAbsenceRequest, rejectAbsenceRequest } from "@/lib/actions/absence.actions";
import { getPendingSchedules } from "@/lib/actions/schedule.actions";
import { getUserSession } from "@/lib/actions/auth.actions";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Clock, AlertCircle, Palmtree, CalendarDays } from "lucide-react";
import { ApprovalsList } from "./approvals-list";

export default async function ApprovalsPage() {
    const session = await getUserSession();
    if (!session) redirect("/login");

    const isApprover = (session.roles || []).some((r: string) => {
        const normalized = r.toLowerCase().replace(/ /g, "_");
        return ["owner", "hr", "admin", "super_user"].includes(normalized);
    });
    if (!isApprover) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
                <p className="text-muted-foreground">You do not have permission to view approvals.</p>
            </div>
        );
    }

    const [overtime, vacations, absences, schedules] = await Promise.all([
        getPendingOvertimeRequests(),
        getPendingVacationRequests(),
        getPendingAbsenceRequests(),
        getPendingSchedules()
    ]);

    const totalPending = overtime.length + vacations.length + absences.length + schedules.length;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Pending Approvals</h1>
                        <p className="text-muted-foreground">Manage pending requests from employees across all stores.</p>
                    </div>
                    {totalPending > 0 && (
                        <Badge variant="destructive" className="text-lg px-4 py-1">
                            {totalPending} Pending
                        </Badge>
                    )}
                </div>
            </div>

            <Tabs defaultValue="schedules" className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
                    <TabsTrigger value="schedules" className="gap-2">
                        Schedules
                        {schedules.length > 0 && <Badge variant="secondary" className="px-1.5 py-0.5 text-xs">{schedules.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="overtime" className="gap-2">
                        Overtime
                        {overtime.length > 0 && <Badge variant="secondary" className="px-1.5 py-0.5 text-xs">{overtime.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="vacations" className="gap-2">
                        Vacations
                        {vacations.length > 0 && <Badge variant="secondary" className="px-1.5 py-0.5 text-xs">{vacations.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="absences" className="gap-2">
                        Absences
                        {absences.length > 0 && <Badge variant="secondary" className="px-1.5 py-0.5 text-xs">{absences.length}</Badge>}
                    </TabsTrigger>
                </TabsList>

                {/* Schedules Tab */}
                <TabsContent value="schedules" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarDays className="h-5 w-5 text-blue-500" />
                                Schedule Approvals
                            </CardTitle>
                            <CardDescription>Weekly schedules waiting for review and publishing.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ApprovalsList type="schedule" items={schedules} currentUserId={session.userId} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Overtime Tab */}
                <TabsContent value="overtime" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-orange-500" />
                                Overtime Requests
                            </CardTitle>
                            <CardDescription>Extra hours requested outside scheduled shifts.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ApprovalsList type="overtime" items={overtime} currentUserId={session.userId} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Vacations Tab */}
                <TabsContent value="vacations" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Palmtree className="h-5 w-5 text-emerald-500" />
                                Vacation Requests
                            </CardTitle>
                            <CardDescription>Requested time off (Status: Pending).</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ApprovalsList type="vacation" items={vacations} currentUserId={session.userId} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Absences Tab */}
                <TabsContent value="absences" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-red-500" />
                                Absence Requests
                            </CardTitle>
                            <CardDescription>Reported absences requiring justification review.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ApprovalsList type="absence" items={absences} currentUserId={session.userId} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
