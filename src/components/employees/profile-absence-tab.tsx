"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import { ReportAbsenceDialog } from "@/components/absences/report-absence-dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

interface ProfileAbsenceTabProps {
    absenceRequests: any[];
    employeeId: string;
}

export function ProfileAbsenceTab({ absenceRequests, employeeId }: ProfileAbsenceTabProps) {
    const t = useTranslations("Absence");
    const tc = useTranslations("Common");
    // Group requests
    const pendingRequests = absenceRequests.filter((r: any) => r.status === 'pending');
    const historyRequests = absenceRequests.filter((r: any) => r.status !== 'pending');

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-card-foreground">{t('history')}</h3>
                <ReportAbsenceDialog
                    employeeId={employeeId}
                    trigger={
                        <Button size="sm" className="gap-2">
                            <PlusCircle className="h-4 w-4" />
                            {t('report')}
                        </Button>
                    }
                />
            </div>

            <Tabs defaultValue="pending" className="w-full">
                <TabsList className="bg-muted border border-border mb-4">
                    <TabsTrigger value="pending">{tc('pending')} ({pendingRequests.length})</TabsTrigger>
                    <TabsTrigger value="history">{tc('history')} ({historyRequests.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-0">
                    {pendingRequests.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground bg-muted/30 border border-dashed border-border rounded-xl">
                            {t('noPending')}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pendingRequests.map((req: any) => (
                                <AbsenceHistoryCard key={req._id} req={req} />
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                    {historyRequests.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground bg-muted/30 border border-dashed border-border rounded-xl">
                            {t('noHistory')}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {historyRequests.map((req: any) => (
                                <AbsenceHistoryCard key={req._id} req={req} />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function AbsenceHistoryCard({ req }: { req: any }) {
    const t = useTranslations("Absence");
    const tc = useTranslations("Common");

    return (
        <Card className="bg-muted/50 border-border hover:bg-muted/80 transition-colors">
            <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-border">
                        <AlertCircle className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                                {format(new Date(req.date), "PPP")}
                            </span>
                            {req.type && (
                                <Badge variant="secondary" className="bg-muted text-muted-foreground text-[10px] px-2 h-5">
                                    {req.type}
                                </Badge>
                            )}
                        </div>
                        {req.reason && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{req.reason}</p>
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
                    {req.justification && (
                        <span className={`text-[10px] ${req.justification === 'Justified' ? 'text-emerald-500' : 'text-red-500'}`}>
                            {req.justification === 'Justified' ? t('justified') : t('unjustified')}
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
