"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { getTipsHistory } from "@/lib/actions/tips.actions";
import { Loader2 } from "lucide-react";
import { TipsChart } from "@/components/tips/tips-chart";

interface TipsHistoryProps {
    storeId: string;
}

export function TipsHistory({ storeId }: TipsHistoryProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
        setLoading(true);
        const data = await getTipsHistory(storeId);
        setHistory(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchHistory();
    }, [storeId]);

    if (loading) return <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />;

    return (
        <Card className="h-full flex flex-col border-border/50 shadow-sm">
            <CardHeader className="pb-4">
                <CardTitle>Distribution History</CardTitle>
                <CardDescription>Past weekly distributions and trends.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 flex-1 text-card-foreground">
                {history.length > 0 && <TipsChart data={history} />}

                <div className="rounded-md border border-border/50 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-[140px]">Period</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Staff</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.map(h => (
                                <TableRow key={h._id} className="hover:bg-muted/50 transition-colors">
                                    <TableCell className="text-xs font-mono text-muted-foreground">
                                        {format(new Date(h.weekStartDate), "MMM d")} - {format(new Date(h.weekEndDate), "MMM d")}
                                    </TableCell>
                                    <TableCell className="font-bold text-emerald-500">${h.totalAmount.toFixed(2)}</TableCell>
                                    <TableCell className="text-muted-foreground text-xs">{h.records.length}</TableCell>
                                    <TableCell className="text-right text-primary text-xs font-medium cursor-pointer hover:underline">
                                        View
                                    </TableCell>
                                </TableRow>
                            ))}
                            {history.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        No history found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
