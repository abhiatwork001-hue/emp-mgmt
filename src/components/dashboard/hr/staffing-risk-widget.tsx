"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, Calendar, Activity } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface StaffingRiskWidgetProps {
    understaffedToday?: string[];
    understaffedTomorrow?: string[];
    overlappingVacations?: { department: string; count: number }[];
    sickLeaveImpact?: { department: string; severity: 'low' | 'medium' | 'high' }[];
}

export function StaffingRiskWidget({
    understaffedToday = [],
    understaffedTomorrow = [],
    overlappingVacations = [],
    sickLeaveImpact = []
}: StaffingRiskWidgetProps) {
    const t = useTranslations("Dashboard.hr.staffingRisk");

    const getRiskLevel = (): 'low' | 'medium' | 'high' | 'critical' => {
        const totalIssues = understaffedToday.length + understaffedTomorrow.length +
            overlappingVacations.length + sickLeaveImpact.length;

        if (totalIssues === 0) return 'low';
        if (totalIssues <= 2) return 'medium';
        if (totalIssues <= 4) return 'high';
        return 'critical';
    };

    const riskLevel = getRiskLevel();
    const hasRisks = understaffedToday.length > 0 || understaffedTomorrow.length > 0 ||
        overlappingVacations.length > 0 || sickLeaveImpact.length > 0;

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'low': return 'text-green-600 bg-green-50 border-green-200';
            case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
            case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
            case 'critical': return 'text-red-600 bg-red-50 border-red-200';
            default: return 'text-muted-foreground bg-muted border-border';
        }
    };

    return (
        <Card className={cn(
            "rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow",
            "border-l-4",
            riskLevel === 'critical' && "border-l-red-500",
            riskLevel === 'high' && "border-l-orange-500",
            riskLevel === 'medium' && "border-l-yellow-500",
            riskLevel === 'low' && "border-l-green-500"
        )}>
            <CardHeader className="pb-4 px-6 pt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <AlertTriangle className={cn(
                                "h-5 w-5",
                                riskLevel === 'critical' && "text-red-600",
                                riskLevel === 'high' && "text-orange-600",
                                riskLevel === 'medium' && "text-yellow-600",
                                riskLevel === 'low' && "text-green-600"
                            )} />
                            {t('title')}
                        </CardTitle>
                        <p className="text-sm font-medium text-muted-foreground mt-1">
                            {t('subtitle')} • Today & Tomorrow
                        </p>
                    </div>
                    <Badge className={cn("text-xs font-bold uppercase", getRiskColor(riskLevel))}>
                        {t(`riskLevel.${riskLevel}`)}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
                {!hasRisks ? (
                    <div className="text-center py-6 text-muted-foreground">
                        <p className="text-sm">{t('empty')}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Understaffed Today */}
                        {understaffedToday.length > 0 && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Users className="h-4 w-4 text-red-600" />
                                    <span className="text-sm font-bold text-red-900 dark:text-red-300">
                                        {t('understaffed')} - {t('today')}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {understaffedToday.map((dept, i) => (
                                        <Badge key={i} variant="destructive" className="text-xs">
                                            {dept}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Understaffed Tomorrow */}
                        {understaffedTomorrow.length > 0 && (
                            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Users className="h-4 w-4 text-amber-600" />
                                    <span className="text-sm font-bold text-amber-900 dark:text-amber-300">
                                        {t('understaffed')} - {t('tomorrow')}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {understaffedTomorrow.map((dept, i) => (
                                        <Badge key={i} variant="secondary" className="text-xs bg-amber-100 text-amber-900">
                                            {dept}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Overlapping Vacations */}
                        {overlappingVacations.length > 0 && (
                            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-bold text-blue-900 dark:text-blue-300">
                                        {t('overlappingVacations')}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {overlappingVacations.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs">
                                            <span className="text-blue-900 dark:text-blue-300">{item.department}</span>
                                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-900 border-blue-300">
                                                {t('employees', { count: item.count })}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Sick Leave Impact */}
                        {sickLeaveImpact.length > 0 && (
                            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Activity className="h-4 w-4 text-purple-600" />
                                    <span className="text-sm font-bold text-purple-900 dark:text-purple-300">
                                        {t('sickLeaveImpact')}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {sickLeaveImpact.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs">
                                            <span className="text-purple-900 dark:text-purple-300">{item.department}</span>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-xs border-purple-300",
                                                    item.severity === 'high' && "bg-red-100 text-red-900",
                                                    item.severity === 'medium' && "bg-amber-100 text-amber-900",
                                                    item.severity === 'low' && "bg-green-100 text-green-900"
                                                )}
                                            >
                                                {t(`riskLevel.${item.severity}`)}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
