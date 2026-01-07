"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Palmtree, AlertCircle, ArrowRight, CheckCircle2, CalendarDays, Check, X, Eye, Square, CheckSquare } from "lucide-react";
import { Link } from "@/i18n/routing";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { pusherClient } from "@/lib/pusher";
import { respondToOvertimeRequest } from "@/lib/actions/overtime.actions";
import { approveVacationRequest, rejectVacationRequest } from "@/lib/actions/vacation.actions";
import { approveAbsenceRequest, rejectAbsenceRequest } from "@/lib/actions/absence.actions";
import { updateScheduleStatus } from "@/lib/actions/schedule.actions";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { EmployeeLink } from "../common/employee-link";
import { cancelCoverageRequest } from "@/lib/actions/coverage.actions";
import { FinalizeCoverageDialog } from "@/components/coverage/finalize-coverage-dialog";

interface PendingItem {
    id: string;
    type: 'overtime' | 'vacation' | 'absence' | 'schedule' | 'coverage';
    employeeName: string;
    employeeId?: string;
    employeeSlug?: string;
    storeName: string;
    date: Date;
    details: string;
    createdAt: Date;
    link: string;
}

interface PendingApprovalsWidgetProps {
    overtime: any[];
    vacations: any[];
    absences: any[];
    schedules: any[];
    coverage?: any[];
    compact?: boolean;
    role?: string;
    currentUserRoles?: string[];
}

export function PendingApprovalsWidget({ overtime, vacations, absences, schedules = [], coverage = [], compact = false, role, currentUserRoles = [] }: PendingApprovalsWidgetProps) {
    const totalCount = overtime.length + vacations.length + absences.length + schedules.length + (coverage?.length || 0);
    const { data: session } = useSession();
    const router = useRouter();
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);

    // Coverage Dialog State
    const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
    const [selectedCoverageRequest, setSelectedCoverageRequest] = useState<any>(null);

    // RBAC Check for Actions
    // Use prop role if provided (for view simulation), otherwise session roles
    const sessionRoles = (session?.user as any)?.roles || [];
    const effectiveRoles = role ? [role] : sessionRoles;
    const normalizedRoles = effectiveRoles.map((r: string) => r.toLowerCase().replace(/ /g, "_"));

    // Explicitly check for high-level roles only. Store Manager is NOT included.
    const canApprove = normalizedRoles.some((r: string) => ["admin", "hr", "owner", "super_user", "tech"].includes(r));

    // Real-time synchronization
    useEffect(() => {
        if (!canApprove) return;

        const channel = pusherClient.subscribe('admin-updates');

        const handleRefresh = () => {
            router.refresh();
        };

        channel.bind('vacation:updated', handleRefresh);
        channel.bind('absence:updated', handleRefresh);
        channel.bind('overtime:updated', handleRefresh);
        channel.bind('schedule:updated', handleRefresh);

        return () => {
            channel.unbind('vacation:updated', handleRefresh);
            channel.unbind('absence:updated', handleRefresh);
            channel.unbind('overtime:updated', handleRefresh);
            channel.unbind('schedule:updated', handleRefresh);
        };
    }, [canApprove, router]);

    const allItems = [
        ...overtime.map(i => ({
            id: i._id,
            type: 'overtime' as const,
            employeeName: `${i.employeeId?.firstName} ${i.employeeId?.lastName}`,
            employeeId: i.employeeId?._id,
            employeeSlug: i.employeeId?.slug,
            storeName: i.employeeId?.storeId?.name || "Unknown",
            date: new Date(i.dayDate),
            details: `${i.hoursRequested}h Overtime`,
            createdAt: new Date(i.createdAt),
            link: `/dashboard/approvals`
        })),
        ...vacations.map(i => ({
            id: i._id,
            type: 'vacation' as const,
            employeeName: `${i.employeeId?.firstName} ${i.employeeId?.lastName}`,
            employeeId: i.employeeId?._id,
            employeeSlug: i.employeeId?.slug,
            storeName: i.employeeId?.storeId?.name || "Unknown",
            date: new Date(i.requestedFrom),
            details: `${i.totalDays} Day Vacation`,
            createdAt: new Date(i.createdAt),
            link: `/dashboard/approvals`
        })),
        ...absences.map(i => ({
            id: i._id,
            type: 'absence' as const,
            employeeName: `${i.employeeId?.firstName} ${i.employeeId?.lastName}`,
            employeeId: i.employeeId?._id,
            employeeSlug: i.employeeId?.slug,
            storeName: i.employeeId?.storeId?.name || "Unknown",
            date: new Date(i.date),
            details: i.type || "Absence",
            createdAt: new Date(i.createdAt),
            link: `/dashboard/approvals`
        })),
        ...schedules.map(i => ({
            id: i._id,
            type: 'schedule' as const,
            employeeName: `${i.createdBy?.firstName || "System"} ${i.createdBy?.lastName || ""}`,
            employeeId: i.createdBy?._id,
            employeeSlug: i.createdBy?.slug,
            storeName: i.storeId?.name || "Unknown",
            date: new Date(i.updatedAt || i.createdAt),
            details: `Schedule Week ${i.weekNumber}`,
            createdAt: new Date(i.createdAt),
            link: `/dashboard/schedules/${i.slug || i._id}`
        })),
        ...(coverage || []).map(i => ({
            id: i._id,
            type: 'coverage' as const,
            employeeName: `${i.originalEmployeeId?.firstName} ${i.originalEmployeeId?.lastName}`, // The prompt implies manager is approving coverage for original employee's shift? No, manager finalizes the *replacement*.
            // Actually the 'request' is about the original employee needing cover.
            // Let's show: "Coverage: [Candidate Name]"?
            // The item in `pendingRequests` for coverage (from getPendingActions) has `acceptedBy`.
            // If it's ready for finalization, `acceptedBy` is set.
            // Let's display the Covering Employee Name if available, or Original if not.
            employeeId: i.acceptedBy?._id || i.originalEmployeeId?._id,
            employeeSlug: i.acceptedBy?.slug || i.originalEmployeeId?.slug,
            storeName: i.originalShift?.storeId?.name || "Unknown",
            date: new Date(i.originalShift?.dayDate),
            details: `Finalize Coverage: ${i.acceptedBy ? 'Found Replacement' : 'Seeking'}`,
            createdAt: new Date(i.createdAt),
            link: `/dashboard/coverage`
        }))
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Limit to items for widget
    const limit = compact ? 5 : 10;
    const items = allItems.slice(0, limit);
    const hasMore = allItems.length > limit;

    const handleAction = async (item: PendingItem, action: 'approve' | 'reject') => {
        if (!canApprove) {
            toast.error("You are not authorized to perform this action.");
            return;
        }
        setProcessingId(item.id);
        const userId = (session?.user as any).id;

        try {
            if (item.type === 'overtime') {
                await respondToOvertimeRequest(item.id, userId, action === 'approve' ? 'approved' : 'rejected', action === 'reject' ? 'Rejected from Dashboard' : undefined);
            } else if (item.type === 'vacation') {
                if (action === 'approve') await approveVacationRequest(item.id, userId);
                else await rejectVacationRequest(item.id, userId, "Rejected from Dashboard");
            } else if (item.type === 'absence') {
                if (action === 'approve') await approveAbsenceRequest(item.id, userId);
                else await rejectAbsenceRequest(item.id, userId, "Rejected from Dashboard");
            } else if (item.type === 'schedule') {
                const newStatus = action === 'approve' ? 'published' : 'rejected';
                await updateScheduleStatus(item.id, newStatus, userId, action === 'reject' ? "Rejected from Dashboard" : undefined);
            } else if (item.type === 'coverage') {
                if (action === 'approve') {
                    const req = coverage?.find(c => c._id === item.id);
                    if (req) {
                        setSelectedCoverageRequest(req);
                        setFinalizeDialogOpen(true);
                    }
                    return; // Stop here to let dialog handle it
                } else {
                    await cancelCoverageRequest(item.id);
                }
            }
            toast.success(`${action === 'approve' ? 'Approved' : 'Rejected'} successfully`);
            router.refresh();
            // Remove from selection if present
            const next = new Set(selectedIds);
            next.delete(item.id);
            setSelectedIds(next);
        } catch (error) {
            console.error(error);
            toast.error("Action failed");
        } finally {
            setProcessingId(null);
        }
    };

    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === items.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(items.map(i => i.id)));
        }
    };

    const handleBulkAction = async (action: 'approve' | 'reject') => {
        if (!canApprove) return;
        setIsBulkProcessing(true);
        const ids = Array.from(selectedIds);
        const failures: string[] = [];
        const userId = (session?.user as any).id;

        toast.loading(`Bulk ${action === 'approve' ? 'approving' : 'rejecting'} ${ids.length} items...`, { id: 'bulk-action' });

        for (const id of ids) {
            const item = items.find(i => i.id === id);
            if (!item) continue;
            try {
                if (item.type === 'overtime') {
                    await respondToOvertimeRequest(item.id, userId, action === 'approve' ? 'approved' : 'rejected', action === 'reject' ? 'Bulk Reject' : undefined);
                } else if (item.type === 'vacation') {
                    if (action === 'approve') await approveVacationRequest(item.id, userId);
                    else await rejectVacationRequest(item.id, userId, "Bulk Reject");
                } else if (item.type === 'absence') {
                    if (action === 'approve') await approveAbsenceRequest(item.id, userId);
                    else await rejectAbsenceRequest(item.id, userId, "Bulk Reject");
                } else if (item.type === 'schedule') {
                    const newStatus = action === 'approve' ? 'published' : 'rejected';
                    await updateScheduleStatus(item.id, newStatus, userId, action === 'reject' ? "Bulk Reject" : undefined);
                }
            } catch (e) {
                console.error(`Failed to ${action} ${id}`, e);
                failures.push(item.employeeName);
            }
        }

        toast.dismiss('bulk-action');
        if (failures.length > 0) {
            toast.warning(`Processed with errors. Failed: ${failures.join(', ')}`);
        } else {
            toast.success(`Bulk ${action} completed!`);
        }

        setSelectedIds(new Set());
        router.refresh();
        setIsBulkProcessing(false);
    };

    if (totalCount === 0) {
        return (
            <Card glass className="border-border/40 overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border/20 py-4">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Action Center</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-4">
                    <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-bold text-foreground">Operational Efficiency: 100%</p>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60 mt-1">All requests processed</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card glass premium className="border-destructive/10 overflow-hidden h-full flex flex-col">
            <CardHeader className="bg-destructive/5 border-b border-destructive/10 py-5 flex flex-row items-center justify-between space-y-0 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <AlertCircle className="h-5 w-5 animate-pulse text-destructive" />
                        <div className="absolute inset-0 bg-destructive/20 blur-lg rounded-full animate-ping" />
                    </div>
                    <div>
                        <CardTitle className="text-sm font-black tracking-widest text-destructive">CRITICAL APPROVALS</CardTitle>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70 mt-0.5">Action Required</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2 mr-2 animate-in fade-in slide-in-from-right-4">
                            <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-[10px] font-bold uppercase"
                                onClick={() => handleBulkAction('reject')}
                                disabled={isBulkProcessing}
                            >
                                Reject ({selectedIds.size})
                            </Button>
                            <Button
                                size="sm"
                                className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 font-bold uppercase"
                                onClick={() => handleBulkAction('approve')}
                                disabled={isBulkProcessing}
                            >
                                Approve ({selectedIds.size})
                            </Button>
                        </div>
                    )}
                    <Badge className="bg-destructive text-destructive-foreground font-black text-xs px-2.5 py-0.5 rounded-full ring-4 ring-destructive/10">
                        {totalCount}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                {items.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4 animate-in fade-in zoom-in duration-300">
                        <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center ring-8 ring-emerald-500/5">
                            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-lg text-foreground">All approvals handled 🎉</h3>
                            <p className="text-sm text-muted-foreground">Great job! You're all caught up.</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between p-2 border-b border-border/10 bg-muted/5 shrink-0">
                            <div className="flex items-center gap-2 px-2">
                                <Checkbox
                                    checked={selectedIds.size === items.length && items.length > 0}
                                    onCheckedChange={toggleSelectAll}
                                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                                <span className="text-[10px] font-bold uppercase text-muted-foreground">Select All</span>
                            </div>

                            <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                {schedules.length > 0 && <Badge variant="outline" className="text-[9px] font-black">{schedules.length} SCHED</Badge>}
                                {overtime.length > 0 && <Badge variant="outline" className="text-[9px] font-black">{overtime.length} OT</Badge>}
                                {vacations.length > 0 && <Badge variant="outline" className="text-[9px] font-black">{vacations.length} VAC</Badge>}
                            </div>
                        </div>

                        <ScrollArea className={cn("min-h-0", compact ? "h-[300px]" : "flex-1")}>
                            <div className="p-0 divide-y divide-border/10">
                                <AnimatePresence>
                                    {items.map((item, idx) => (
                                        <motion.div
                                            key={`${item.type}-${item.id}`}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className={cn(
                                                "group p-3 hover:bg-muted/30 transition-all duration-300 flex items-start gap-3",
                                                selectedIds.has(item.id) && "bg-primary/5"
                                            )}
                                        >
                                            <div className="pt-1">
                                                <Checkbox
                                                    checked={selectedIds.has(item.id)}
                                                    onCheckedChange={() => toggleSelection(item.id)}
                                                />
                                            </div>

                                            <div className="flex-1 min-w-0 space-y-0.5">
                                                <div className="flex items-baseline gap-2">
                                                    <EmployeeLink
                                                        employeeId={item.employeeId || ""}
                                                        slug={item.employeeSlug || ""}
                                                        name={item.employeeName}
                                                        currentUserRoles={currentUserRoles}
                                                        className="text-sm font-black text-foreground/90 truncate group-hover:text-primary transition-colors"
                                                    />
                                                    <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground/50 truncate">{item.storeName}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <div className={cn(
                                                        "p-0.5 rounded",
                                                        item.type === 'overtime' && "text-orange-500",
                                                        item.type === 'vacation' && "text-emerald-500",
                                                        item.type === 'absence' && "text-red-500",
                                                        item.type === 'schedule' && "text-blue-500"
                                                    )}>
                                                        {item.type === 'overtime' && <Clock className="h-3 w-3" />}
                                                        {item.type === 'vacation' && <Palmtree className="h-3 w-3" />}
                                                        {item.type === 'absence' && <AlertCircle className="h-3 w-3" />}
                                                        {item.type === 'schedule' && <CalendarDays className="h-3 w-3" />}
                                                    </div>
                                                    <p className="text-xs font-medium text-muted-foreground">{item.details}</p>
                                                </div>
                                            </div>

                                            <div className="text-right flex flex-col items-end gap-0.5 shrink-0">
                                                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40">{format(item.date, "MMM d")}</p>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity h-6">
                                                    {canApprove && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 rounded text-destructive/40 hover:text-destructive hover:bg-destructive/5"
                                                                disabled={processingId === item.id || !!processingId}
                                                                onClick={() => handleAction(item, 'reject')}
                                                            >
                                                                <X className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 rounded text-emerald-500/40 hover:text-emerald-500 hover:bg-emerald-500/5"
                                                                disabled={processingId === item.id || !!processingId}
                                                                onClick={() => handleAction(item, 'approve')}
                                                            >
                                                                <Check className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </ScrollArea>

                        <div className="p-3 bg-muted/5 border-t border-border/10 shrink-0">
                            <Link href="/dashboard/approvals" className="block">
                                <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-[0.2em] group h-8 rounded-lg" size="sm">
                                    {hasMore ? `VIEW ALL ${totalCount} REQUESTS` : "VIEW COMMAND CENTER"} <ArrowRight className="ml-2 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                        </div>
                    </>
                )}
            </CardContent>

            <FinalizeCoverageDialog
                open={finalizeDialogOpen}
                onOpenChange={setFinalizeDialogOpen}
                request={selectedCoverageRequest}
                onSuccess={() => router.refresh()}
            />
        </Card>
    );
}
