"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActionItemCard } from "./action-item-card";

import {
    getPendingActions
} from "@/lib/actions/pending-actions.actions";
import {
    cancelVacationRequest,
    approveVacationRequest,
    rejectVacationRequest
} from "@/lib/actions/vacation.actions";
import {
    approveAbsenceRequest,
    rejectAbsenceRequest
} from "@/lib/actions/absence.actions";
import {
    respondToOvertimeRequest
} from "@/lib/actions/overtime.actions";
import {
    cancelCoverageRequest,
    acceptCoverageOffer
} from "@/lib/actions/coverage.actions";
import { updateVacationRequest } from "@/lib/actions/vacation.actions";
import { editAbsenceRequest } from "@/lib/actions/absence.actions";
import { editOvertimeRequest } from "@/lib/actions/overtime.actions";
import { RequestDetailsDialog } from "./request-details-dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Inbox, LayoutGrid, Palmtree, AlertCircle, Clock, CalendarDays, Loader2, UserCheck, Timer, Check } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { FinalizeCoverageDialog } from "@/components/coverage/finalize-coverage-dialog";
import { useRealtimeUpdates } from "@/hooks/use-realtime-updates";
import { SwapRequestsWidget } from "./swap-requests-widget";

interface PendingActionsClientProps {
    initialData: any;
    userId: string;
}

export function PendingActionsClient({ initialData, userId }: PendingActionsClientProps) {
    const t = useTranslations("PendingActions");
    const [data, setData] = useState(initialData);
    const [isLoading, setIsLoading] = useState(false);
    const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const router = useRouter();

    // Enable real-time updates for all actions
    useRealtimeUpdates(userId);

    const refreshData = async () => {
        setIsLoading(true);
        try {
            const newData = await getPendingActions();
            setData(newData);
            // Also update selected request if open
            if (selectedRequest && detailsDialogOpen) {
                // Try to find it in new data
                const updated = findItemIn(newData, selectedRequest._id);
                if (updated) setSelectedRequest({ ...updated, type: selectedRequest.type });
            }
            router.refresh();
        } catch (error) {
            console.error("Failed to refresh actions", error);
        } finally {
            setIsLoading(false);
        }
    };

    const findItemIn = (dataObj: any, id: string) => {
        const lists = [
            ...(dataObj.myActions?.vacations || []),
            ...(dataObj.myActions?.absences || []),
            ...(dataObj.myActions?.overtime || []),
            ...(dataObj.myActions?.coverage || []),
            ...(dataObj.approvals?.vacations || []),
            ...(dataObj.approvals?.absences || []),
            ...(dataObj.approvals?.overtime || []),
            ...(dataObj.approvals?.schedules || []),
            ...(dataObj.approvals?.coverage || [])
        ];
        return lists.find((i: any) => i._id === id);
    };

    const handleSaveEdit = async (id: string, type: string, formData: any) => {
        setIsLoading(true);
        try {
            if (type === 'vacation') {
                await updateVacationRequest(id, userId, {
                    requestedFrom: formData.requestedFrom,
                    requestedTo: formData.requestedTo,
                    comments: formData.reason
                });
            } else if (type === 'absence') {
                await editAbsenceRequest(id, userId, {
                    date: formData.date,
                    reason: formData.reason
                });
            } else if (type === 'overtime') {
                await editOvertimeRequest(id, userId, {
                    hoursRequested: formData.hours,
                    reason: formData.reason
                });
            }
            toast.success("Request updated successfully");
            await refreshData();
            setDetailsDialogOpen(false);
        } catch (error: any) {
            toast.error("Failed to update: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (id: string, action: string, type: string) => {
        setIsLoading(true);
        try {
            let res: any;

            if (action === 'view' || action === 'edit') {
                // Find item
                const item = findItemIn(data, id);
                if (item) {
                    setSelectedRequest({ ...item, type });
                    setDetailsDialogOpen(true);
                }
                setIsLoading(false);
                return;
            }

            if (type === 'vacation') {
                if (action === 'cancel') res = await cancelVacationRequest(id, userId);
                else if (action === 'approve') res = await approveVacationRequest(id, userId);
                else if (action === 'reject') res = await rejectVacationRequest(id, userId);
            } else if (type === 'absence') {
                if (action === 'approve') res = await approveAbsenceRequest(id, userId);
                else if (action === 'reject') res = await rejectAbsenceRequest(id, userId);
            } else if (type === 'overtime') {
                if (action === 'approve') res = await respondToOvertimeRequest(id, userId, 'approved');
                else if (action === 'reject') res = await respondToOvertimeRequest(id, userId, 'rejected');
            } else if (type === 'schedule') {
                if (action === 'review') {
                    // Navigate to schedule editor/viewer for that schedule
                    const schedule = data.approvals.schedules.find((s: any) => s._id === id);
                    if (schedule?.storeId?.slug) {
                        router.push(`/dashboard/schedules/${schedule.storeId.slug}`);
                        return;
                    }
                }
            } else if (type === 'coverage') {
                if (action === 'accept') {
                    res = await acceptCoverageOffer(id, userId);
                    if (!res.success) throw new Error(res.error);
                }
                else if (action === 'decline') {
                    // Import and call declineCoverageOffer
                    const { declineCoverageOffer } = await import('@/lib/actions/coverage.actions');
                    res = await declineCoverageOffer(id, userId);
                    if (!res.success) throw new Error(res.error);
                }
                // Manager actions
                else if (action === 'finalize') {
                    // Find the request
                    const req = data.approvals.coverage.find((r: any) => r._id === id);
                    if (req) {
                        setSelectedRequest(req);
                        setFinalizeDialogOpen(true);
                        setIsLoading(false); // Stop loading since we just opened dialog
                        return; // Exit here, dialog handles the rest
                    }
                }
                else if (action === 'cancel') res = await cancelCoverageRequest(id);
            }

            toast.success("Action completed successfully");
            await refreshData();
        } catch (error: any) {
            toast.error(error.message || "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const renderSection = (items: any[], type: 'vacation' | 'absence' | 'overtime' | 'schedule' | 'coverage', isApproval: boolean, isCoverageOffer?: boolean) => {
        if (!items || items.length === 0) return null;
        return items.map((item) => (
            <ActionItemCard
                key={item._id}
                item={item}
                type={type}
                isApproval={isApproval}
                onAction={(id, action) => handleAction(id, action, type)}
                loading={isLoading}
                userId={userId}
                isCoverageOffer={isCoverageOffer}
            />
        ));
    };

    const hasAnyPersonal = data.myActions.vacations.length > 0 || data.myActions.absences.length > 0 || data.myActions.overtime.length > 0 || data.myActions.coverage?.length > 0 || (data.availableCoverage && data.availableCoverage.length > 0);
    const hasAnyApprovals = data.approvals.vacations.length > 0 || data.approvals.absences.length > 0 || data.approvals.overtime.length > 0 || data.approvals.schedules.length > 0 || (data.approvals.coverage && data.approvals.coverage.length > 0);

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <Tabs defaultValue="all" className="w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <TabsList className="bg-muted/30 p-1 rounded-2xl border border-border/20 backdrop-blur-sm">
                        <TabsTrigger value="all" className="rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <LayoutGrid className="w-4 h-4 mr-2" />
                            {t("tabs.all")}
                        </TabsTrigger>
                        <TabsTrigger value="vacations" className="rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Palmtree className="w-4 h-4 mr-2 text-emerald-500" />
                            {t("tabs.vacations")}
                        </TabsTrigger>
                        <TabsTrigger value="absences" className="rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
                            {t("tabs.absences")}
                        </TabsTrigger>
                        <TabsTrigger value="overtime" className="rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Clock className="w-4 h-4 mr-2 text-orange-500" />
                            {t("tabs.overtime")}
                        </TabsTrigger>
                        <TabsTrigger value="schedules" className="rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <CalendarDays className="w-4 h-4 mr-2 text-blue-500" />
                            {t("tabs.schedules")}
                        </TabsTrigger>
                        <TabsTrigger value="coverage" className="rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <UserCheck className="w-4 h-4 mr-2 text-violet-500" />
                            {t("tabs.coverage")}
                        </TabsTrigger>
                    </TabsList>



                    {isLoading && (
                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Updating...
                        </div>
                    )}
                </div>

                {/* All Actions */}
                <TabsContent value="all" className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">

                    {/* Swap Requests Widget */}
                    {data.myActions?.swaps?.length > 0 && (
                        <section className="mb-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-1 w-12 bg-blue-500/20 rounded-full" />
                                <h2 className="text-xl font-black tracking-tight">Shift Swaps</h2>
                            </div>
                            <div className="h-[300px]">
                                <SwapRequestsWidget
                                    incomingRequests={data.myActions.swaps}
                                    userId={userId}
                                    currentUserRoles={[]} // Optional for now
                                />
                            </div>
                        </section>
                    )}

                    {/* My Requests Section */}
                    {hasAnyPersonal && (
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-1 w-12 bg-primary/20 rounded-full" />
                                <h2 className="text-xl font-black tracking-tight">{t("myRequests")}</h2>
                            </div>
                            <div className="grid gap-4">
                                {renderSection(data.myActions.vacations, 'vacation', false)}
                                {renderSection(data.myActions.absences, 'absence', false)}
                                {renderSection(data.myActions.overtime, 'overtime', false)}
                                {renderSection(data.myActions.coverage, 'coverage', false)}
                                {renderSection(data.availableCoverage, 'coverage', false, true)}
                            </div>
                        </section>
                    )}

                    {/* Approvals Section */}
                    {hasAnyApprovals && (
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-1 w-12 bg-emerald-500/20 rounded-full" />
                                <h2 className="text-xl font-black tracking-tight">{t("toApprove")}</h2>
                            </div>
                            <div className="grid gap-4">
                                {renderSection(data.approvals.schedules, 'schedule', true)}
                                {renderSection(data.approvals.vacations, 'vacation', true)}
                                {renderSection(data.approvals.absences, 'absence', true)}
                                {renderSection(data.approvals.vacations, 'vacation', true)}
                                {renderSection(data.approvals.absences, 'absence', true)}
                                {renderSection(data.approvals.overtime, 'overtime', true)}
                                {renderSection(data.approvals.coverage, 'coverage', true)}
                            </div>
                        </section>
                    )}

                    {!hasAnyPersonal && !hasAnyApprovals && (
                        <div className="flex flex-col items-center justify-center py-32 text-center opacity-40">
                            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
                                <Inbox className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-black">{t("noApprovals")}</h3>
                            <p className="text-sm mt-2 font-medium">Everything is up to date.</p>
                        </div>
                    )}
                </TabsContent>

                {/* Filtered Tabs */}
                <TabsContent value="vacations" className="space-y-8 animate-in fade-in duration-300">
                    <div className="grid gap-4">
                        {renderSection(data.myActions.vacations, 'vacation', false)}
                        {renderSection(data.approvals.vacations, 'vacation', true)}
                    </div>
                </TabsContent>

                <TabsContent value="absences" className="space-y-8 animate-in fade-in duration-300">
                    <div className="grid gap-4">
                        {renderSection(data.myActions.absences, 'absence', false)}
                        {renderSection(data.approvals.absences, 'absence', true)}
                    </div>
                </TabsContent>

                <TabsContent value="overtime" className="space-y-8 animate-in fade-in duration-300">
                    <div className="grid gap-4">
                        {renderSection(data.myActions.overtime, 'overtime', false)}
                        {renderSection(data.approvals.overtime, 'overtime', true)}
                    </div>
                </TabsContent>

                <TabsContent value="schedules" className="space-y-8 animate-in fade-in duration-300">
                    <div className="grid gap-4">
                        {renderSection(data.approvals.schedules, 'schedule', true)}
                    </div>
                </TabsContent>

                <TabsContent value="coverage" className="space-y-8 animate-in fade-in duration-300">
                    <div className="grid gap-4">
                        {data.availableCoverage?.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">Opportunities</h3>
                                {renderSection(data.availableCoverage, 'coverage', false, true)}
                            </div>
                        )}
                        {data.approvals.coverage?.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">To Finalize</h3>
                                {renderSection(data.approvals.coverage, 'coverage', true)}
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            <FinalizeCoverageDialog
                open={finalizeDialogOpen}
                onOpenChange={setFinalizeDialogOpen}
                request={selectedRequest}
                onSuccess={refreshData}
            />

            <RequestDetailsDialog
                open={detailsDialogOpen}
                onOpenChange={setDetailsDialogOpen}
                item={selectedRequest}
                userId={userId}
                canEdit={true} // Logic inside dialog handles ownership check
                isProcessing={isLoading}
                onCancel={(id, type) => handleAction(id, 'cancel', type)}
                onSaveEdit={handleSaveEdit}
                onApprove={(id, type) => handleAction(id, 'approve', type)}
                onReject={(id, type) => handleAction(id, 'reject', type)}
            />
        </div>
    );
}
