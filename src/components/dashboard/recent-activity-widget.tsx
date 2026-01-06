"use client";

import { useEffect, useState } from "react";
import { getActionLogs } from "@/lib/actions/log.actions";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, ArrowRight, UserPlus, FileText, Calendar, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { EmployeeLink } from "../common/employee-link";

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
        <Card glass premium className="border-border/40 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between py-5 bg-primary/5 border-b border-border/10">
                <CardTitle className="text-sm font-black tracking-widest flex items-center gap-2 text-primary">
                    <div className="relative">
                        <Activity className="h-5 w-5 animate-pulse" />
                    </div>
                    RECENT ACTIVITY
                </CardTitle>
                <Link href="/dashboard/activity-log">
                    <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest h-7 px-3 bg-background/50 hover:bg-primary/10 hover:text-primary">
                        View Log
                        <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                </Link>
            </CardHeader>
            <CardContent className="px-0 py-0">
                {loading ? (
                    <div className="space-y-4 p-5">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex gap-3 animate-pulse">
                                <div className="h-8 w-8 rounded-full bg-muted/50" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-3 w-3/4 bg-muted/50 rounded" />
                                    <div className="h-2 w-1/4 bg-muted/50 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="py-16 text-center text-muted-foreground text-xs font-medium uppercase tracking-widest flex flex-col items-center gap-3">
                        <Activity className="h-8 w-8 opacity-20" />
                        No recent activity recorded
                    </div>
                ) : (
                    <div className="divide-y divide-border/10">
                        {logs.map((log) => (
                            <div key={log._id} className="p-4 flex items-start gap-4 hover:bg-primary/5 transition-colors group">
                                <div className="relative shrink-0">
                                    <Avatar className="h-9 w-9 border border-border/50 shadow-sm">
                                        <AvatarImage src={log.performedBy?.image} />
                                        <AvatarFallback className="text-[10px] font-bold bg-muted text-muted-foreground">
                                            {log.performedBy ? log.performedBy.firstName[0] : "S"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border shadow-sm ring-1 ring-background">
                                        {getIcon(log.action)}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium leading-normal mb-0.5 group-hover:text-primary transition-colors">
                                        <EmployeeLink
                                            employeeId={log.performedBy?._id}
                                            slug={log.performedBy?.slug}
                                            name={log.performedBy ? `${log.performedBy.firstName} ${log.performedBy.lastName}` : "System"}
                                            currentUserRoles={userRoles || []}
                                            className="font-bold text-foreground"
                                        />
                                        {" "}
                                        <span className="text-muted-foreground font-normal lowercase">
                                            {log.action.replace(/_/g, " ")}
                                        </span>
                                    </p>
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight flex items-center gap-1">
                                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                                        {log.storeId?.name && (
                                            <>
                                                <span className="text-border/60">•</span>
                                                <span className="text-primary/70">{log.storeId.name}</span>
                                            </>
                                        )}
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
