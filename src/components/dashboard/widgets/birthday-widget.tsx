"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Gift, Send } from "lucide-react";
import { getUpcomingBirthdays, sendBirthdayGreeting } from "@/lib/actions/dashboard-widgets.actions";
import { toast } from "sonner";
import { format } from "date-fns";

interface BirthdayWidgetProps {
    storeId: string;
    currentUserId: string;
}

export function BirthdayWidget({ storeId, currentUserId }: BirthdayWidgetProps) {
    const [birthdays, setBirthdays] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sentMap, setSentMap] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (storeId) {
            getUpcomingBirthdays(storeId).then(data => {
                setBirthdays(data);
                setLoading(false);
            });
        }
    }, [storeId]);

    const handleSendGreeting = async (targetId: string, name: string) => {
        setSentMap(prev => ({ ...prev, [targetId]: true })); // Optimistic UI
        const res = await sendBirthdayGreeting(targetId, currentUserId);
        if (res.success) {
            toast.success(`Birthday wish sent to ${name}!`);
        } else {
            toast.error("Failed to send wish");
            setSentMap(prev => ({ ...prev, [targetId]: false })); // Revert
        }
    };

    if (loading) return null; // Or skeleton

    return (
        <Card className="">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center">
                    <Gift className="mr-2 h-4 w-4 text-pink-500" />
                    Upcoming Birthdays
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {birthdays.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">No birthdays in the next 30 days.</div>
                ) : (
                    <ScrollArea className="h-[150px] px-4">
                        <div className="space-y-4 py-4">
                            {birthdays.map((emp) => (
                                <div key={emp._id} className="flex items-center justify-between group">
                                    <div className="flex items-center space-x-3">
                                        <Avatar className="h-9 w-9 border-2 border-white ring-1 ring-pink-100">
                                            <AvatarImage src={emp.image} />
                                            <AvatarFallback className="bg-pink-50 text-pink-500">{emp.firstName[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-medium leading-none">{emp.firstName} {emp.lastName}</p>
                                            <div className="flex items-center mt-1.5 gap-2">
                                                <p className="text-xs text-muted-foreground font-medium">
                                                    {format(new Date(emp.nextBirthday), "MMMM do")}
                                                </p>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${emp.daysUntil === 0
                                                    ? "bg-pink-500 text-white animate-pulse"
                                                    : "bg-pink-100 text-pink-700"
                                                    }`}>
                                                    {emp.daysUntil === 0 ? "Today!" : `${emp.daysUntil} days left`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {emp._id !== currentUserId && (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-pink-400 hover:text-pink-600 hover:bg-pink-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Send Greeting"
                                            disabled={sentMap[emp._id]}
                                            onClick={() => handleSendGreeting(emp._id, emp.firstName)}
                                        >
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
