"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Cake, Send, Sparkles } from "lucide-react";
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
        <Card className="border-pink-100/50 bg-gradient-to-br from-pink-50/30 to-purple-50/30">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg">
                        <Cake className="h-4 w-4 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                        Upcoming Birthdays
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {birthdays.length === 0 ? (
                    <div className="p-6 text-center">
                        <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No birthdays in the next 30 days</p>
                    </div>
                ) : (
                    <ScrollArea className="h-[200px] px-4">
                        <div className="space-y-3 py-4">
                            {birthdays.map((emp) => (
                                <div
                                    key={emp._id}
                                    className={`flex items-center justify-between p-3 rounded-xl transition-all hover:shadow-md ${emp.daysUntil === 0
                                            ? 'bg-gradient-to-r from-pink-100 to-purple-100 border-2 border-pink-300 animate-pulse'
                                            : 'bg-white/60 hover:bg-white'
                                        }`}
                                >
                                    <div className="flex items-center space-x-3 flex-1">
                                        <div className="relative">
                                            <Avatar className="h-10 w-10 border-2 border-white ring-2 ring-pink-200">
                                                <AvatarImage src={emp.image} />
                                                <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-400 text-white font-bold">
                                                    {emp.firstName[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            {emp.daysUntil === 0 && (
                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center">
                                                    <Cake className="h-2.5 w-2.5 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate">
                                                {emp.firstName} {emp.lastName}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-xs text-muted-foreground font-medium">
                                                    {format(new Date(emp.nextBirthday), "MMM do")}
                                                </p>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${emp.daysUntil === 0
                                                        ? "bg-pink-500 text-white"
                                                        : "bg-pink-100 text-pink-700"
                                                    }`}>
                                                    {emp.daysUntil === 0 ? "🎂 Today!" : `${emp.daysUntil}d`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {emp._id !== currentUserId && (
                                        <Button
                                            size="sm"
                                            variant={emp.daysUntil === 0 ? "default" : "ghost"}
                                            className={`ml-2 gap-1.5 ${emp.daysUntil === 0
                                                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg'
                                                    : 'text-pink-500 hover:text-pink-600 hover:bg-pink-50'
                                                }`}
                                            disabled={sentMap[emp._id]}
                                            onClick={() => handleSendGreeting(emp._id, emp.firstName)}
                                        >
                                            {sentMap[emp._id] ? (
                                                <>
                                                    <Sparkles className="h-3.5 w-3.5" />
                                                    <span className="text-xs font-medium">Sent!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="h-3.5 w-3.5" />
                                                    <span className="text-xs font-medium">Wish</span>
                                                </>
                                            )}
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
