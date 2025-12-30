"use client";

import { useEffect, useState } from "react";
import { getActionLogs } from "@/lib/actions/log.actions";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, ArrowRight, UserPlus, FileText, Calendar, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export function RecentActivityWidget({ userId, userRoles }: { userId?: string, userRoles?: string[] }) {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            const data = await getActionLogs({ limit: 6, userId, userRoles });
            setLogs(data);
            setLoading(false);
        };
        fetchLogs();
    }, [userId, userRoles]);

    const getIcon = (action: string) => {
        if (action.includes("EMPLOYEE")) return <UserPlus className="h-3 w-3 text-blue-500" />;
        if (action.includes("SCHEDULE")) return <Calendar className="h-3 w-3 text-orange-500" />;
        if (action.includes("VACATION")) return <CheckCircle2 className="h-3 w-3 text-green-500" />;
        return <FileText className="h-3 w-3 text-muted-foreground" />;
    };

    return (
        <Card className="shadow-sm border-muted/60">
            <CardHeader className="flex flex-row items-center justify-between py-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Recent Activity
                </CardTitle>
                <Link href="/dashboard/activity-log">
                    <Button variant="ghost" size="sm" className="text-xs h-8">
                        View All
                        <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                </Link>
            </CardHeader>
            <CardContent className="px-1 py-0">
                {loading ? (
                    <div className="space-y-4 p-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex gap-3 animate-pulse">
                                <div className="h-8 w-8 rounded-full bg-muted" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-3 w-3/4 bg-muted rounded" />
                                    <div className="h-2 w-1/4 bg-muted rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm italic">
                        No recent activity recorded.
                    </div>
                ) : (
                    <div className="divide-y divide-muted/40">
                        {logs.map((log) => (
                            <div key={log._id} className="p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                                <div className="relative">
                                    <Avatar className="h-9 w-9 border">
                                        <AvatarImage src={log.performedBy?.image} />
                                        <AvatarFallback className="text-xs">
                                            {log.performedBy ? log.performedBy.firstName[0] : "S"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border shadow-sm">
                                        {getIcon(log.action)}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium leading-normal mb-0.5">
                                        <span className="font-bold text-foreground">
                                            {log.performedBy ? `${log.performedBy.firstName} ${log.performedBy.lastName}` : "System"}
                                        </span>
                                        {" "}
                                        <span className="text-muted-foreground font-normal lowercase">
                                            {log.action.replace(/_/g, " ")}
                                        </span>
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                                        {log.storeId?.name && ` • ${log.storeId.name}`}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
