"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Palmtree, AlertCircle, Trash2, Clock, CheckCircle2, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { useTransition } from "react";
import { cancelVacationRecord } from "@/lib/actions/vacation.actions";
import { cancelAbsenceRecord } from "@/lib/actions/absence.actions";
import { cancelCoverageRequest, acceptCoverageOffer } from "@/lib/actions/coverage.actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface ActiveActionsWidgetProps {
    vacations?: any[];
    absences?: any[];
    coverageRequests?: any[];
    coverageOffers?: any[];
    userId?: string;
}

export function ActiveActionsWidget({
    vacations = [],
    absences = [],
    coverageRequests = [],
    coverageOffers = [],
    userId
}: ActiveActionsWidgetProps) {
    const [isPending, startTransition] = useTransition();

    const totalActions = vacations.length + absences.length + coverageRequests.length + coverageOffers.length;

    if (totalActions === 0) return null;

    const handleCancel = async (id: string, type: 'vacation' | 'absence' | 'coverage') => {
        if (!confirm("Are you sure you want to cancel this request?")) return;

        startTransition(async () => {
            try {
                let res;
                if (type === 'vacation') res = await cancelVacationRecord(id, userId || "");
                else if (type === 'absence') res = await cancelAbsenceRecord(id, userId || "");
                else if (type === 'coverage') res = await cancelCoverageRequest(id);

                if (res?.success) {
                    toast.success("Request cancelled successfully");
                } else {
                    toast.error((res as any)?.error || "Failed to cancel request");
                }
            } catch (error: any) {
                toast.error(error?.message || "Something went wrong");
            }
        });
    };

    const handleAccept = async (id: string) => {
        if (!userId) return;
        if (!confirm("Are you sure you want to accept this shift?")) return;

        startTransition(async () => {
            try {
                const res = await acceptCoverageOffer(id, userId);
                if (res?.success) {
                    toast.success("Shift accepted! HR will finalize soon.");
                } else {
                    toast.error(res?.error || "Failed to accept shift");
                }
            } catch (error: any) {
                toast.error(error?.message || "Something went wrong");
            }
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full"
        >
            <Card className="border shadow-sm bg-card/30 backdrop-blur-sm overflow-hidden">
                <CardHeader className="py-3 px-4 bg-muted/5 border-b flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Clock className="h-3 w-3 text-primary" /> Ongoing Actions
                    </CardTitle>
                    <Badge variant="secondary" className="text-[9px] font-black">{totalActions}</Badge>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                    {vacations.map(v => (
                        <div key={v._id} className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/40 group hover:border-primary/30 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                    <Palmtree className="h-4 w-4 text-emerald-600" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-bold">Vacation Request</span>
                                    <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">
                                        {format(new Date(v.from), "MMM dd")} - {format(new Date(v.to), "MMM dd")}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[8px] uppercase font-black bg-emerald-50 text-emerald-600 border-emerald-200">Pending</Badge>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleCancel(v._id, 'vacation')}
                                    disabled={isPending}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    ))}

                    {absences.map(a => (
                        <div key={a._id} className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/40 group hover:border-destructive/30 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
                                    <AlertCircle className="h-4 w-4 text-destructive" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-bold">Absence Report</span>
                                    <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">
                                        {format(new Date(a.date), "MMMM dd, yyyy")}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[8px] uppercase font-black bg-destructive/5 text-destructive border-destructive/20">Pending</Badge>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleCancel(a._id, 'absence')}
                                    disabled={isPending}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    ))}

                    {coverageRequests.map(c => (
                        <div key={c._id} className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/40 group hover:border-primary/30 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Users className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-bold flex items-center gap-1">
                                        Shift Coverage
                                        {c.status === 'seeking_coverage' && <Badge variant="secondary" className="text-[7px] px-1 h-3 font-black bg-primary/20 text-primary">Live</Badge>}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">
                                        {format(new Date(c.originalShift.dayDate), "MMM dd")} | {c.originalShift.startTime}-{c.originalShift.endTime}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className={cn(
                                    "text-[8px] uppercase font-black",
                                    c.status === 'seeking_coverage' ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-muted text-muted-foreground"
                                )}>
                                    {c.status === 'seeking_coverage' ? 'Seeking' : 'Pending'}
                                </Badge>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleCancel(c._id, 'coverage')}
                                    disabled={isPending}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    ))}

                    {coverageOffers.length > 0 && (
                        <div className="pt-2 border-t border-border/40">
                            <h4 className="text-[9px] font-black uppercase text-primary tracking-widest mb-2 px-1">Available Coverage Offers</h4>
                            <div className="space-y-2">
                                {coverageOffers.map(o => (
                                    <div key={o._id} className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20 group hover:border-primary/40 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                                                <Briefcase className="h-4 w-4 text-primary" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold italic">Cover Shift Request</span>
                                                <span className="text-[9px] text-muted-foreground font-medium uppercase">
                                                    {format(new Date(o.originalShift.dayDate), "MMM dd")} | {o.originalShift.startTime}-{o.originalShift.endTime}
                                                </span>
                                                <div className="flex flex-col gap-0.5 mt-0.5">
                                                    <span className="text-[8px] text-zinc-500 font-medium">
                                                        {o.originalShift.storeId?.name} • {o.originalShift.storeDepartmentId?.name}
                                                    </span>
                                                    {o.coworkers && o.coworkers.length > 0 && (
                                                        <span className="text-[7px] text-muted-foreground">
                                                            With: {o.coworkers.join(', ')}
                                                        </span>
                                                    )}
                                                    {o.hrMessage && (
                                                        <span className="text-[7px] text-blue-500 italic line-clamp-1">
                                                            HR: {o.hrMessage}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            className="h-7 px-3 text-[10px] font-black italic bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                                            onClick={() => handleAccept(o._id)}
                                            disabled={isPending}
                                        >
                                            <Check className="h-3 w-3 mr-1" /> Accept
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}

import { Users } from "lucide-react";
