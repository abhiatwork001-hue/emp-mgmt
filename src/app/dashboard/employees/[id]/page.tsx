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
import { RequestVacationDialog } from "@/components/vacations/request-vacation-dialog";
import { ReportAbsenceDialog } from "@/components/absences/report-absence-dialog";
import { format } from "date-fns";

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
            <h2 className="text-3xl font-bold tracking-tight text-white mb-6">Employee Management</h2>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* Left Sidebar: Profile Card */}
                <div className="md:col-span-4 lg:col-span-3 space-y-6">
                    <Card className="bg-[#1e293b] border-none text-white overflow-hidden">
                        <CardContent className="pt-8 flex flex-col items-center text-center">
                            <Avatar className="h-24 w-24 border-4 border-[#0f172a] mb-4">
                                <AvatarImage src={employee.image} alt={employee.firstName} />
                                <AvatarFallback className="bg-zinc-700 text-3xl font-bold text-white">
                                    {employee.firstName?.[0]}{employee.lastName?.[0]}
                                </AvatarFallback>
                            </Avatar>
                            <h3 className="text-xl font-bold">{employee.firstName} {employee.lastName}</h3>
                            <div className="mt-2 text-zinc-400 font-medium">{employee.positionId?.name || "No Position"}</div>
                            <div className="mt-2">
                                {employee.active ? (
                                    <Badge className="bg-white text-black hover:bg-zinc-200">Active</Badge>
                                ) : (
                                    <Badge className="bg-red-500 text-white border-0">Terminated</Badge>
                                )}
                            </div>

                            <div className="w-full mt-8 space-y-6 text-left">
                                {/* Contact Info */}
                                <div>
                                    <h4 className="text-sm font-semibold text-zinc-500 mb-3">Contact Information</h4>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-zinc-400">Email:</span>
                                            <span className="text-white text-right truncate max-w-[180px]">{employee.email}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-400">Phone:</span>
                                            <span className="text-white text-right">{employee.phone || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-400">Address:</span>
                                            <span className="text-white text-right truncate max-w-[150px]">{employee.address || "N/A"}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-zinc-800" />

                                {/* Personal Info */}
                                <div>
                                    <h4 className="text-sm font-semibold text-zinc-500 mb-3">Personal Information</h4>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-zinc-400">NIF:</span>
                                            <span className="text-white text-right">{employee.nif || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-400">Date of Birth:</span>
                                            <span className="text-white text-right">{employee.dob ? format(new Date(employee.dob), "MMM dd, yyyy") : "N/A"}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-zinc-800" />

                                {/* Work Info */}
                                <div>
                                    <h4 className="text-sm font-semibold text-zinc-500 mb-3">Work Information</h4>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-zinc-400">Store:</span>
                                            <span className="text-white text-right">{employee.storeId?.name || "No Store Assigned"}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-zinc-400">Departments:</span>
                                            <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700">
                                                {employee.storeDepartmentId?.name || "No Dept"}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-zinc-400">Type:</span>
                                            <Badge variant="outline" className="text-zinc-300 border-zinc-700">{employee.contract?.employmentType || "Contracted"}</Badge>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-zinc-400">Weekly Hours:</span>
                                            <span className="text-white text-right">{employee.contract?.weeklyHours || 40}h</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-zinc-400">Working Days:</span>
                                            <div className="text-right">
                                                <span className="text-white block">{employee.contract?.workingDays?.length || 5} days/week</span>
                                                <span className={`text-[10px] ${employee.contract?.vacationAllowed !== false ? "text-emerald-400" : "text-zinc-500"}`}>
                                                    {employee.contract?.vacationAllowed !== false ? "Vacation Allowed" : "No Vacation"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-zinc-800" />

                                {/* Banking Info */}
                                <div>
                                    <h4 className="text-sm font-semibold text-zinc-500 mb-3">Banking Information</h4>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between items-start">
                                            <span className="text-zinc-400 shrink-0">Bank:</span>
                                            <span className="text-white text-right break-words max-w-[180px]">{employee.bankName || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-400">IBAN:</span>
                                            <span className="text-white text-right truncate max-w-[150px]">{employee.iban || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-400">Country:</span>
                                            <span className="text-white text-right">{employee.country || "N/A"}</span>
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
                        <div className="bg-[#1e293b] rounded-lg p-1">
                            <TabsList className="w-full bg-transparent justify-start h-auto p-0">
                                <TabsTrigger value="position_history" className="flex-1 data-[state=active]:bg-[#0f172a] data-[state=active]:text-white py-3 rounded-md text-zinc-400">
                                    <Briefcase className="mr-2 h-4 w-4" /> Position History
                                </TabsTrigger>
                                <TabsTrigger value="vacation" className="flex-1 data-[state=active]:bg-[#0f172a] data-[state=active]:text-white py-3 rounded-md text-zinc-400">
                                    <Calendar className="mr-2 h-4 w-4" /> Vacation
                                </TabsTrigger>
                                <TabsTrigger value="absences" className="flex-1 data-[state=active]:bg-[#0f172a] data-[state=active]:text-white py-3 rounded-md text-zinc-400">
                                    <Clock className="mr-2 h-4 w-4" /> Absences
                                </TabsTrigger>
                                <TabsTrigger value="schedule" className="flex-1 data-[state=active]:bg-[#0f172a] data-[state=active]:text-white py-3 rounded-md text-zinc-400">
                                    <FileText className="mr-2 h-4 w-4" /> Schedule
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="mt-6">
                            <TabsContent value="position_history">
                                <Card className="bg-[#1e293b] border-none text-white">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Position History</CardTitle>
                                        <p className="text-sm text-zinc-400">Career progression within the company</p>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="relative pl-6 border-l border-zinc-700 ml-4 space-y-8">
                                            {/* Historic Positions */}
                                            {(employee.positionHistory || []).slice().reverse().map((hist: any, idx: number) => (
                                                <div key={idx} className="relative">
                                                    <div className="absolute -left-[31px] bg-[#1e293b] p-1">
                                                        <div className={`h-3 w-3 rounded-full ring-4 ring-[#1e293b] ${!hist.to ? "bg-white" : "bg-zinc-600"}`} />
                                                    </div>
                                                    <div className={`p-4 rounded-lg border border-zinc-800 ${!hist.to ? "bg-[#0f172a]" : "bg-[#0f172a] opacity-70"}`}>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h4 className="font-bold text-lg">{hist.positionId?.name || "Role"}</h4>
                                                            <Badge variant={!hist.to ? "default" : "outline"} className={!hist.to ? "bg-white text-black hover:bg-zinc-200" : "text-zinc-400 border-zinc-700"}>
                                                                {!hist.to ? "Current" : "Previous"}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-zinc-400 text-sm flex items-center gap-2 mb-1">
                                                            <Briefcase className="h-3 w-3" /> {hist.storeDepartmentId?.name || "No Department recorded"}
                                                        </div>
                                                        <div className="text-zinc-500 text-xs flex items-center gap-2">
                                                            <Calendar className="h-3 w-3" />
                                                            {format(new Date(hist.from), "MMM dd, yyyy")} - {hist.to ? format(new Date(hist.to), "MMM dd, yyyy") : "Present"}
                                                        </div>
                                                        {hist.reason && (
                                                            <div className="mt-2 text-xs text-zinc-400 italic">
                                                                Reason: {hist.reason}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            {(!employee.positionHistory || employee.positionHistory.length === 0) && (
                                                <div className="text-sm text-zinc-500 italic ml-2">No position history recorded.</div>
                                            )}

                                            {/* Fallback current info if history is explicitly empty but they have a position now */}
                                            {/* Note: Ideally current position should be the last open entry in history. If history is missing, we show current from profile */}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="vacation">
                                <Card className="bg-[#1e293b] border-none text-white">
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle className="text-lg">Vacation Details</CardTitle>
                                            <p className="text-sm text-zinc-400">Vacation allowance and history</p>
                                        </div>
                                        <RequestVacationDialog
                                            employeeId={employee._id.toString()}
                                            remainingDays={employee.vacationTracker?.remainingDays || 22}
                                        />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="bg-[#0f172a] rounded-lg p-6 border border-zinc-800 mb-6">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-medium">Vacation Summary ({new Date().getFullYear()})</span>
                                            </div>
                                            <div className="flex justify-between text-sm text-zinc-400 mb-1">
                                                <span>Used: {employee.vacationTracker?.usedDays || 0} days</span>
                                                <span>Remaining: {employee.vacationTracker?.remainingDays || 22} days</span>
                                            </div>
                                            {/* Progress Bar */}
                                            <div className="h-2 bg-zinc-700 rounded-full overflow-hidden mb-2">
                                                <div
                                                    className="h-full bg-blue-500 transition-all duration-500"
                                                    style={{ width: `${Math.min(((employee.vacationTracker?.usedDays || 0) / (employee.vacationTracker?.defaultDays || 22)) * 100, 100)}%` }}
                                                />
                                            </div>
                                            {employee.vacationTracker?.pendingRequests > 0 && (
                                                <div className="text-xs text-amber-500 font-medium mt-1">
                                                    {employee.vacationTracker.pendingRequests} days pending approval
                                                </div>
                                            )}
                                        </div>

                                        <h4 className="text-sm font-semibold text-zinc-500 mb-4">Past & Upcoming Vacations</h4>

                                        <div className="space-y-4">
                                            {employee.vacations && employee.vacations.length > 0 ? (
                                                employee.vacations.map((vac: any) => (
                                                    <div key={vac._id} className="bg-[#0f172a] p-4 rounded-lg border border-zinc-800 flex justify-between items-center">
                                                        <div>
                                                            <div className="font-medium text-white flex items-center gap-2">
                                                                <Calendar className="h-4 w-4 text-zinc-400" />
                                                                {format(new Date(vac.from), "MMM dd, yyyy")} - {format(new Date(vac.to), "MMM dd, yyyy")}
                                                            </div>
                                                            <div className="text-xs text-zinc-500 mt-1">
                                                                {vac.totalDays} Total Days
                                                            </div>
                                                        </div>
                                                        <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                                                            {vac.year}
                                                        </Badge>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-8 text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                                                    No vacation records found.
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="absences">
                                <Card className="bg-[#1e293b] border-none text-white">
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle className="text-lg">Absence Records</CardTitle>
                                            <p className="text-sm text-zinc-400">History of all absence events</p>
                                        </div>
                                        <ReportAbsenceDialog employeeId={employee._id.toString()} />
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {employee.absences && employee.absences.length > 0 ? (
                                            employee.absences.map((abs: any) => (
                                                <div key={abs._id} className="bg-[#0f172a] rounded-lg border border-zinc-800 overflow-hidden">
                                                    <div className={`h-1 ${abs.approvedBy ? "bg-emerald-500" : "bg-red-500"}`} />
                                                    <div className="p-4">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className="font-medium text-white">{abs.reason || "Unspecified Absence"}</h4>
                                                                <p className="text-xs text-zinc-500">{format(new Date(abs.date), "MMM dd, yyyy")}</p>
                                                            </div>
                                                            <Badge className={abs.approvedBy ? "bg-white text-black hover:bg-zinc-200 text-xs" : "bg-red-500 text-white border-0 text-xs hover:bg-red-600"}>
                                                                {abs.approvedBy ? "Approved" : "Pending/Unexcused"}
                                                            </Badge>
                                                        </div>
                                                        {abs.shiftRef && (
                                                            <div className="mt-2 text-sm text-zinc-400">
                                                                <span className="block text-zinc-500 text-xs uppercase mb-0.5">Shift:</span>
                                                                {abs.shiftRef.shiftName || "Unknown Shift"}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
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
