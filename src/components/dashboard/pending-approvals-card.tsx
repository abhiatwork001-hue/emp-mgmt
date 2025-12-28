"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertCircle, FileText, Check, X, Eye, User } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { approveVacationRequest, rejectVacationRequest } from "@/lib/actions/vacation.actions";
import { approveAbsenceRequest, rejectAbsenceRequest } from "@/lib/actions/absence.actions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";

interface PendingRequest {
    _id: string;
    type: "vacation" | "absence";
    employeeId: {
        firstName: string;
        lastName: string;
        image?: string;
    };
    createdAt: string;
    // Vacation specific
    requestedFrom?: string;
    requestedTo?: string;
    totalDays?: number;
    // Absence specific
    date?: string;
    reason?: string;
    absenceType?: string; // from schema change ideally, but relying on reason/type mapping logic or generic
}

export function PendingApprovalsCard({ pendingRequests }: { pendingRequests: PendingRequest[] }) {
    const router = useRouter();
    const { data: session } = useSession();
    const [processing, setProcessing] = useState<string | null>(null);

    const handleApprove = async (req: PendingRequest) => {
        if (!session?.user) {
            toast.error("You must be logged in to approve requests");
            return;
        }

        // Cast session user to custom type if necessary, or assume id is present (it is in our config)
        const approverId = (session.user as any).id;

        setProcessing(req._id);
        try {
            if (req.type === 'vacation') {
                await approveVacationRequest(req._id, approverId);
            } else {
                await approveAbsenceRequest(req._id, approverId);
            }
            toast.success("Request approved");
            router.refresh();
        } catch (error) {
            toast.error("Failed to approve request");
            console.error(error);
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async (req: PendingRequest) => {
        if (!session?.user) {
            toast.error("You must be logged in to reject requests");
            return;
        }
        const rejectorId = (session.user as any).id;

        setProcessing(req._id);
        try {
            if (req.type === "vacation") {
                await rejectVacationRequest(req._id, rejectorId, "Rejected from Dashboard");
            } else {
                await rejectAbsenceRequest(req._id, rejectorId, "Rejected from Dashboard");
            }
            toast.success("Request rejected");
            router.refresh();
        } catch (e) {
            toast.error("Failed to reject");
            console.error(e);
        } finally {
            setProcessing(null);
        }
    };

    const vacationsCount = pendingRequests.filter(r => r.type === "vacation").length;
    const absencesCount = pendingRequests.filter(r => r.type === "absence").length;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
                    <div className="grid h-12 w-12 place-items-center rounded bg-muted">
                        <Calendar className="h-6 w-6 text-foreground" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-foreground">{vacationsCount}</div>
                        <div className="text-sm text-muted-foreground">Vacation Requests</div>
                    </div>
                </div>

                <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
                    <div className="grid h-12 w-12 place-items-center rounded bg-muted">
                        <AlertCircle className="h-6 w-6 text-foreground" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-foreground">{absencesCount}</div>
                        <div className="text-sm text-muted-foreground">Absence Requests</div>
                    </div>
                </div>

                <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
                    <div className="grid h-12 w-12 place-items-center rounded bg-muted">
                        <FileText className="h-6 w-6 text-foreground" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-foreground">0</div>
                        <div className="text-sm text-muted-foreground">Schedule Approvals</div>
                    </div>
                </div>
            </div>

            <Card className="border-border bg-card">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-medium text-foreground">Recent Requests Requiring Action</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {pendingRequests.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">All caught up! No pending requests.</div>
                    ) : (
                        pendingRequests.map((req) => (
                            <div key={req._id} className="rounded-lg border border-border bg-muted/30 p-4">
                                <div className="mb-4 flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className={`grid h-10 w-10 place-items-center rounded ${req.type === 'vacation' ? 'bg-purple-500/10 text-purple-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                            {req.type === 'vacation' ? <Calendar className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-foreground">
                                                    {req.type === 'vacation' ? 'Vacation Request' : 'Absence Request'}
                                                </h4>
                                                <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 capitalize">
                                                    {req.type} Request
                                                </Badge>
                                                <Badge variant="secondary" className="bg-amber-500/10 text-amber-400 hover:bg-amber-500/20">
                                                    Medium Priority
                                                </Badge>
                                            </div>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {req.type === 'vacation'
                                                    ? `Requesting ${req.totalDays} days vacation`
                                                    : `Reporting absence`
                                                }
                                            </p>
                                            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                                <User className="h-3 w-3" />
                                                {req.employeeId.firstName} {req.employeeId.lastName}
                                                <span className="mx-1">•</span>
                                                {format(new Date(req.createdAt), "yyyy-MM-dd")}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right text-xs text-muted-foreground">
                                        {format(new Date(req.createdAt), "yyyy-MM-dd")}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 border-t border-border pt-4">
                                    <Button variant="outline" size="sm" className="h-8 gap-2 border-border bg-transparent text-foreground hover:bg-accent">
                                        <Eye className="h-3 w-3" /> View Details
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="h-8 gap-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/50"
                                        onClick={() => handleApprove(req)}
                                        disabled={!!processing}
                                    >
                                        <Check className="h-3 w-3" /> {processing === req._id ? "..." : "Approve"}
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="h-8 gap-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/50"
                                        onClick={() => handleReject(req)}
                                        disabled={!!processing}
                                    >
                                        <X className="h-3 w-3" /> {processing === req._id ? "..." : "Reject"}
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div >
    );
}
