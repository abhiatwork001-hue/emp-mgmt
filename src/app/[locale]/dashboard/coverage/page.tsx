import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getEmployeeById } from "@/lib/actions/employee.actions";
import { getCoverageRequests, getActiveOngoingActions } from "@/lib/actions/coverage.actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, Clock, User, ArrowRight, ListTodo, Search, History } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AcceptOfferButton } from "./accept-offer-button";
import { Briefcase } from "lucide-react";

export default async function CoverageDashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const employee = await getEmployeeById((session.user as any).id);
    const roles = (employee?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));

    // Check access
    const PRIVILEGED_ROLES = ["admin", "hr", "owner", "tech", "super_user"];
    const isPrivileged = roles.some((r: string) => PRIVILEGED_ROLES.includes(r));

    // For Privileged Users: Show Management Tabs
    if (isPrivileged) {
        const requests = await getCoverageRequests();
        const newRequests = requests.filter((r: any) => r.status === 'pending_hr' && !r.acceptedBy);
        const activeSearches = requests.filter((r: any) => r.status === 'seeking_coverage');
        const needsFinalization = requests.filter((r: any) => (r.status === 'pending_hr' || r.status === 'seeking_coverage') && r.acceptedBy);
        const completed = requests.filter((r: any) => r.status === 'covered');

        return (
            <div className="space-y-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight">Shift Coverage</h1>
                    <p className="text-muted-foreground">Manage absence requests and assign coverage.</p>
                </div>

                <Tabs defaultValue="new" className="space-y-6">
                    <TabsList className="bg-muted/50 p-1">
                        <TabsTrigger value="new" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
                            New Requests ({newRequests.length})
                        </TabsTrigger>
                        <TabsTrigger value="active" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Search className="h-4 w-4 mr-2 text-blue-500" />
                            Seeking ({activeSearches.length})
                        </TabsTrigger>
                        <TabsTrigger value="finalization" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <ListTodo className="h-4 w-4 mr-2 text-green-500" />
                            Finalization ({needsFinalization.length})
                        </TabsTrigger>
                        <TabsTrigger value="history" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <History className="h-4 w-4 mr-2 text-muted-foreground" />
                            Recently Covered
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="new" className="space-y-4">
                        {newRequests.length === 0 && (
                            <Card className="border-dashed">
                                <CardContent className="py-10 text-center">
                                    <p className="text-sm text-muted-foreground italic">No new requests requiring action.</p>
                                </CardContent>
                            </Card>
                        )}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {newRequests.map((req: any) => (
                                <RequestCard key={req._id} request={req} statusLabel="Needs Action" statusColor="text-red-500 bg-red-500/10" />
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="active" className="space-y-4">
                        {activeSearches.length === 0 && (
                            <Card className="border-dashed">
                                <CardContent className="py-10 text-center">
                                    <p className="text-sm text-muted-foreground italic">No active coverage searches currently.</p>
                                </CardContent>
                            </Card>
                        )}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {activeSearches.map((req: any) => (
                                <RequestCard key={req._id} request={req} statusLabel="Seeking Coverage" statusColor="text-blue-500 bg-blue-500/10" />
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="finalization" className="space-y-4">
                        {needsFinalization.length === 0 && (
                            <Card className="border-dashed">
                                <CardContent className="py-10 text-center">
                                    <p className="text-sm text-muted-foreground italic">No requests waiting for final review.</p>
                                </CardContent>
                            </Card>
                        )}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {needsFinalization.map((req: any) => (
                                <RequestCard key={req._id} request={req} statusLabel="Review Needed" statusColor="text-green-500 bg-green-500/10" />
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="history" className="space-y-4">
                        {completed.length === 0 && (
                            <Card className="border-dashed">
                                <CardContent className="py-10 text-center">
                                    <p className="text-sm text-muted-foreground italic">No historical records found.</p>
                                </CardContent>
                            </Card>
                        )}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {completed.slice(0, 12).map((req: any) => (
                                <RequestCard key={req._id} request={req} statusLabel="Covered" statusColor="text-emerald-500 bg-emerald-500/10" />
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        );
    }

    // For Employees: Show Available Offers
    const ongoing = await getActiveOngoingActions((session.user as any).id);
    const offers = ongoing.coverageOffers || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight">Coverage Opportunities</h1>
                <p className="text-muted-foreground">Pick up available shifts for extra compensation.</p>
            </div>

            {offers.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                            <Briefcase className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-semibold text-lg">No offers right now</h3>
                            <p className="text-sm text-muted-foreground max-w-xs">We'll notify you when a shift becomes available in your department.</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {offers.map((o: any) => (
                        <Card key={o._id} className="group hover:border-primary/40 transition-all">
                            <CardHeader className="pb-3 border-b bg-muted/30">
                                <div className="flex justify-between items-center">
                                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                        Shift Offer
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase">
                                        Posted {format(new Date(o.createdAt), "MMM dd")}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <Clock className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">{format(new Date(o.originalShift.dayDate), "EEEE, MMM dd")}</p>
                                        <p className="text-xs text-muted-foreground">{o.originalShift.startTime} - {o.originalShift.endTime}</p>
                                    </div>
                                </div>

                                <div className="p-3 rounded-lg bg-muted/50 border border-border/50 text-xs">
                                    <p className="text-muted-foreground font-medium mb-1 uppercase tracking-wider">Reason for absence:</p>
                                    <p className="italic">"{o.reason}"</p>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <AcceptOfferButton requestId={o._id} userId={(session.user as any).id} />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

function RequestCard({ request, statusLabel, statusColor }: any) {
    const date = new Date(request.originalShift.dayDate);

    return (
        <Link href={`/dashboard/coverage/${request._id}`}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-l-4" style={{ borderLeftColor: statusLabel.includes("Review") ? '#22c55e' : statusLabel.includes("Action") ? '#ef4444' : '' }}>
                <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`${statusColor} border-0 capitalize`}>
                                {statusLabel}
                            </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {format(new Date(request.createdAt), 'MMM d')}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={request.originalEmployeeId?.image} />
                            <AvatarFallback>{request.originalEmployeeId?.firstName?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-sm font-medium">
                                {request.originalEmployeeId ? `${request.originalEmployeeId.firstName} ${request.originalEmployeeId.lastName}` : "Unknown Employee"}
                            </p>
                            <p className="text-xs text-red-400 font-medium">Out: {request.reason}</p>
                        </div>
                    </div>

                    <div className="bg-muted p-2 rounded text-xs space-y-1">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Date:</span>
                            <span className="font-medium">{format(date, 'EEE, MMM d')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Shift:</span>
                            <span className="font-medium">{request.originalShift.startTime} - {request.originalShift.endTime}</span>
                        </div>
                        {request.acceptedBy && (
                            <div className="pt-2 border-t mt-1 flex justify-between items-center text-green-500">
                                <span>Accepted By:</span>
                                <span className="font-bold">{request.acceptedBy.firstName}</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
