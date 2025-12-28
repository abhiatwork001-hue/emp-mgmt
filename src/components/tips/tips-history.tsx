"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { getTipsHistory } from "@/lib/actions/tips.actions";
import { Loader2 } from "lucide-react";

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
        <Card>
            <CardHeader>
                <CardTitle>Distribution History</CardTitle>
                <CardDescription>Past weekly distributions.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Week Of</TableHead>
                            <TableHead>Total Amount</TableHead>
                            <TableHead>Staff Count</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {history.map(h => (
                            <TableRow key={h._id}>
                                <TableCell>
                                    {format(new Date(h.weekStartDate), "MMM d")} - {format(new Date(h.weekEndDate), "MMM d, yyyy")}
                                </TableCell>
                                <TableCell className="font-bold text-emerald-600">${h.totalAmount.toFixed(2)}</TableCell>
                                <TableCell>{h.records.length} Employees</TableCell>
                                <TableCell><Badge variant="outline">{h.status}</Badge></TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs">View Details</TableCell>
                            </TableRow>
                        ))}
                        {history.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    No history found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
