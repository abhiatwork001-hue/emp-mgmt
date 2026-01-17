"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PendingApprovalsProps {
    data: {
        vacations: number;
        schedules: number;
        exceptions: number;
        total: number;
    };
}

export function PendingApprovalsWidget({ data }: PendingApprovalsProps) {
    if (!data) return null; // Or return a loading state / empty state

    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center justify-between">
                    Pending Approvals
                    {data.total > 0 && <Badge variant="secondary">{data.total}</Badge>}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col items-center p-2 bg-accent/50 rounded-lg text-center border border-border/50">
                            <Calendar className="h-5 w-5 text-blue-500 mb-1" />
                            <span className="text-xl font-bold">{data.vacations}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">Vacation</span>
                        </div>
                        <div className="flex flex-col items-center p-2 bg-accent/50 rounded-lg text-center border border-border/50">
                            <Clock className="h-5 w-5 text-orange-500 mb-1" />
                            <span className="text-xl font-bold">{data.schedules}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">Schedule</span>
                        </div>
                        <div className="flex flex-col items-center p-2 bg-accent/50 rounded-lg text-center border border-border/50">
                            <AlertCircle className="h-5 w-5 text-red-500 mb-1" />
                            <span className="text-xl font-bold">{data.exceptions}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">Issues</span>
                        </div>
                    </div>

                    <Button variant="outline" className="w-full text-xs" asChild>
                        <Link href="/dashboard/approvals">
                            Review All <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
