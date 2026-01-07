import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getShiftCoverageRequestById } from "@/lib/actions/coverage.actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { CheckCircle2, Clock, AlertTriangle, User, Calendar, FileText, Users } from "lucide-react";
import Link from "next/link";
import { InviteCandidatesForm } from "./invite-candidates-form-component";
import { FinalizeCoverageForm } from "./FinalizeCoverageForm";
import { ShiftCoverageRequest } from "@/lib/models"; // Direct import for model type if needed, or stick to loose typing for now
import dbConnect from "@/lib/db"; // Ensure DB is connected for server component? verify actions handle it.

// Server action helper to get by ID (since I didn't export it in actions file explicitly yet, I'll add it or inline)
// Actually I missed exporting `getShiftCoverageRequestById` in actions. 
// I will add a quick inline fetch or update actions. 
// Let's assume I update actions.ts or use a query here. 
// Ideally I should update actions.ts. For now I'll use a direct DB query in this server component if actions isn't ready.
// Models are available.

export default async function CoverageDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const request = await getShiftCoverageRequestById(params.id);
    if (!request) notFound();

    const userId = (session.user as any).id;
    const userRoles = (session.user as any).roles || [];
    const isPrivileged = userRoles.some((r: string) =>
        ["admin", "hr", "owner", "tech", "super_user"].includes(r.toLowerCase().replace(/ /g, "_"))
    );
    const isOwner = request.originalEmployeeId._id.toString() === userId;
    const isCandidate = request.candidates.some((c: any) => (c._id || c).toString() === userId);

    const isInitial = request.status === 'pending_hr' && !request.acceptedBy;
    const isSeeking = request.status === 'seeking_coverage';
    const isReadyToFinalize = (request.status === 'pending_hr' || request.status === 'seeking_coverage') && request.acceptedBy;
    const isCompleted = request.status === 'covered';

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Coverage Request Details</h1>
                    <p className="text-muted-foreground">Manage the workflow for this absence.</p>
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className="capitalize text-lg px-3 py-1">
                        {request.status.replace("_", " ")}
                    </Badge>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Left: Request Info */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="bg-muted/30 border-border">
                        <CardHeader>
                            <CardTitle className="text-lg">Shift Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border border-border">
                                <Avatar className="h-12 w-12 border-2 border-primary/20">
                                    <AvatarImage src={request.originalEmployeeId.image} />
                                    <AvatarFallback>{request.originalEmployeeId.firstName[0]}</AvatarFallback>
                                </Avatar>
                                <div className="space-y-1">
                                    <p className="font-semibold text-lg text-white">
                                        Covering: {request.originalEmployeeId.firstName} {request.originalEmployeeId.lastName}
                                    </p>
                                    <p className="text-sm text-red-400 font-medium">Reason: {request.reason}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Date</span>
                                    <div className="flex items-center gap-2 font-medium text-white">
                                        <Calendar className="h-4 w-4 text-primary" />
                                        {format(new Date(request.originalShift.dayDate), 'PPP')}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Shift Time</span>
                                    <div className="flex items-center gap-2 font-medium text-white">
                                        <Clock className="h-4 w-4 text-primary" />
                                        {request.originalShift.startTime} - {request.originalShift.endTime}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Location</span>
                                    <div className="flex items-center gap-2 font-medium text-zinc-300">
                                        <div className="flex flex-col">
                                            <span>{request.originalShift.storeId?.name || "Global Store"}</span>
                                            <span className="text-[10px] text-muted-foreground">{request.originalShift.storeDepartmentId?.name || "Global Department"}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Working With</span>
                                    <div className="flex items-center gap-2 font-medium text-zinc-300">
                                        <Users className="h-4 w-4 text-primary" />
                                        <span className="text-sm">
                                            {request.coworkers && request.coworkers.length > 0
                                                ? request.coworkers.join(', ')
                                                : "No other employees assigned"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {request.hrMessage && (
                                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 shadow-inner">
                                    <div className="flex items-center gap-2 text-blue-400 text-xs font-black uppercase tracking-widest mb-2">
                                        <FileText className="h-3.5 w-3.5" /> Message from HR
                                    </div>
                                    <p className="text-sm text-zinc-300 italic">{request.hrMessage}</p>
                                </div>
                            )}

                            {/* Attachments: Hide for candidates unless authorized */}
                            {(isPrivileged || isOwner) && request.attachments && request.attachments.length > 0 && (
                                <div className="border-t pt-4">
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Attachments / Proof</span>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {request.attachments.map((url: string, idx: number) => (
                                            <Link key={idx} href={url} target="_blank" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border border-border text-sm text-blue-400 hover:bg-blue-400/5 transition-colors">
                                                <FileText className="h-4 w-4" />
                                                View Attachment {idx + 1}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Workflow Actions */}
                    {(isInitial || isSeeking) && isPrivileged && (
                        <InviteCandidatesForm request={request} />
                    )}

                    {isSeeking && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Searching for Coverage</CardTitle>
                                <CardDescription>Offers have been sent. Waiting for acceptance.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <h3 className="text-sm font-medium">Invited Candidates:</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {request.candidates?.map((c: any) => (
                                            <div key={c._id} className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full text-sm">
                                                <Avatar className="h-5 w-5">
                                                    <AvatarImage src={c.image} />
                                                    <AvatarFallback>{c.firstName[0]}</AvatarFallback>
                                                </Avatar>
                                                {c.firstName} {c.lastName}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {isReadyToFinalize && request.acceptedBy && (
                        <FinalizeCoverageForm request={request} />
                    )}

                    {isCompleted && request.acceptedBy && (
                        <Card className="border-green-500/20 bg-green-500/5">
                            <CardHeader>
                                <div className="flex items-center gap-2 text-green-500 font-semibold">
                                    <CheckCircle2 className="h-5 w-5" />
                                    Coverage Finalized
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p>Covered by: <strong>{request.acceptedBy.firstName} {request.acceptedBy.lastName}</strong></p>
                                <p>Compensation: <span className="capitalize">{request.compensationType?.replace("_", " ")}</span></p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
