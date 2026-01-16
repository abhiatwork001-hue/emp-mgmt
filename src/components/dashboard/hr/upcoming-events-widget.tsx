"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plane, UserX, AlertTriangle } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { format, addDays } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";
import { Link } from "@/i18n/routing";

interface UpcomingEvent {
    date: Date;
    type: 'vacation' | 'absence' | 'shortage';
    employee?: string;
    department?: string;
}

interface UpcomingEventsWidgetProps {
    events?: UpcomingEvent[];
}

export function UpcomingEventsWidget({ events = [] }: UpcomingEventsWidgetProps) {
    const t = useTranslations("Dashboard.hr.upcoming");
    const locale = useLocale();
    const dateLocale = locale === 'pt' ? ptBR : enUS;

    // Filter events for next 7-14 days
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const fourteenDaysFromNow = addDays(now, 14);

    const filteredEvents = events.filter(event => {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= now && eventDate <= fourteenDaysFromNow;
    });

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'vacation': return Plane;
            case 'absence': return UserX;
            case 'shortage': return AlertTriangle;
            default: return Calendar;
        }
    };

    const getEventColor = (type: string) => {
        switch (type) {
            case 'vacation': return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'absence': return 'text-red-600 bg-red-50 border-red-200';
            case 'shortage': return 'text-amber-600 bg-amber-50 border-amber-200';
            default: return 'text-muted-foreground bg-muted border-border';
        }
    };

    const getEventLabel = (type: string) => {
        switch (type) {
            case 'vacation': return t('vacations');
            case 'absence': return t('absences');
            case 'shortage': return t('shortages');
            default: return '';
        }
    };

    return (
        <Card className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-4 px-6 pt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            {t('title')}
                        </CardTitle>
                        <p className="text-xs font-medium text-muted-foreground mt-1">
                            Next 14 days
                        </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/dashboard/vacations">
                            {t('viewCalendar')}
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
                {filteredEvents.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                        <p className="text-sm">{t('empty')}</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        {filteredEvents.map((event, index) => {
                            const Icon = getEventIcon(event.type);
                            return (
                                <div
                                    key={index}
                                    className={`p-3 rounded-lg border flex items-center gap-3 ${getEventColor(event.type)}`}
                                >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold">
                                                {format(new Date(event.date), 'MMM dd', { locale: dateLocale })}
                                            </span>
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                {getEventLabel(event.type)}
                                            </Badge>
                                        </div>
                                        <p className="text-xs truncate">
                                            {event.employee || event.department || '-'}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
