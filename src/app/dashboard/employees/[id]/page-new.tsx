import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEmployeeById } from "@/lib/actions/employee.actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Edit, Mail, Phone, MapPin, Building2, Calendar, FileText, Clock, CreditCard } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmployeeScheduleTab } from "@/components/employees/employee-schedule-tab";
import { EditEmployeeDialog } from "@/components/employees/edit-employee-dialog";

export default async function EmployeeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const { id } = await params;
    const employee = await getEmployeeById(id);

    if (!employee) {
        return <div>Employee not found</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6">Employee Management</h2>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* Left Sidebar: Profile Card */}
                <div className="md:col-span-4 lg:col-span-3 space-y-6">
                    <Card className="bg-card border overflow-hidden">
                        <CardContent className="pt-8 flex flex-col items-center text-center">
                            <Avatar className="h-24 w-24 border-4 border-border mb-4">
                                <AvatarImage src={employee.image} alt={employee.firstName} />
                                <AvatarFallback className="bg-muted text-3xl font-bold text-foreground">
                                    {employee.firstName?.[0]}{employee.lastName?.[0]}
                                </AvatarFallback>
                            </Avatar>
                            <h3 className="text-xl font-bold text-foreground">{employee.firstName} {employee.lastName}</h3>
                            <div className="mt-2 text-muted-foreground font-medium">{employee.positionId?.name || "No Position"}</div>
                            <div className="mt-2">
                                {employee.active ? (
                                    <Badge>Active</Badge>
                                ) : (
                                    <Badge variant="destructive">Terminated</Badge>
                                )}
                            </div>

                            <div className="w-full mt-8 space-y-6 text-left">
                                {/* Contact Info */}
                                <div>
                                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">Contact Information</h4>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Email:</span>
                                            <span className="text-foreground text-right truncate max-w-[180px]">{employee.email}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Phone:</span>
                                            <span className="text-foreground text-right">{employee.phone || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Address:</span>
                                            <span className="text-foreground text-right truncate max-w-[150px]">{employee.address || "N/A"}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-border" />

                                {/* Personal Info */}
                                <div>
                                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">Personal Information</h4>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">NIF:</span>
                                            <span className="text-foreground text-right">{employee.nif || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Date of Birth:</span>
                                            <span className="text-foreground text-right">{employee.dob ? new Date(employee.dob).toLocaleDateString() : "N/A"}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-border" />

                                {/* Work Info */}
                                <div>
                                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">Work Information</h4>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Store:</span>
                                            <span className="text-foreground text-right">{employee.storeId?.name || "No Store Assigned"}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Departments:</span>
                                            <Badge variant="secondary">
                                                {employee.storeDepartmentId?.name || "No Dept"}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Type:</span>
                                            <Badge variant="outline">{employee.contract?.employmentType || "Contracted"}</Badge>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Weekly Hours:</span>
                                            <span className="text-foreground text-right">{employee.contract?.weeklyHours || 40}h</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Working Days:</span>
                                            <div className="text-right">
                                                <span className="text-foreground block">{employee.contract?.workingDays?.length || 5} days/week</span>
                                                <span className={`text-[10px] ${employee.contract?.vacationAllowed !== false ? "text-emerald-500" : "text-muted-foreground"}`}>
                                                    {employee.contract?.vacationAllowed !== false ? "Vacation Allowed" : "No Vacation"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-border" />

                                {/* Banking Info */}
                                <div>
                                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">Banking Information</h4>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between items-start">
                                            <span className="text-muted-foreground shrink-0">Bank:</span>
                                            <span className="text-foreground text-right break-words max-w-[180px]">{employee.bankName || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">IBAN:</span>
                                            <span className="text-foreground text-right truncate max-w-[150px]">{employee.iban || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Country:</span>
                                            <span className="text-foreground text-right">{employee.country || "N/A"}</span>
                                        </div>
                                    </div>
                                </div>

                                <EditEmployeeDialog employee={employee} />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Content: Tabs */}
                <div className="md:col-span-8 lg:col-span-9">
                    <Tabs defaultValue="position_history" className="w-full">
                        <div className="bg-card rounded-lg p-1 border">
                            <TabsList className="w-full bg-transparent justify-start h-auto p-0">
                                <TabsTrigger value="position_history" className="flex-1 data-[state=active]:bg-accent py-3 rounded-md">
                                    <Briefcase className="mr-2 h-4 w-4" /> Position History
                                </TabsTrigger>
                                <TabsTrigger value="vacation" className="flex-1 data-[state=active]:bg-accent py-3 rounded-md">
                                    <Calendar className="mr-2 h-4 w-4" /> Vacation
                                </TabsTrigger>
                                <TabsTrigger value="absences" className="flex-1 data-[state=active]:bg-accent py-3 rounded-md">
                                    <Clock className="mr-2 h-4 w-4" /> Absences
                                </TabsTrigger>
                                <TabsTrigger value="schedule" className="flex-1 data-[state=active]:bg-accent py-3 rounded-md">
                                    <FileText className="mr-2 h-4 w-4" /> Schedule
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="mt-6">
                            <TabsContent value="position_history">
                                <Card className="bg-card border">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Position History</CardTitle>
                                        <p className="text-sm text-muted-foreground">Career progression within the company</p>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="relative pl-6 border-l ml-4 space-y-8">
                                            {/* Historic Positions */}
                                            {(employee.positionHistory || []).slice().reverse().map((hist: any, idx: number) => (
                                                <div key={idx} className="relative">
                                                    <div className="absolute -left-[31px] bg-card p-1">
                                                        <div className={`h-3 w-3 rounded-full ring-4 ring-card ${!hist.to ? "bg-primary" : "bg-muted"}`} />
                                                    </div>
                                                    <div className={`p-4 rounded-lg border ${!hist.to ? "bg-accent/50" : "bg-muted/30"}`}>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h4 className="font-bold text-lg text-foreground">{hist.positionId?.name || "Role"}</h4>
                                                            <Badge variant={!hist.to ? "default" : "outline"}>
                                                                {!hist.to ? "Current" : "Previous"}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-muted-foreground text-sm flex items-center gap-2 mb-1">
                                                            <Briefcase className="h-3 w-3" /> {hist.storeDepartmentId?.name || "No Department recorded"}
                                                        </div>
                                                        <div className="text-muted-foreground text-xs flex items-center gap-2">
                                                            <Calendar className="h-3 w-3" />
                                                            {new Date(hist.from).toLocaleDateString()} - {hist.to ? new Date(hist.to).toLocaleDateString() : "Present"}
                                                        </div>
                                                        {hist.reason && (
                                                            <div className="mt-2 text-xs text-muted-foreground italic">
                                                                Reason: {hist.reason}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            {(!employee.positionHistory || employee.positionHistory.length === 0) && (
                                                <div className="text-sm text-muted-foreground italic ml-2">No position history recorded.</div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="vacation">
                                <Card className="bg-card border">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Vacation Details</CardTitle>
                                        <p className="text-sm text-muted-foreground">Vacation allowance and history</p>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="bg-muted/50 rounded-lg p-6 border mb-6">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-medium text-foreground">Vacation Summary ({new Date().getFullYear()})</span>
                                            </div>
                                            <div className="flex justify-between text-sm text-muted-foreground mb-1">
                                                <span>Used: {employee.vacationTracker?.usedDays || 0} days</span>
                                                <span>Remaining: {employee.vacationTracker?.remainingDays || 22} days</span>
                                            </div>
                                            {/* Progress Bar */}
                                            <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                                                <div
                                                    className="h-full bg-blue-500 transition-all duration-500"
                                                    style={{ width: `${Math.min(((employee.vacationTracker?.usedDays || 0) / (employee.vacationTracker?.defaultDays || 22)) * 100, 100)}%` }}
                                                />
                                            </div>
                                            <div className="text-xs text-right text-muted-foreground">Total: {employee.vacationTracker?.defaultDays || 22} days</div>
                                        </div>

                                        <h4 className="text-sm font-semibold text-muted-foreground mb-4">Past & Upcoming Vacations</h4>

                                        <div className="space-y-4">
                                            {employee.vacations && employee.vacations.length > 0 ? (
                                                employee.vacations.map((vac: any) => (
                                                    <div key={vac._id} className="bg-muted/50 p-4 rounded-lg border flex justify-between items-center">
                                                        <div>
                                                            <div className="font-medium text-foreground flex items-center gap-2">
                                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                                {new Date(vac.from).toLocaleDateString()} - {new Date(vac.to).toLocaleDateString()}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground mt-1">
                                                                {vac.totalDays} Total Days
                                                            </div>
                                                        </div>
                                                        <Badge variant="outline">
                                                            {vac.year}
                                                        </Badge>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                                                    No vacation records found.
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="absences">
                                <Card className="bg-card border">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Absence Records</CardTitle>
                                        <p className="text-sm text-muted-foreground">History of all absence events</p>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {employee.absences && employee.absences.length > 0 ? (
                                            employee.absences.map((abs: any) => (
                                                <div key={abs._id} className="bg-muted/50 rounded-lg border overflow-hidden">
                                                    <div className={`h-1 ${abs.approvedBy ? "bg-emerald-500" : "bg-red-500"}`} />
                                                    <div className="p-4">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className="font-medium text-foreground">{abs.reason || "Unspecified Absence"}</h4>
                                                                <p className="text-xs text-muted-foreground">{new Date(abs.date).toLocaleDateString()}</p>
                                                            </div>
                                                            <Badge className={abs.approvedBy ? "text-xs" : "bg-red-500 text-white border-0 text-xs hover:bg-red-600"}>
                                                                {abs.approvedBy ? "Approved" : "Pending/Unexcused"}
                                                            </Badge>
                                                        </div>
                                                        {abs.shiftRef && (
                                                            <div className="mt-2 text-sm text-muted-foreground">
                                                                <span className="block text-muted-foreground text-xs uppercase mb-0.5">Shift:</span>
                                                                {abs.shiftRef.shiftName || "Unknown Shift"}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                                                No absence records found.
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="schedule">
                                <EmployeeScheduleTab employeeId={employee._id.toString()} />
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}

function Briefcase(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
    )
}
