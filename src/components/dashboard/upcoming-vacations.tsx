"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { Link } from "@/i18n/routing";

interface UpcomingVacation {
    _id: string;
    employeeName: string;
    employeeRole: string;
    startDate: string;
    endDate: string;
    daysUntil: number;
}

import { useTranslations } from "next-intl";

export function UpcomingVacations({ vacations }: { vacations: UpcomingVacation[] }) {
    const t = useTranslations("Dashboard.widgets.upcomingVacations");
    const thisWeek = vacations.filter(v => v.daysUntil <= 7).length;
    const thisMonth = vacations.filter(v => v.daysUntil <= 30).length;

    return (
        <Card className="border-zinc-800 bg-slate-900/50">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium text-white">{t('title')}</CardTitle>
                    <Calendar className="h-4 w-4 text-slate-400" />
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Mini Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-lg bg-slate-900 p-3 text-center border border-zinc-800">
                        <div className="text-2xl font-bold text-white">{thisWeek}</div>
                        <div className="text-xs text-slate-500">{t('thisWeek')}</div>
                    </div>
                    <div className="rounded-lg bg-slate-900 p-3 text-center border border-zinc-800">
                        <div className="text-2xl font-bold text-white">{thisMonth}</div>
                        <div className="text-xs text-slate-500">{t('thisMonth')}</div>
                    </div>
                    <div className="rounded-lg bg-slate-900 p-3 text-center border border-zinc-800">
                        <div className="text-2xl font-bold text-white">{vacations.length}</div>
                        <div className="text-xs text-slate-500">{t('total')}</div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-slate-400">{t('scheduleTitle')}</h3>
                    {vacations.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-500">{t('empty')}</div>
                    ) : (
                        vacations.map((vacation) => (
                            <div key={vacation._id} className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-slate-900 p-4 transition-colors hover:bg-slate-800/50">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="grid h-10 w-10 place-items-center rounded bg-blue-500/10 text-blue-400">
                                            <Calendar className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-white">{vacation.employeeName}</span>
                                                {vacation.daysUntil <= 1 ? (
                                                    <Badge variant="secondary" className="bg-rose-500/15 text-rose-400 border-0">{t('tomorrow')}</Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-amber-500/15 text-amber-400 border-0">{t('days', { count: vacation.daysUntil })}</Badge>
                                                )}

                                            </div>
                                            <p className="text-sm text-slate-400">
                                                {format(new Date(vacation.startDate), "yyyy-MM-dd")} - {format(new Date(vacation.endDate), "yyyy-MM-dd")}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="ml-14 flex items-center gap-2">
                                    <Button variant="outline" size="sm" className="h-8 border-zinc-700 bg-transparent text-slate-300 hover:bg-slate-800">
                                        <Link href={`/dashboard/vacations?id=${vacation._id}`}>
                                            {t('viewDetails')}
                                        </Link>
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-8 border-zinc-700 bg-transparent text-slate-300 hover:bg-slate-800">
                                        {t('contact')}
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {vacations.length > 0 && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-500 flex items-center gap-2">
                        <span className="mr-1">⚠️</span>
                        {t('warning', { count: vacations.filter(v => v.daysUntil <= 3).length })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
