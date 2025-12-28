"use client";

import { cn } from "@/lib/utils";
import { Briefcase, MapPin, CalendarDays, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface PositionHistoryItem {
    positionId?: { name: string };
    storeId?: { name: string };
    storeDepartmentId?: { name: string };
    from: string | Date;
    to?: string | Date;
    reason?: string;
}

interface PositionHistoryListProps {
    history: PositionHistoryItem[];
}

export function PositionHistoryList({ history }: PositionHistoryListProps) {
    const t = useTranslations("Profile");

    if (!history || history.length === 0) {
        return (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-muted-foreground font-medium">{t("noHistory")}</h3>
                <p className="text-sm text-muted-foreground/60 mt-1">{t("noHistoryDescription")}</p>
            </div>
        );
    }

    // Sort by date descending (newest first)
    const sortedHistory = [...history].sort((a, b) => new Date(b.from).getTime() - new Date(a.from).getTime());

    return (
        <div className="space-y-8 relative pl-4">
            {/* Vertical Line */}
            <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-border" />

            {sortedHistory.map((item, index) => {
                const isCurrent = !item.to;
                return (
                    <div key={index} className="relative flex items-start gap-6 group">
                        {/* Timeline Dot */}
                        <div className={cn(
                            "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-4 border-background shadow-sm transition-all",
                            isCurrent ? "bg-blue-600 ring-4 ring-blue-600/20" : "bg-muted"
                        )}>
                            <Briefcase className="h-4 w-4 text-white" />
                        </div>

                        {/* Card */}
                        <div className={cn(
                            "flex-1 rounded-xl border p-5 transition-all",
                            isCurrent
                                ? "bg-muted/50 border-blue-900/50 hover:border-blue-700/50"
                                : "bg-muted/30 border-border hover:border-muted-foreground/30"
                        )}>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                <h4 className={cn("text-lg font-semibold", isCurrent ? "text-blue-400" : "text-foreground")}>
                                    {item.positionId?.name || "Unknown Position"}
                                </h4>
                                {isCurrent && (
                                    <Badge className="bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 border-blue-800">
                                        {t("currentRole")}
                                    </Badge>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-y-2 gap-x-4 text-sm text-zinc-400 mb-3">
                                {item.storeId?.name && (
                                    <div className="flex items-center gap-1.5">
                                        <MapPin className="h-3.5 w-3.5" />
                                        <span>{item.storeId.name}</span>
                                    </div>
                                )}
                                {item.storeDepartmentId?.name && (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted text-xs">
                                        <span>{item.storeDepartmentId.name}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-zinc-500 border-t border-zinc-800/50 pt-3 mt-3">
                                <CalendarDays className="h-3.5 w-3.5" />
                                <span>
                                    {new Date(item.from).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                                <ArrowRight className="h-3 w-3" />
                                <span>
                                    {item.to
                                        ? new Date(item.to).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
                                        : t("present")}
                                </span>

                                {item.reason && (
                                    <span className="ml-auto italic opacity-70">
                                        "{item.reason}"
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
