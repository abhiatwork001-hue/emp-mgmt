import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getShiftCoverageRequestById } from "@/lib/actions/coverage.actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { CheckCircle2, Clock, AlertTriangle, User, Calendar, FileText } from "lucide-react";
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

    const isInitial = request.status === 'pending_hr' && !request.acceptedBy;
    const isSeeking = request.status === 'seeking_coverage';
    const isReadyToFinalize = (request.status === 'pending_hr' || request.status === 'seeking_coverage') && request.acceptedBy;
    const isCompleted = request.status === 'covered';

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Coverage Request Details</h1>
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
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Absence Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border border-border">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={request.originalEmployeeId.image} />
                                    <AvatarFallback>{request.originalEmployeeId.firstName[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold text-lg">{request.originalEmployeeId.firstName} {request.originalEmployeeId.lastName}</p>
                                    <p className="text-sm text-red-400 font-medium">Reason: {request.reason}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Date</span>
                                    <div className="flex items-center gap-2 font-medium">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        {format(new Date(request.originalShift.dayDate), 'PPP')}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Shift Time</span>
                                    <div className="flex items-center gap-2 font-medium">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        {request.originalShift.startTime} - {request.originalShift.endTime}
                                    </div>
                                </div>
                            </div>

                            {request.attachments && request.attachments.length > 0 && (
                                <div>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Attachments</span>
                                    <div className="flex gap-2 mt-2">
                                        {request.attachments.map((url: string, idx: number) => (
                                            <Link key={idx} href={url} target="_blank" className="flex items-center gap-2 text-sm text-blue-400 hover:underline">
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
                    {isInitial && (
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
