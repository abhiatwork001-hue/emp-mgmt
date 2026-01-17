"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertTriangle, FileText } from "lucide-react";
import { useTranslations } from "next-intl";

interface Risk {
    id: string;
    title: string;
    subtitle: string;
    severity: "high" | "medium" | "low";
}

interface ComplianceRisksProps {
    risks: Risk[];
}

export function ComplianceRisks({ risks }: ComplianceRisksProps) {
    const t = useTranslations("OwnerDashboard.risks");

    return (
        <Card className="h-full">
            <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                    {t("title")}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
                {risks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        {t("noRisks")}
                    </div>
                ) : (
                    risks.map((risk) => (
                        <div key={risk.id} className="flex items-start gap-3 p-3 rounded-lg bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                            <div>
                                <h4 className="font-medium text-sm text-red-900 dark:text-red-300">{risk.title}</h4>
                                <p className="text-xs text-red-700/80 dark:text-red-400">{risk.subtitle}</p>
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
