"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertCircle, Calendar, Clock, Users, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { format } from "date-fns";

interface PendingRequest {
    id: string;
    type: 'vacation' | 'absence' | 'overtime' | 'conflict' | 'coverage';
    employeeName: string;
    employeeSlug?: string;
    department?: string;
    date: Date;
    details: string;
    isUrgent: boolean;
    raw?: any;
}

interface ActionRequiredWidgetProps {
    vacationRequests?: any[];
    absenceRequests?: any[];
    overtimeRequests?: any[];
    scheduleConflicts?: any[];
    coverageRequests?: any[];
}

export function ActionRequiredWidget({
    vacationRequests = [],
    absenceRequests = [],
    overtimeRequests = [],
    scheduleConflicts = [],
    coverageRequests = []
}: ActionRequiredWidgetProps) {
    const t = useTranslations("Dashboard.hr.actionRequired");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState("all");

    // Transform all requests into a unified format
    const allRequests: PendingRequest[] = [
        ...vacationRequests.map(v => ({
            id: v._id,
            type: 'vacation' as const,
            employeeName: `${v.employeeId?.firstName || ''} ${v.employeeId?.lastName || ''}`.trim(),
            employeeSlug: v.employeeId?.slug,
            department: v.employeeId?.storeDepartmentId?.name || '',
            date: new Date(v.from || v.requestedFrom),
            details: `${v.totalDays || 0} days - ${format(new Date(v.from || v.requestedFrom), 'MMM dd')} to ${format(new Date(v.to || v.requestedTo), 'MMM dd')}`,
            isUrgent: (() => {
                const startDate = new Date(v.from || v.requestedFrom);
                const requestDate = new Date(v.createdAt);
                const daysUntilStart = Math.ceil((startDate.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24));
                return daysUntilStart < 7;
            })(),
            raw: v
        })),
        ...absenceRequests.map(a => ({
            id: a._id,
            type: 'absence' as const,
            employeeName: `${a.employeeId?.firstName || ''} ${a.employeeId?.lastName || ''}`.trim(),
            employeeSlug: a.employeeId?.slug,
            department: a.employeeId?.storeDepartmentId?.name || '',
            date: new Date(a.date),
            details: `${a.type || 'Absence'} - ${format(new Date(a.date), 'MMM dd, yyyy')}`,
            isUrgent: new Date(a.date) <= new Date(),
            raw: a
        })),
        ...overtimeRequests.map(o => ({
            id: o._id,
            type: 'overtime' as const,
            employeeName: `${o.employeeId?.firstName || ''} ${o.employeeId?.lastName || ''}`.trim(),
            employeeSlug: o.employeeId?.slug,
            department: o.employeeId?.storeDepartmentId?.name || '',
            date: new Date(o.dayDate),
            details: `${o.hoursRequested || 0} hours - ${format(new Date(o.dayDate), 'MMM dd, yyyy')}`,
            isUrgent: (() => {
                const requestDate = new Date(o.createdAt);
                const today = new Date();
                const daysSinceRequest = Math.ceil((today.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24));
                return daysSinceRequest > 3;
            })(),
            raw: o
        })),
        ...scheduleConflicts.map((s, i) => ({
            id: s._id || `conflict-${i}`,
            type: 'conflict' as const,
            employeeName: s.employeeName || 'Schedule Conflict',
            employeeSlug: s.employeeSlug,
            department: s.department || '',
            date: new Date(s.date || Date.now()),
            details: s.details || 'Schedule conflict detected',
            isUrgent: true,
            raw: s
        })),
        ...coverageRequests.map(c => ({
            id: c._id,
            type: 'coverage' as const,
            employeeName: `${c.originalEmployeeId?.firstName || ''} ${c.originalEmployeeId?.lastName || ''}`.trim(),
            employeeSlug: c.originalEmployeeId?.slug,
            department: c.originalShift?.storeDepartmentId?.name || '',
            date: new Date(c.originalShift?.dayDate || c.createdAt),
            details: `Coverage needed - ${c.acceptedBy ? 'Pending approval' : 'Seeking replacement'}`,
            isUrgent: false,
            raw: c
        }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    // Filter by tab
    const filteredRequests = activeTab === "all"
        ? allRequests
        : allRequests.filter(r => r.type === activeTab);

    const totalCount = allRequests.length;
    const urgentCount = allRequests.filter(r => r.isUrgent).length;

    const counts = {
        all: allRequests.length,
        vacation: vacationRequests.length,
        absence: absenceRequests.length,
        overtime: overtimeRequests.length,
        conflict: scheduleConflicts.length,
        coverage: coverageRequests.length
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'vacation': return Calendar;
            case 'absence': return AlertCircle;
            case 'overtime': return Clock;
            case 'conflict': return AlertTriangle;
            case 'coverage': return Users;
            default: return AlertCircle;
        }
    };

    const getLink = (type: string) => {
        switch (type) {
            case 'vacation': return '/dashboard/vacations';
            case 'absence': return '/dashboard/absences';
            case 'overtime': return '/dashboard/pending-actions';
            case 'conflict': return '/dashboard/schedules';
            case 'coverage': return '/dashboard/coverage';
            default: return '/dashboard/pending-actions';
        }
    };

    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredRequests.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredRequests.map(r => r.id)));
        }
    };

    return (
        <Card className={cn(
            "border-l-4 shadow-md hover:shadow-lg transition-shadow rounded-xl bg-card h-full flex flex-col",
            urgentCount > 0 ? "border-l-destructive bg-destructive/5" : "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
        )}>
            <CardHeader className="pb-4 px-6 pt-6 shrink-0 space-y-2">
                <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <AlertCircle className={cn(
                                "h-5 w-5",
                                urgentCount > 0 ? "text-destructive animate-pulse" : "text-amber-600"
                            )} />
                            {t('title')}
                        </CardTitle>
                        <p className="text-sm font-medium text-muted-foreground">
                            {t('subtitle')}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {urgentCount > 0 && (
                            <Badge variant="destructive" className="text-xs font-bold uppercase px-2.5 py-1">
                                {urgentCount} {t('urgent')}
                            </Badge>
                        )}
                        <Badge className="bg-primary text-primary-foreground font-black text-sm px-3 py-1 rounded-full">
                            {totalCount}
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-0 pb-0 flex-1 flex flex-col min-h-0">
                {totalCount === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                        </div>
                        <p className="text-sm font-bold">{t('empty')}</p>
                    </div>
                ) : (
                    <>
                        {/* Tabs */}
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                            <div className="px-4 pt-3 pb-2 border-b border-border/10 shrink-0">
                                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1">
                                    <TabsTrigger value="all" className="text-xs">
                                        {t('viewAll')} ({counts.all})
                                    </TabsTrigger>
                                    <TabsTrigger value="vacation" className="text-xs" disabled={counts.vacation === 0}>
                                        VAC ({counts.vacation})
                                    </TabsTrigger>
                                    <TabsTrigger value="absence" className="text-xs" disabled={counts.absence === 0}>
                                        ABS ({counts.absence})
                                    </TabsTrigger>
                                    <TabsTrigger value="overtime" className="text-xs" disabled={counts.overtime === 0}>
                                        OT ({counts.overtime})
                                    </TabsTrigger>
                                    <TabsTrigger value="conflict" className="text-xs" disabled={counts.conflict === 0}>
                                        CONF ({counts.conflict})
                                    </TabsTrigger>
                                    <TabsTrigger value="coverage" className="text-xs" disabled={counts.coverage === 0}>
                                        COV ({counts.coverage})
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            {/* Multi-select controls */}
                            {filteredRequests.length > 0 && (
                                <div className="flex items-center justify-between px-4 py-2 bg-muted/5 border-b border-border/10 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            checked={selectedIds.size === filteredRequests.length && filteredRequests.length > 0}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
                                        </span>
                                    </div>
                                    {selectedIds.size > 0 && (
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" variant="outline" className="h-7 text-xs">
                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                Approve ({selectedIds.size})
                                            </Button>
                                            <Button size="sm" variant="outline" className="h-7 text-xs text-destructive">
                                                <X className="h-3 w-3 mr-1" />
                                                Reject ({selectedIds.size})
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Scrollable list */}
                            <TabsContent value={activeTab} className="mt-0 flex-1 min-h-0">
                                <ScrollArea className="h-[400px]">
                                    <div className="divide-y divide-border/10">
                                        {filteredRequests.map((request) => {
                                            const Icon = getIcon(request.type);
                                            return (
                                                <div
                                                    key={request.id}
                                                    className={cn(
                                                        "group p-3 transition-all flex items-start gap-3",
                                                        request.isUrgent && "bg-destructive/5"
                                                    )}
                                                >
                                                    <Checkbox
                                                        checked={selectedIds.has(request.id)}
                                                        onCheckedChange={() => toggleSelection(request.id)}
                                                    />

                                                    <Icon className={cn(
                                                        "h-5 w-5 mt-0.5 shrink-0",
                                                        request.isUrgent ? "text-destructive" : "text-muted-foreground"
                                                    )} />

                                                    <div className="flex-1 min-w-0 space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <Link
                                                                href={request.employeeSlug ? `/dashboard/employees/${request.employeeSlug}` : '#'}
                                                                className="text-sm font-bold hover:underline"
                                                            >
                                                                {request.employeeName}
                                                            </Link>
                                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                                {request.type.toUpperCase()}
                                                            </Badge>
                                                            {request.isUrgent && (
                                                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                                                    {t('urgent')}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">{request.details}</p>
                                                        {request.department && (
                                                            <p className="text-[10px] text-muted-foreground/70">{request.department}</p>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50">
                                                            <CheckCircle2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:bg-red-50">
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>

                        {/* Footer */}
                        <div className="px-4 py-3 border-t border-border/10 flex justify-end shrink-0">
                            <Button variant="outline" size="sm" asChild>
                                <Link href="/dashboard/pending-actions">
                                    {t('viewAll')} ({totalCount})
                                </Link>
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
