
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEmployeeById } from "@/lib/actions/employee.actions";
import { PositionHistoryList } from "@/components/employees/position-history-list";
import { ProfileView } from "@/components/employees/profile-view";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Briefcase, Calendar, Palmtree, AlertCircle, Settings, Coins } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ProfileVacationTab } from "@/components/employees/profile-vacation-tab";
import { ProfileAbsenceTab } from "@/components/employees/profile-absence-tab";
import { getAllVacationRequests } from "@/lib/actions/vacation.actions";
import { ProfileWorkTab } from "@/components/employees/profile-work-tab";
import { getAllAbsenceRequests } from "@/lib/actions/absence.actions";
import { ProfileTipsTab } from "@/components/employees/profile-tips-tab"; // Added
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
                <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 md:grid-cols-7 mb-8 bg-muted/50 p-2 sm:p-2 border border-border h-auto gap-2">
                    <TabsTrigger value="personal" className="flex items-center justify-center gap-2 py-2">
                        <User className="w-4 h-4" />
                        <span className="hidden lg:inline">{t("personal")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center justify-center gap-2 py-2">
                        <Briefcase className="w-4 h-4" />
                        <span className="hidden lg:inline">{t("history")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="vacations" className="flex items-center justify-center gap-2 py-2">
                        <Palmtree className="w-4 h-4" />
                        <span className="hidden lg:inline">{t("vacations")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="absences" className="flex items-center justify-center gap-2 py-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="hidden lg:inline">{t("absences")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="work" className="flex items-center justify-center gap-2 py-2">
                        <Calendar className="w-4 h-4" />
                        <span className="hidden lg:inline">Work</span>
                    </TabsTrigger>
                    <TabsTrigger value="tips" className="flex items-center justify-center gap-2 py-2">
                        <Coins className="w-4 h-4" />
                        <span className="hidden lg:inline">Tips</span>
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex items-center justify-center gap-2 py-2">
                        <Settings className="w-4 h-4" />
                        <span className="hidden lg:inline">{tc("settings")}</span>
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
                        <ProfileAbsenceTab absenceRequests={absenceRequests} employeeId={userId} />
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

                <TabsContent value="tips" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                    <div className="bg-muted/30 border border-border rounded-xl p-6 sm:p-8 shadow-sm">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-white">Tips History</h2>
                            <p className="text-sm text-muted-foreground">Detailed view of your allocated tips and payment status.</p>
                        </div>
                        <ProfileTipsTab employeeId={userId} />
                    </div>
                </TabsContent>

                <TabsContent value="settings" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                    <div className="bg-muted/30 border border-border rounded-xl p-6 sm:p-8 shadow-sm">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-white">{tc("settings")}</h2>
                            <p className="text-sm text-muted-foreground">Manage your personal account settings and data privacy.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="p-4 border border-border rounded-lg bg-background/50">
                                <h3 className="text-lg font-medium text-foreground mb-2">Data Privacy & Portability</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    You have the right to access a copy of your personal data stored in our system.
                                    Click below to download a ZIP archive containing your profile, schedules, absences, and documents.
                                </p>
                                <a
                                    href="/api/user/export"
                                    download
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium transition-colors"
                                >
                                    Export My Data
                                </a>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
