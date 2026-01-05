"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { checkUpcomingVacationRisks } from "@/lib/actions/vacation.actions";
import { AlertCircle, Calendar, Users, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export function StaffingAlerts() {
    const [risks, setRisks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const data = await checkUpcomingVacationRisks();
            setRisks(data);
            setLoading(false);
        };
        fetchData();
    }, []);

    if (loading || risks.length === 0) return null;

    return (
        <Card className="border-red-500/20 bg-red-500/5 backdrop-blur-sm shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
            <CardHeader className="pb-3 border-b border-red-500/10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="p-2 bg-red-500/10 rounded-full">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold text-red-900 dark:text-red-400">Critical Staffing Risks</CardTitle>
                            <CardDescription className="text-xs text-red-700/70 dark:text-red-400/70">
                                Upcoming vacations will drop headcount below minimum required.
                            </CardDescription>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-4 px-0">
                <div className="space-y-1">
                    {risks.map((risk, idx) => (
                        <div key={idx} className="flex items-center justify-between px-4 py-3 hover:bg-red-500/10 transition-colors group">
                            <div className="flex items-center space-x-4">
                                <div className="text-center min-w-[60px]">
                                    <div className="text-xs font-bold text-red-900/60 dark:text-red-400/60 uppercase">
                                        {format(new Date(risk.date), 'MMM')}
                                    </div>
                                    <div className="text-lg font-black text-red-900 dark:text-red-200">
                                        {format(new Date(risk.date), 'dd')}
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <span className="font-semibold text-red-900 dark:text-red-200">{risk.storeName} &middot; {risk.deptName}</span>
                                        <Badge variant="outline" className="border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400 text-[10px] h-4">
                                            Understaffed
                                        </Badge>
                                    </div>
                                    <div className="flex items-center mt-1 text-xs text-red-700 dark:text-red-400/80">
                                        <Users className="h-3 w-3 mr-1" />
                                        <span>Active: <b>{risk.activeCount}</b> / Min: {risk.minRequired}</span>
                                        <span className="mx-2">•</span>
                                        <span>Need {risk.missing} more</span>
                                    </div>
                                </div>
                            </div>
                            <Link href={risk.scheduleSlug ? `/dashboard/schedules/${risk.scheduleSlug}` : "/dashboard/vacations"} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/20 rounded-full text-red-600">
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
