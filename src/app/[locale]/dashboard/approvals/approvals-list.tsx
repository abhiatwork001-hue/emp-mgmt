"use client";

import { startTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, X, Calendar, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { Link } from "@/i18n/routing";
import { respondToOvertimeRequest } from "@/lib/actions/overtime.actions";
import { approveVacationRequest, rejectVacationRequest } from "@/lib/actions/vacation.actions";
import { approveAbsenceRequest, rejectAbsenceRequest } from "@/lib/actions/absence.actions";
import { updateScheduleStatus } from "@/lib/actions/schedule.actions";

interface ApprovalsListProps {
    type: 'overtime' | 'vacation' | 'absence' | 'schedule';
    items: any[];
    currentUserId: string;
}

export function ApprovalsList({ type, items, currentUserId }: ApprovalsListProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState("");

    const handleAction = async (id: string, action: 'approved' | 'rejected', reason?: string) => {
        setLoading(id);
        try {
            if (type === 'overtime') {
                const res = await respondToOvertimeRequest(id, currentUserId, action, reason);
                if (!res.success) throw new Error(res.error);
            } else if (type === 'vacation') {
                if (action === 'approved') await approveVacationRequest(id, currentUserId);
                else await rejectVacationRequest(id, currentUserId, reason);
            } else if (type === 'absence') {
                if (action === 'approved') await approveAbsenceRequest(id, currentUserId);
                else await rejectAbsenceRequest(id, currentUserId, reason);
            } else if (type === 'schedule') {
                const status = action === 'approved' ? 'published' : 'rejected';
                await updateScheduleStatus(id, status, currentUserId, reason);
            }

            toast.success(`Request ${action} successfully`);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to process request");
        } finally {
            setLoading(null);
            setRejectId(null);
            setRejectReason("");
        }
    };

    return (
        <div className="space-y-4">
            {items.map(item => {
                const user = item.employeeId || item.createdBy;
                const storeName = item.employeeId?.storeId?.name || item.storeId?.name || "Unassigned";

                return (
                    <div key={item._id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors gap-4">

                        {/* User Info */}
                        <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </div>
                            <div>
                                <p className="font-semibold text-sm md:text-base">
                                    {user?.firstName} {user?.lastName}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="font-mono bg-muted px-1 rounded">{storeName}</span>
                                    <span>•</span>
                                    <span>Requested {format(new Date(item.createdAt), "MMM d")}</span>
                                    {type === 'schedule' && <span>(Schedule)</span>}
                                </div>
                            </div>
                        </div>

                        {/* Request Details */}
                        <div className="flex-1 md:px-8">
                            {type === 'overtime' && (
                                <>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {format(new Date(item.dayDate), "EEE, MMM d")}
                                        </Badge>
                                        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200">
                                            {item.hoursRequested} Hours
                                        </Badge>
                                    </div>
                                    <p className="text-sm italic text-muted-foreground">"{item.reason}"</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Shift: {item.shiftDetails?.shiftName} ({item.shiftDetails?.startTime} - {item.shiftDetails?.endTime})
                                    </p>
                                </>
                            )}

                            {type === 'vacation' && (
                                <>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {format(new Date(item.requestedFrom), "MMM d")} - {format(new Date(item.requestedTo), "MMM d, yyyy")}
                                        </Badge>
                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                                            {item.totalDays} Days
                                        </Badge>
                                    </div>
                                    {item.comments && <p className="text-sm italic text-muted-foreground">"{item.comments}"</p>}
                                </>
                            )}

                            {type === 'absence' && (
                                <>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {format(new Date(item.date), "EEE, MMM d, yyyy")}
                                        </Badge>
                                        <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">
                                            {item.type || "Absence"}
                                        </Badge>
                                    </div>
                                    <p className="text-sm italic text-muted-foreground">"{item.reason}"</p>
                                </>
                            )}

                            {type === 'schedule' && (
                                <>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            Week {item.weekNumber}, {item.year}
                                        </Badge>
                                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                            {format(new Date(item.dateRange.startDate), "MMM d")} - {format(new Date(item.dateRange.endDate), "MMM d")}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                        <span className="font-semibold text-foreground">{item.storeDepartmentId?.name || "Department"}</span>
                                        <ArrowRight className="h-3 w-3" />
                                        <span>{item.storeId?.name || "Store"}</span>
                                    </p>
                                    <div className="mt-2">
                                        <Button variant="link" size="sm" className="h-auto p-0 text-primary" asChild>
                                            <Link href={`/dashboard/schedules/${item._id}`}>View Full Schedule</Link>
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                size="sm"
                                variant="destructive"
                                disabled={loading === item._id}
                                onClick={() => setRejectId(item._id)}
                            >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                            </Button>
                            <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                disabled={loading === item._id}
                                onClick={() => handleAction(item._id, 'approved')}
                            >
                                <Check className="h-4 w-4 mr-1" />
                                {type === 'schedule' ? 'Publish' : 'Approve'}
                            </Button>
                        </div>
                    </div>
                );
            })}

            {/* Rejection Dialog */}
            <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Request</DialogTitle>
                        <DialogDescription>
                            Provide a reason for rejection. This will be sent to the requester.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason for rejection..."
                            className="min-h-[100px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={() => rejectId && handleAction(rejectId, 'rejected', rejectReason)}
                            disabled={!rejectReason.trim()}
                        >
                            Confirm Rejection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
