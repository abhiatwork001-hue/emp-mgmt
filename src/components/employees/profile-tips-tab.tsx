"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEmployeeTipsHistory } from "@/lib/actions/tips.actions";
import { Loader2, Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ProfileTipsTabProps {
    employeeId: string;
}

export function ProfileTipsTab({ employeeId }: ProfileTipsTabProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const data = await getEmployeeTipsHistory(employeeId);
            setHistory(data);
            setLoading(false);
        };
        load();
    }, [employeeId]);

    const totalTips = history.reduce((sum, h) => sum + h.myAmount, 0);

    if (loading) {
        return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="grid gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="bg-primary/10 border-primary/20 shadow-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-primary uppercase tracking-wider">Total Tips Earned</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold flex items-center gap-2">
                            <Coins className="w-6 h-6" />
                            €{totalTips.toFixed(2)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>History</CardTitle>
                    <CardDescription>Your tip distributions history.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Period</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right">Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                                        No tips history found.
                                    </TableCell>
                                </TableRow>
                            )}
                            {history.map((h, i) => (
                                <TableRow key={i}>
                                    <TableCell className="font-medium text-xs">
                                        {format(new Date(h.weekStartDate), "MMM d")} - {format(new Date(h.weekEndDate), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-emerald-600">
                                        €{h.myAmount.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={h.status === 'paid' ? 'default' : 'secondary'} className={h.status === 'paid' ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                                            {h.status === 'paid' ? 'Paid' : 'Pending'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground text-xs">
                                        {h.finalizedAt ? format(new Date(h.finalizedAt), "MMM d") : "-"}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
