"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, FileX, UserX, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

interface ComplianceWidgetProps {
    expiringDocs?: number;
    missingContracts?: number;
    incompleteProfiles?: number;
    urgentCount?: number;
}

export function ComplianceWidget({
    expiringDocs = 0,
    missingContracts = 0,
    incompleteProfiles = 0,
    urgentCount = 0
}: ComplianceWidgetProps) {
    const t = useTranslations("Dashboard.hr.compliance");

    const items = [
        {
            label: t('expiringDocs'),
            count: expiringDocs,
            icon: FileText,
            link: '/dashboard/employees',
            color: 'text-amber-600'
        },
        {
            label: t('missingContracts'),
            count: missingContracts,
            icon: FileX,
            link: '/dashboard/employees',
            color: 'text-red-600'
        },
        {
            label: t('incompleteProfiles'),
            count: incompleteProfiles,
            icon: UserX,
            link: '/dashboard/employees',
            color: 'text-blue-600'
        }
    ];

    const totalIssues = expiringDocs + missingContracts + incompleteProfiles;

    return (
        <Card className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-amber-500">
            <CardHeader className="pb-4 px-6 pt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-amber-600" />
                            {t('title')}
                        </CardTitle>
                    </div>
                    {urgentCount > 0 && (
                        <Badge variant="destructive" className="text-xs font-bold">
                            {t('urgent', { count: urgentCount })}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
                {totalIssues === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                        <p className="text-sm">{t('empty')}</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            {items.map((item, index) => {
                                if (item.count === 0) return null;
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={index}
                                        href={item.link}
                                        className="block group"
                                    >
                                        <div className="flex items-center justify-between p-3 rounded-lg border hover:border-primary transition-all hover:shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <Icon className={`h-5 w-5 ${item.color}`} />
                                                <span className="text-sm font-medium">{item.label}</span>
                                            </div>
                                            <Badge variant="secondary" className="text-sm font-bold">
                                                {item.count}
                                            </Badge>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                        <div className="mt-4 flex justify-end">
                            <Button variant="outline" size="sm" asChild>
                                <Link href="/dashboard/employees">
                                    {t('viewAll')}
                                </Link>
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
