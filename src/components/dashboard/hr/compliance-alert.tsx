"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

interface ComplianceAlertProps {
    type: 'schedule' | 'compliance' | 'urgent';
    title: string;
    message: string;
    affectedItems?: string[];
    actionLink?: string;
    actionLabel?: string;
}

export function ComplianceAlert({
    type,
    title,
    message,
    affectedItems = [],
    actionLink = '/dashboard/schedules',
    actionLabel
}: ComplianceAlertProps) {
    const t = useTranslations("Dashboard.hr.alerts");

    return (
        <Card className="border-l-4 border-l-destructive bg-destructive/5 dark:bg-destructive/10 rounded-xl shadow-md">
            <div className="p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Left side - Alert content */}
                    <div className="flex items-start gap-3 flex-1">
                        <div className="shrink-0 mt-0.5">
                            <div className="h-10 w-10 rounded-full bg-destructive/10 dark:bg-destructive/20 flex items-center justify-center">
                                <AlertCircle className="h-5 w-5 text-destructive animate-pulse" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-base font-bold text-destructive">
                                    {title}
                                </h3>
                                <Badge variant="destructive" className="text-xs font-bold uppercase px-2 py-0.5">
                                    {type === 'urgent' ? t('urgent') : t('delayed')}
                                </Badge>
                            </div>
                            <p className="text-sm text-foreground/80 mb-3">
                                {message}
                            </p>
                            {affectedItems.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {affectedItems.slice(0, 5).map((item, i) => (
                                        <Badge
                                            key={i}
                                            variant="outline"
                                            className="text-xs bg-destructive/5 dark:bg-destructive/10 text-destructive border-destructive/30"
                                        >
                                            {item}
                                        </Badge>
                                    ))}
                                    {affectedItems.length > 5 && (
                                        <Badge
                                            variant="outline"
                                            className="text-xs bg-muted text-muted-foreground"
                                        >
                                            +{affectedItems.length - 5} more
                                        </Badge>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right side - Action button */}
                    <div className="shrink-0">
                        <Button
                            asChild
                            variant="destructive"
                            className="w-full md:w-auto font-bold"
                        >
                            <Link href={actionLink}>
                                {actionLabel || t('viewDetails')}
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}
