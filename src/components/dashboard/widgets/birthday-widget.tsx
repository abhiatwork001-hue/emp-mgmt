"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Cake, Send, Sparkles, MessageCircle } from "lucide-react";
import { getUpcomingBirthdays, sendBirthdayGreeting } from "@/lib/actions/dashboard-widgets.actions";
import { toast } from "sonner";
import { format } from "date-fns";
import { QuickMessageDialog } from "@/components/messages/quick-message-dialog";

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
        <Card className="border-pink-100/50 bg-gradient-to-br from-pink-50/30 to-purple-50/30 h-full flex flex-col">
            <CardHeader className="pb-3 shrink-0">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg shadow-sm">
                        <Cake className="h-4 w-4 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                        Upcoming Birthdays
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0">
                {birthdays.length === 0 ? (
                    <div className="p-6 text-center flex flex-col items-center justify-center h-full"> // Center empty state
                        <Sparkles className="h-8 w-8 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">No birthdays coming up</p>
                    </div>
                ) : (
                    <ScrollArea className="h-full">
                        <div className="space-y-2 p-4 pt-0">
                            {birthdays.map((emp) => (
                                <div
                                    key={emp._id}
                                    className={`flex items-center justify-between p-2.5 rounded-xl transition-all border ${emp.daysUntil === 0
                                        ? 'bg-gradient-to-r from-pink-100/80 to-purple-100/80 border-pink-200 shadow-sm'
                                        : 'bg-white/60 border-transparent hover:bg-white hover:shadow-sm'
                                        }`}
                                >
                                    <div className="flex items-center space-x-3 flex-1 overflow-hidden">
                                        <div className="relative shrink-0">
                                            <Avatar className={`h-9 w-9 border-2 ${emp.daysUntil === 0 ? 'border-pink-200 ring-2 ring-pink-100' : 'border-white'}`}>
                                                <AvatarImage src={emp.image} />
                                                <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-400 text-white font-bold text-xs">
                                                    {emp.firstName[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            {emp.daysUntil === 0 && (
                                                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-pink-500 rounded-full flex items-center justify-center shadow-sm">
                                                    <Cake className="h-2 w-2 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`text-sm font-semibold truncate ${emp.daysUntil === 0 ? 'text-pink-900' : 'text-foreground'}`}>
                                                    {emp.firstName} {emp.lastName}
                                                </p>
                                                {emp.daysUntil === 0 && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-pink-500 text-white shrink-0 shadow-sm">
                                                        Today!
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-muted-foreground font-medium">
                                                    {format(new Date(emp.nextBirthday), "MMM do")}
                                                </p>
                                                {emp.daysUntil > 0 && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-secondary text-secondary-foreground">
                                                        In {emp.daysUntil}d
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {emp._id !== currentUserId && (
                                        <QuickMessageDialog
                                            recipientId={emp._id}
                                            recipientName={`${emp.firstName} ${emp.lastName}`}
                                            recipientImage={emp.image}
                                            currentUser={{ id: currentUserId }}
                                            defaultMessage={`Happy Birthday ${emp.firstName}! 🎉🎂`}
                                            trigger={
                                                <Button
                                                    size="sm"
                                                    variant={emp.daysUntil === 0 ? "default" : "ghost"}
                                                    className={`ml-2 h-7 px-2.5 shrink-0 ${emp.daysUntil === 0
                                                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 shadow-sm'
                                                        : 'text-pink-500 hover:text-pink-600 hover:bg-pink-50'
                                                        }`}
                                                >
                                                    <Send className="h-3.5 w-3.5 mr-1.5" />
                                                    <span className="text-xs font-medium">Wish</span>
                                                </Button>
                                            }
                                        />
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
