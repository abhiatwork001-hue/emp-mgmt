"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";
import { Link } from "@/i18n/routing";
import { useState } from "react";

interface Announcement {
    id: string;
    title: string;
    createdAt: Date;
    isUrgent?: boolean;
}

interface AnnouncementsWidgetProps {
    announcements?: Announcement[];
}

export function AnnouncementsWidget({ announcements = [] }: AnnouncementsWidgetProps) {
    const t = useTranslations("Dashboard.hr.announcements");
    const locale = useLocale();
    const dateLocale = locale === 'pt' ? ptBR : enUS;
    const [currentIndex, setCurrentIndex] = useState(0);

    const hasAnnouncements = announcements.length > 0;
    const currentAnnouncement = hasAnnouncements ? announcements[currentIndex] : null;

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : announcements.length - 1));
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev < announcements.length - 1 ? prev + 1 : 0));
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Megaphone className="h-5 w-5 text-primary" />
                        {t('title')}
                    </CardTitle>
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/dashboard/notices/new">
                            <Plus className="h-4 w-4 mr-1" />
                            {t('createNew')}
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {!hasAnnouncements ? (
                    <div className="text-center py-6 text-muted-foreground">
                        <p className="text-sm">{t('empty')}</p>
                    </div>
                ) : (
                    <>
                        <div className="relative">
                            {/* Navigation Arrows */}
                            {announcements.length > 1 && (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8"
                                        onClick={goToPrevious}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8"
                                        onClick={goToNext}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </>
                            )}

                            <Link href={`/dashboard/notices`} className="block group px-8">
                                <div className="p-4 rounded-lg border hover:border-primary transition-all hover:shadow-sm">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="text-xs">
                                                {currentIndex + 1} / {announcements.length}
                                            </Badge>
                                        </div>
                                        {currentAnnouncement?.isUrgent && (
                                            <Badge variant="destructive" className="text-xs">
                                                URGENT
                                            </Badge>
                                        )}
                                    </div>
                                    <h4 className="font-bold text-sm mb-2 group-hover:text-primary transition-colors">
                                        {currentAnnouncement?.title}
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                        {currentAnnouncement && format(new Date(currentAnnouncement.createdAt), 'PPP', { locale: dateLocale })}
                                    </p>
                                </div>
                            </Link>
                        </div>
                        <div className="mt-3 flex justify-end">
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/dashboard/notices">
                                    {t('viewAll')}
                                </Link>
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
