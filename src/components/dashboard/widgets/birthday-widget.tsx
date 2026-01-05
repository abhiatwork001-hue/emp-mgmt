"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Cake, Send, Sparkles, MessageCircle, Calendar } from "lucide-react";
import { getUpcomingBirthdays, sendBirthdayGreeting } from "@/lib/actions/dashboard-widgets.actions";
import { toast } from "sonner";
import { format } from "date-fns";
import { QuickMessageDialog } from "@/components/messages/quick-message-dialog";
import { cn } from "@/lib/utils";

interface BirthdayWidgetProps {
    storeId: string;
    currentUserId: string;
    className?: string;
}

export function BirthdayWidget({ storeId, currentUserId, className }: BirthdayWidgetProps) {
    const [birthdays, setBirthdays] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sentMap, setSentMap] = useState<Record<string, boolean>>({});

    useEffect(() => {
        getUpcomingBirthdays(storeId).then(data => {
            setBirthdays(data);
            setLoading(false);
        });
    }, [storeId]);

    const handleSendGreeting = async (targetId: string, name: string) => {
        setSentMap(prev => ({ ...prev, [targetId]: true })); // Optimistic UI
        const res = await sendBirthdayGreeting(targetId, currentUserId);
        if (res.success) {
            toast.success(`🎉 Birthday wish sent to ${name}!`);
        } else {
            toast.error("Failed to send wish");
            setSentMap(prev => ({ ...prev, [targetId]: false })); // Revert
        }
    };

    if (loading) return null;

    return (
        <Card className="border-l-4 border-l-pink-500 h-full flex flex-col shadow-sm">
            <CardHeader className="pb-3 shrink-0">
                <CardTitle className="text-base font-medium flex items-center">
                    <Cake className="mr-2 h-4 w-4 text-pink-500" />
                    Birthdays
                    {birthdays.length > 0 && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {birthdays.length}
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0">
                {birthdays.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">No upcoming birthdays.</p>
                    </div>
                ) : (
                    <ScrollArea className="h-full px-4">
                        <div className="space-y-3 py-4">
                            {birthdays.map((emp) => (
                                <div
                                    key={emp._id}
                                    className="flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                                        <div className="relative shrink-0">
                                            <Avatar className={cn("h-8 w-8 border shadow-sm", emp.daysUntil === 0 && "ring-2 ring-pink-500 ring-offset-2")}>
                                                <AvatarImage src={emp.image} />
                                                <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">{emp.firstName[0]}</AvatarFallback>
                                            </Avatar>
                                            {emp.daysUntil === 0 && (
                                                <div className="absolute -top-1 -right-1 z-10 flex h-3 w-3 items-center justify-center rounded-full bg-pink-500 ring-2 ring-background">
                                                    <Cake className="h-2 w-2 text-white" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-medium truncate text-foreground">
                                                {emp.firstName} {emp.lastName}
                                            </span>
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(emp.nextBirthday), "MMM do")}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "text-[10px] px-2 py-0.5 rounded-full font-medium border whitespace-nowrap",
                                            emp.daysUntil === 0
                                                ? "bg-pink-100 text-pink-700 border-pink-200"
                                                : emp.daysUntil <= 7
                                                    ? "bg-pink-50 text-pink-600 border-pink-100"
                                                    : "bg-muted/50 text-muted-foreground border-border/50"
                                        )}>
                                            {emp.daysUntil === 0 ? "Today!" : `${emp.daysUntil} days`}
                                        </span>

                                        {emp._id !== currentUserId && emp.daysUntil <= 1 && (
                                            <QuickMessageDialog
                                                recipientId={emp._id}
                                                recipientName={`${emp.firstName} ${emp.lastName}`}
                                                recipientImage={emp.image}
                                                currentUser={{ id: currentUserId }}
                                                defaultMessage={`Happy Birthday ${emp.firstName}! 🎉🎂`}
                                                trigger={
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-pink-600 hover:bg-pink-50"
                                                    >
                                                        <Send className="h-3.5 w-3.5" />
                                                    </Button>
                                                }
                                            />
                                        )}
                                    </div>
                                </div>

                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
