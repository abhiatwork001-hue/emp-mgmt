"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Calendar, Palmtree, Clock, CheckCircle2, History } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditVacationDialog } from "@/components/vacations/edit-vacation-dialog";
import { RequestVacationDialog } from "@/components/vacations/request-vacation-dialog";
import { useTranslations } from "next-intl";

interface ProfileVacationTabProps {
    employee: any;
    vacationRequests: any[];
    currentUserRoles?: string[];
}

export function ProfileVacationTab({ employee, vacationRequests, currentUserRoles = [] }: ProfileVacationTabProps) {
    const t = useTranslations("Vacation");
    const tc = useTranslations("Common");
    const tracker = employee.vacationTracker || { defaultDays: 22, usedDays: 0, rolloverDays: 0, pendingRequests: 0, remainingDays: 22 };

    const isPrivileged = currentUserRoles.some(role =>
        ['owner', 'hr', 'tech', 'admin', 'super_user'].includes((role || "").toLowerCase())
    );

    // Group requests
    const pendingRequests = vacationRequests.filter((r: any) => r.status === 'pending');
    const historyRequests = vacationRequests.filter((r: any) => r.status !== 'pending');

    return (
        <div className="space-y-8">
            {/* Header Section with Stats & Action */}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="p-4 flex flex-col justify-between h-full">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-muted-foreground font-medium uppercase">{t('allowance')}</span>
                                <div className="flex items-center gap-1">
                                    {isPrivileged && <EditVacationDialog employeeId={employee._id} tracker={tracker} />}
                                    <Palmtree className="w-4 h-4 text-primary" />
                                </div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-foreground">{tracker.defaultDays + tracker.rolloverDays}</div>
                                <p className="text-sm text-muted-foreground">{t('totalAllowance')}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="p-4 flex flex-col justify-between h-full">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-muted-foreground font-medium uppercase">{t('used')}</span>
                                <Calendar className="w-4 h-4 text-blue-500" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-foreground">{tracker.usedDays}</div>
                                <p className="text-sm text-muted-foreground">No past requests</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="p-4 flex flex-col justify-between h-full">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-muted-foreground font-medium uppercase">{tc('pending')}</span>
                                <Clock className="w-4 h-4 text-amber-500" />
                            </div>
                            <div>
                                <div className="font-semibold text-card-foreground mb-3">{tracker.pendingRequests}</div>
                                <p className="text-sm text-muted-foreground">{tc('pending')}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-emerald-900/20 border-emerald-500/30">
                        <CardContent className="p-4 flex flex-col justify-between h-full">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-emerald-400 font-medium uppercase">{t('remaining')}</span>
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-emerald-400">{tracker.remainingDays}</div>
                                <p className="text-xs text-emerald-500/70">{t('availableToBook')}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Request Button */}
                <div className="flex items-start lg:items-center">
                    <RequestVacationDialog
                        employeeId={employee._id}
                        remainingDays={tracker.remainingDays}
                    />
                </div>
            </div>

            {/* History Section */}
            <div className="space-y-4">
                <Tabs defaultValue="pending" className="w-full">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-card-foreground mb-4">
                            <History className="w-5 h-5 text-muted-foreground" />
                            {t('requestHistory')}
                        </h3>
                        <TabsList className="bg-card border border-border">
                            <TabsTrigger value="pending">{tc('pending')} ({pendingRequests.length})</TabsTrigger>
                            <TabsTrigger value="history">{tc('history')} ({historyRequests.length})</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="pending" className="mt-0">
                        {pendingRequests.length === 0 ? (
                            <div className="text-center py-12 text-zinc-500 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl">
                                {t('noPending')}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pendingRequests.map((req: any) => (
                                    <VacationHistoryCard key={req._id} req={req} />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="history" className="mt-0">
                        {historyRequests.length === 0 ? (
                            <div className="text-center py-12 text-zinc-500 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl">
                                {t('noHistory')}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {historyRequests.map((req: any) => (
                                    <VacationHistoryCard key={req._id} req={req} />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

function VacationHistoryCard({ req }: { req: any }) {
    const t = useTranslations("Vacation");
    const tc = useTranslations("Common");

    return (
        <Card className="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900/80 transition-colors">
            <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                        <Calendar className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">
                                {format(new Date(req.requestedFrom), "MMM d, yyyy")} - {format(new Date(req.requestedTo), "MMM d, yyyy")}
                            </span>
                            <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-[10px] px-2 h-5">
                                {t('days', { count: req.totalDays })}
                            </Badge>
                        </div>
                        {req.comments && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{req.comments}</p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                    <Badge className={`
                        ${req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            req.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                'bg-amber-500/10 text-amber-400 border-amber-500/20'}
                        border
                    `}>
                        {tc(req.status)}
                    </Badge>
                    <span className="text-[10px] text-zinc-600">
                        Requested {format(new Date(req.createdAt), "MMM d")}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
