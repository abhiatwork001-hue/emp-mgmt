"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Palmtree } from "lucide-react";
import { getUpcomingHolidays } from "@/lib/actions/dashboard-widgets.actions";

interface HolidayWidgetProps {
    storeId: string;
}

export function HolidayWidget({ storeId }: HolidayWidgetProps) {
    const [holidays, setHolidays] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (storeId) {
            getUpcomingHolidays(storeId).then(data => {
                setHolidays(data);
                setLoading(false);
            });
        }
    }, [storeId]);

    if (loading) return null;

    return (
        <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center">
                    <Palmtree className="mr-2 h-4 w-4 text-amber-500" />
                    Public Holidays (PT)
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {holidays.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">No upcoming holidays found.</div>
                ) : (
                    <ScrollArea className="h-[150px] px-4">
                        <div className="space-y-3 py-4">
                            {holidays.map((h, i) => (
                                <div key={i} className="flex justify-between items-center group">
                                    <div>
                                        <p className="text-sm font-medium leading-none">{h.name}</p>
                                        <div className="flex items-center mt-1.5 gap-2">
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(h.date), "EEE, MMMM do")}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${h.daysUntil <= 7
                                        ? "bg-amber-100 text-amber-700 border border-amber-200"
                                        : "bg-muted text-muted-foreground"
                                        }`}>
                                        {h.daysUntil === 0 ? "Today" : `${h.daysUntil} days`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
