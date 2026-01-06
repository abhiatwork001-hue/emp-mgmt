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
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Inbox, LayoutGrid, Palmtree, AlertCircle, Clock, CalendarDays, Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/routing";

interface PendingActionsClientProps {
    initialData: any;
    userId: string;
}

export function PendingActionsClient({ initialData, userId }: PendingActionsClientProps) {
    const t = useTranslations("PendingActions");
    const [data, setData] = useState(initialData);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const refreshData = async () => {
        setIsLoading(true);
        try {
            const newData = await getPendingActions();
            setData(newData);
            router.refresh();
        } catch (error) {
            console.error("Failed to refresh actions", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (id: string, action: string, type: string) => {
        setIsLoading(true);
        try {
            let res: any;
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
            }

            toast.success("Action completed successfully");
            await refreshData();
        } catch (error: any) {
            toast.error(error.message || "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const renderSection = (items: any[], type: 'vacation' | 'absence' | 'overtime' | 'schedule', isApproval: boolean) => {
        if (items.length === 0) return null;
        return items.map((item) => (
            <ActionItemCard
                key={item._id}
                item={item}
                type={type}
                isApproval={isApproval}
                onAction={(id, action) => handleAction(id, action, type)}
                loading={isLoading}
            />
        ));
    };

    const hasAnyPersonal = data.myActions.vacations.length > 0 || data.myActions.absences.length > 0 || data.myActions.overtime.length > 0;
    const hasAnyApprovals = data.approvals.vacations.length > 0 || data.approvals.absences.length > 0 || data.approvals.overtime.length > 0 || data.approvals.schedules.length > 0;

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
                                {renderSection(data.approvals.overtime, 'overtime', true)}
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
            </Tabs>
        </div>
    );
}
