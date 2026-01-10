import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEmployeeById } from "@/lib/actions/employee.actions";
import { redirect } from "next/navigation";
import { TemplateBuilder } from "@/components/evaluations/template-builder";
import { EvaluationAssignmentDialog } from "@/components/evaluations/evaluation-assignment-dialog";
import { ManagerEvaluationList } from "@/components/evaluations/manager-evaluation-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getAllAssignments } from "@/lib/actions/evaluation.actions";

export default async function EvaluationsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const employee = await getEmployeeById((session.user as any).id);
    if (!employee) redirect("/login");

    const roles = employee.roles || [];
    const isHR = roles.includes("hr") || roles.includes("admin") || roles.includes("owner") || roles.includes("tech");
    const isManager = roles.includes("store_manager") || roles.includes("manager");

    // Fetch HR data if applicable
    const allAssignments = isHR ? await getAllAssignments() : [];

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Evaluations & Surveys</h1>
                    <p className="text-muted-foreground">Manage and conduct internal staff evaluations.</p>
                </div>
                {isHR && <EvaluationAssignmentDialog />}
            </div>

            <Tabs defaultValue={isHR ? "manage" : "tasks"}>
                <TabsList>
                    {isHR && <TabsTrigger value="manage">Manage Templates & Status</TabsTrigger>}
                    {(isManager || isHR) && <TabsTrigger value="tasks">My Tasks</TabsTrigger>}
                    {/* Future: <TabsTrigger value="results">Reports & Results</TabsTrigger> */}
                </TabsList>

                {isHR && (
                    <TabsContent value="manage" className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Left: Template Builder */}
                            <TemplateBuilder />

                            {/* Right: Active Assignments */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Active Assignments</CardTitle>
                                    <CardDescription>Overview of distributed evaluations.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {allAssignments.length === 0 ? (
                                            <p className="text-muted-foreground text-sm">No active assignments.</p>
                                        ) : (
                                            allAssignments.map((a: any) => (
                                                <div key={a._id} className="flex justify-between items-center border-b pb-2 last:border-0">
                                                    <div>
                                                        <p className="font-medium">{a.templateId?.title}</p>
                                                        <p className="text-xs text-muted-foreground">{a.storeId?.name} • Assigned to {a.assignedTo?.firstName}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-sm font-bold">{a.responseCount || 0}</span>
                                                        <p className="text-xs text-muted-foreground">Responses</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                )}

                <TabsContent value="tasks">
                    <ManagerEvaluationList />
                </TabsContent>
            </Tabs>
        </div>
    );
}
