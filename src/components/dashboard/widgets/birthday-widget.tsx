"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Cake, Send, Sparkles, Gift } from "lucide-react";
import { getUpcomingBirthdays, sendBirthdayGreeting } from "@/lib/actions/dashboard-widgets.actions";
import { toast } from "sonner";
import { format } from "date-fns";
import { QuickMessageDialog } from "@/components/messages/quick-message-dialog";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// ... (imports remain)
import { useTranslations } from "next-intl";

interface BirthdayWidgetProps {
    storeId?: string;
    currentUserId: string;
    className?: string;
}

export function BirthdayWidget({ storeId, currentUserId, className }: BirthdayWidgetProps) {
    const [birthdays, setBirthdays] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const t = useTranslations("Dashboard.widgets.birthdayWidget");

    useEffect(() => {
        getUpcomingBirthdays(storeId).then(data => {
            setBirthdays(data);
            setLoading(false);
        });
    }, [storeId]);

    if (loading) return null;

    return (
        <Card className={cn("border-l-4 border-l-pink-500 shadow-sm h-full flex flex-col overflow-hidden", className)}>
            <CardHeader className="bg-pink-500/5 border-b border-pink-500/10 py-4 shrink-0">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-pink-700">
                        <Gift className="h-5 w-5 text-pink-500 animate-pulse" />
                        {t('title')}
                    </CardTitle>
                    {birthdays.length > 0 && (
                        <Badge variant="secondary" className="bg-pink-500/10 text-pink-600 border-pink-200 font-bold">
                            {t('comingUp', { count: birthdays.length })}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0">
                {birthdays.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
                        <div className="h-12 w-12 rounded-full bg-pink-50 flex items-center justify-center">
                            <Sparkles className="h-6 w-6 text-pink-400" />
                        </div>
                        <div>
                            <p className="font-semibold text-foreground">{t('emptyTitle')}</p>
                            <p className="text-xs text-muted-foreground">{t('emptyDesc')}</p>
                        </div>
                    </div>
                ) : (
                    <ScrollArea className="h-full">
                        <div className="divide-y divide-border/50">
                            {birthdays.map((emp) => (
                                <div
                                    key={emp._id}
                                    className={cn(
                                        "flex items-center gap-3 p-4 transition-colors hover:bg-pink-50/30",
                                        emp.daysUntil === 0 && "bg-pink-50/50"
                                    )}
                                >
                                    <div className="relative shrink-0">
                                        <Avatar className={cn("h-10 w-10 border-2", emp.daysUntil === 0 ? "border-pink-500 shadow-pink-200 shadow-md" : "border-background shadow-sm")}>
                                            <AvatarImage src={emp.image} />
                                            <AvatarFallback className="bg-pink-50 text-pink-600 font-bold">{emp.firstName[0]}</AvatarFallback>
                                        </Avatar>
                                        {emp.daysUntil === 0 && (
                                            <div className="absolute -top-1 -right-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 ring-2 ring-white">
                                                <Cake className="h-2.5 w-2.5 text-white" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="text-sm font-bold truncate text-foreground flex items-center gap-2">
                                            {emp.firstName} {emp.lastName}
                                            {emp.daysUntil === 0 && <span className="text-[10px] bg-pink-500 text-white px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider animate-pulse">{t('today')}</span>}
                                        </span>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Cake className="h-3 w-3" />
                                            {format(new Date(emp.nextBirthday), "MMMM do")}
                                            <span className="text-muted-foreground/50">•</span>
                                            {emp.daysUntil === 0 ? t('happyBirthday') : t('inDays', { days: emp.daysUntil })}
                                        </span>
                                    </div>

                                    {emp._id !== currentUserId && emp.daysUntil <= 3 && (
                                        <QuickMessageDialog
                                            recipientId={emp._id}
                                            recipientName={`${emp.firstName} ${emp.lastName}`}
                                            recipientImage={emp.image}
                                            currentUser={{ id: currentUserId }}
                                            defaultMessage={t('defaultMessage', { name: emp.firstName })}
                                            trigger={
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-pink-400 hover:text-pink-600 hover:bg-pink-100 rounded-full"
                                                >
                                                    <Send className="h-4 w-4" />
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
