"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ArrowRight, Filter, ShieldAlert } from "lucide-react";
import { getAuditLogs } from "@/lib/actions/audit.actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface Log {
    _id: string;
    action: string;
    performedBy: {
        _id: string;
        firstName: string;
        lastName: string;
        image?: string;
        email: string;
    };
    storeId?: {
        name: string;
        slug: string;
    };
    targetModel: string;
    details: any;
    createdAt: string;
}

export default function ActivityLogsPage() {
    const { data: session, status } = useSession(); // Access session properly
    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
    const [error, setError] = useState("");
    const t = useTranslations("Common"); // Assuming Common namespace exists
    const router = useRouter();

    const fetchLogs = async (currentPage: number) => {
        if (!session?.user) return; // Wait for session

        setLoading(true);
        setError("");

        // Safe access to user ID
        const userId = (session.user as any)?.id;

        if (!userId) {
            setError("User ID not found in session.");
            setLoading(false);
            return;
        }

        try {
            const res = await getAuditLogs({
                userId: userId,
                page: currentPage,
                limit: 15
            });

            if (res.success && res.pagination) {
                setLogs(res.logs);
                setPagination(res.pagination);
            } else {
                setError(res.error || "Failed to load logs");
                if (res.error === "Access Denied" || res.error === "Unauthorized") {
                    // Start a countdown or redirect? Just showing error for now.
                }
            }
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (status === "authenticated") {
            fetchLogs(page);
        } else if (status === "unauthenticated") {
            router.push("/login"); // Redirect if not logged in
        }
    }, [page, status]); // Depend on status to trigger fetch once loaded

    const getActionBadge = (action: string) => {
        let color = "bg-primary/10 text-primary hover:bg-primary/20";
        if (action.includes("REJECTED") || action.includes("DELETE") || action.includes("PROBLEM")) color = "bg-destructive/10 text-destructive hover:bg-destructive/20";
        else if (action.includes("APPROVED") || action.includes("CREATE")) color = "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20";
        else if (action.includes("UPDATE") || action.includes("EDIT")) color = "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20";

        // Friendly Name Formatter
        const friendlyName = action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

        return <Badge className={`font-normal ${color}`}>{friendlyName}</Badge>;
    };

    if (status === "loading") {
        return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    if (error === "Access Denied") {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <ShieldAlert className="h-16 w-16 text-muted-foreground/50" />
                <h2 className="text-xl font-semibold">Access Restricted</h2>
                <p className="text-muted-foreground max-w-sm">
                    You do not have permission to view activity logs. This area is restricted to Administrators, HR, and Owners.
                </p>
                <Button onClick={() => router.back()} variant="outline">Go Back</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
                    <p className="text-muted-foreground mt-1">Audit trail of important system actions</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchLogs(page)}>
                    <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <Card className="border-border/50 shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-[200px]">Date & Time</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead className="text-right">Reference</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No activity logs found matching your permissions.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log._id} className="group hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={log.performedBy?.image} />
                                                    <AvatarFallback>{log.performedBy?.firstName?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{log.performedBy?.firstName} {log.performedBy?.lastName}</span>
                                                    <span className="text-xs text-muted-foreground">{log.performedBy?.email}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getActionBadge(log.action)}
                                        </TableCell>
                                        <TableCell className="max-w-[300px]">
                                            <div className="text-sm truncate" title={JSON.stringify(log.details)}>
                                                {log.details ? (
                                                    <>
                                                        {log.details.reason && <span>Reason: {log.details.reason} </span>}
                                                        {log.details.status && <Badge variant="outline" className="text-[10px] h-4 px-1 ml-1">{log.details.status}</Badge>}
                                                        {log.details.approvedBy && <span className="text-xs text-muted-foreground ml-1">(Appr. by {log.details.approvedBy})</span>}
                                                    </>
                                                ) : <span className="text-muted-foreground">-</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                            {log.storeId?.name || "Global"}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-border/40 pt-4">
                <div className="text-xs text-muted-foreground">
                    Page {page} of {pagination.totalPages}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page <= 1 || loading}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page >= pagination.totalPages || loading}
                    >
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
