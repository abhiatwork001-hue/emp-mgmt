
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEmployeeById } from "@/lib/actions/employee.actions";
import { PositionHistoryList } from "@/components/employees/position-history-list";
import { ProfileView } from "@/components/employees/profile-view";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Briefcase, Calendar, Palmtree, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ProfileVacationTab } from "@/components/employees/profile-vacation-tab";
import { ProfileAbsenceTab } from "@/components/employees/profile-absence-tab";
import { getAllVacationRequests } from "@/lib/actions/vacation.actions";
import { ProfileWorkTab } from "@/components/employees/profile-work-tab";
import { getAllAbsenceRequests } from "@/lib/actions/absence.actions";
import { getTranslations } from "next-intl/server";

export default async function ProfilePage() {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
        redirect("/login");
    }

    const employee = await getEmployeeById(userId);

    // Calculate tenure if joinedOn exists
    const joinedYear = employee.joinedOn ? new Date(employee.joinedOn).getFullYear() : null;
    const currentYear = new Date().getFullYear();
    const tenure = joinedYear ? `${currentYear - joinedYear} Years` : "New Joiner";

    // Fetch requests for tabs
    const vacationRequests = await getAllVacationRequests({ employeeId: userId });
    const absenceRequests = await getAllAbsenceRequests({ employeeId: userId });

    const t = await getTranslations("Profile");
    const tc = await getTranslations("Common");

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
            {/* Header Profile Card */}
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center mb-10 bg-muted/50 p-6 rounded-2xl border border-border backdrop-blur-sm">
                <Avatar className="h-24 w-24 border-4 border-zinc-900 shadow-xl">
                    <AvatarImage src={employee.image} alt={employee.firstName} />
                    <AvatarFallback className="text-2xl bg-blue-700 text-white font-bold">
                        {employee.firstName?.[0]}{employee.lastName?.[0]}
                    </AvatarFallback>
                </Avatar>

                <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-3xl font-bold text-white tracking-tight">
                            {employee.firstName} {employee.lastName}
                        </h1>
                        {employee.active ? (
                            <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 bg-emerald-400/10">{tc("active")}</Badge>
                        ) : (
                            <Badge variant="destructive">{tc("inactive")}</Badge>
                        )}
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                            {employee.storeId?.name || "Global / HQ"}
                        </Badge>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
                        <div className="flex items-center gap-1.5">
                            <Briefcase className="w-4 h-4 text-zinc-500" />
                            <span>{employee.positionId?.name || "No Position"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-zinc-500" />
                            <span>{t("tenure", { date: employee.joinedOn ? new Date(employee.joinedOn).toLocaleDateString() : "N/A", tenure: joinedYear ? `${currentYear - joinedYear} ${tc("history")}` : t("newJoiner") })}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 lg:w-[750px] mb-8 bg-muted/50 p-1 border border-border h-auto">
                    <TabsTrigger value="personal" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span className="hidden sm:inline">{t("personal")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        <span className="hidden sm:inline">{t("history")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="vacations" className="flex items-center gap-2">
                        <Palmtree className="w-4 h-4" />
                        <span className="hidden sm:inline">{t("vacations")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="absences" className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">{t("absences")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="work" className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="hidden sm:inline">Work</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                    <div className="bg-muted/30 border border-border rounded-xl p-6 sm:p-8 shadow-sm">
                        <ProfileView employee={employee} />
                    </div>
                </TabsContent>

                <TabsContent value="history" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                    <div className="bg-muted/30 border border-border rounded-xl p-6 sm:p-8 shadow-sm">
                        <div className="mb-8 pl-4">
                            <h2 className="text-xl font-semibold text-white">{t("positionHistory")}</h2>
                            <p className="text-sm text-muted-foreground">{t("positionHistoryDescription")}</p>
                        </div>
                        <PositionHistoryList history={employee.positionHistory || []} />
                    </div>
                </TabsContent>

                <TabsContent value="vacations" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                    <div className="bg-muted/30 border border-border rounded-xl p-6 sm:p-8 shadow-sm">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-white">{t("vacationOverview")}</h2>
                            <p className="text-sm text-muted-foreground">{t("vacationOverviewDescription")}</p>
                        </div>
                        <ProfileVacationTab employee={employee} vacationRequests={vacationRequests} currentUserRoles={(session?.user as any)?.roles} />
                    </div>
                </TabsContent>

                <TabsContent value="absences" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                    <div className="bg-muted/30 border border-border rounded-xl p-6 sm:p-8 shadow-sm">
                        <ProfileAbsenceTab absenceRequests={absenceRequests} />
                    </div>
                </TabsContent>

                <TabsContent value="work" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                    <div className="bg-muted/30 border border-border rounded-xl p-6 sm:p-8 shadow-sm">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-white">Work History & Stats</h2>
                            <p className="text-sm text-muted-foreground">Detailed view of your worked periods and calculated billables.</p>
                        </div>
                        <ProfileWorkTab employee={employee} currentUserRoles={(session?.user as any)?.roles} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
