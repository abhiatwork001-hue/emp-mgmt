"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Palmtree, AlertCircle, ArrowRight, CheckCircle2, CalendarDays, Check, X, Eye } from "lucide-react";
import { Link } from "@/i18n/routing";
import { format } from "date-fns";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { respondToOvertimeRequest } from "@/lib/actions/overtime.actions";
import { approveVacationRequest, rejectVacationRequest } from "@/lib/actions/vacation.actions";
import { approveAbsenceRequest, rejectAbsenceRequest } from "@/lib/actions/absence.actions";
import { updateScheduleStatus } from "@/lib/actions/schedule.actions";

interface PendingItem {
    id: string;
    type: 'overtime' | 'vacation' | 'absence' | 'schedule';
    employeeName: string;
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
}

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function PendingApprovalsWidget({ overtime, vacations, absences, schedules = [] }: PendingApprovalsWidgetProps) {
    const totalCount = overtime.length + vacations.length + absences.length + schedules.length;
    const { data: session } = useSession();
    const router = useRouter();
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Normalize items for list
    const items: PendingItem[] = [
        ...overtime.map(i => ({
            id: i._id,
            type: 'overtime' as const,
            employeeName: `${i.employeeId?.firstName} ${i.employeeId?.lastName}`,
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
            storeName: i.storeId?.name || "Unknown",
            date: new Date(i.updatedAt || i.createdAt),
            details: `Schedule Week ${i.weekNumber}`,
            createdAt: new Date(i.createdAt),
            link: `/dashboard/schedules/${i._id}`
        }))
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Newest first

    const handleAction = async (item: PendingItem, action: 'approve' | 'reject') => {
        if (!session?.user) {
            toast.error("Unauthorized");
            return;
        }
        setProcessingId(item.id);
        const userId = (session.user as any).id;

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
            }
            toast.success(`${action === 'approve' ? 'Approved' : 'Rejected'} successfully`);
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Action failed");
        } finally {
            setProcessingId(null);
        }
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
        <Card glass premium className="border-destructive/10 overflow-hidden">
            <CardHeader className="bg-destructive/5 border-b border-destructive/10 py-5 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-black tracking-widest flex items-center gap-3 text-destructive">
                    <div className="relative">
                        <AlertCircle className="h-5 w-5 animate-pulse" />
                        <div className="absolute inset-0 bg-destructive/20 blur-lg rounded-full animate-ping" />
                    </div>
                    CRITICAL APPROVALS
                </CardTitle>
                <Badge className="bg-destructive text-destructive-foreground font-black text-xs px-2.5 py-0.5 rounded-full ring-4 ring-destructive/10">
                    {totalCount}
                </Badge>
            </CardHeader>
            <CardContent className="p-0">
                <div className="flex gap-3 p-4 border-b border-border/10 overflow-x-auto no-scrollbar">
                    {schedules.length > 0 && (
                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-tighter text-blue-500 bg-blue-500/5 border-blue-500/20 whitespace-nowrap">
                            {schedules.length} SCHEDULES
                        </Badge>
                    )}
                    {overtime.length > 0 && (
                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-tighter text-orange-500 bg-orange-500/5 border-orange-500/20 whitespace-nowrap">
                            {overtime.length} OVERTIME
                        </Badge>
                    )}
                    {vacations.length > 0 && (
                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-tighter text-emerald-500 bg-emerald-500/5 border-emerald-500/20 whitespace-nowrap">
                            {vacations.length} VACATIONS
                        </Badge>
                    )}
                    {absences.length > 0 && (
                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-tighter text-red-500 bg-red-500/5 border-red-500/20 whitespace-nowrap">
                            {absences.length} ABSENCES
                        </Badge>
                    )}
                </div>

                <ScrollArea className="h-[400px]">
                    <div className="p-0 divide-y divide-border/10">
                        <AnimatePresence>
                            {items.map((item, idx) => (
                                <motion.div
                                    key={`${item.type}-${item.id}`}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="group p-5 hover:bg-muted/30 transition-all duration-300"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1.5 flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-black text-foreground/90 truncate group-hover:text-primary transition-colors">{item.employeeName}</p>
                                                <div className="w-1 h-1 rounded-full bg-border/40" />
                                                <p className="text-[10px] font-black uppercase tracking-tight text-muted-foreground/60">{item.storeName}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    "p-1.5 rounded-lg",
                                                    item.type === 'overtime' && "bg-orange-500/10",
                                                    item.type === 'vacation' && "bg-emerald-500/10",
                                                    item.type === 'absence' && "bg-red-500/10",
                                                    item.type === 'schedule' && "bg-blue-500/10"
                                                )}>
                                                    {item.type === 'overtime' && <Clock className="h-3 w-3 text-orange-500" />}
                                                    {item.type === 'vacation' && <Palmtree className="h-3 w-3 text-emerald-500" />}
                                                    {item.type === 'absence' && <AlertCircle className="h-3 w-3 text-red-500" />}
                                                    {item.type === 'schedule' && <CalendarDays className="h-3 w-3 text-blue-500" />}
                                                </div>
                                                <p className="text-xs font-bold text-foreground/70">{item.details}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-1 shrink-0">
                                            <p className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground/40">{format(item.date, "MMM d, yyyy")}</p>
                                            <div className="flex items-center gap-1">
                                                <Link href={item.link}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground/60 hover:text-primary hover:bg-primary/5">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg text-destructive/40 hover:text-destructive hover:bg-destructive/5"
                                                    disabled={processingId === item.id || !!processingId}
                                                    onClick={() => handleAction(item, 'reject')}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg text-emerald-500/40 hover:text-emerald-500 hover:bg-emerald-500/5 group/check"
                                                    disabled={processingId === item.id || !!processingId}
                                                    onClick={() => handleAction(item, 'approve')}
                                                >
                                                    {processingId === item.id ? (
                                                        <Clock className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Check className="h-4 w-4 group-hover/check:scale-125 transition-transform" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </ScrollArea>

                <div className="p-4 bg-muted/5 border-t border-border/10">
                    <Link href="/dashboard/approvals" className="block">
                        <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-[0.2em] group h-10 rounded-xl" size="sm">
                            VIEW COMMAND CENTER <ArrowRight className="ml-2 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
