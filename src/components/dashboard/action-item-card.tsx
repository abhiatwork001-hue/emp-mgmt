"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Palmtree,
    AlertCircle,
    Clock,
    CalendarDays,
    ChevronRight,
    ArrowRight,
    User,
    Store,
    MapPin,
    Calendar,
    X,
    Check,
    Edit3,
    Eye,
    Paperclip,
    Users,
    MessageSquare
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

interface ActionItemCardProps {
    item: any;
    type: 'vacation' | 'absence' | 'overtime' | 'schedule' | 'coverage';
    isApproval?: boolean;
    onAction: (id: string, action: string) => void;
    loading?: boolean;
    userId?: string;
    isCoverageOffer?: boolean; // True if this is an offer the user can accept (not their own request)
}

export function ActionItemCard({ item, type, isApproval, onAction, loading, userId, isCoverageOffer }: ActionItemCardProps) {
    const t = useTranslations("PendingActions");
    const tc = useTranslations("Common");

    const getIcon = () => {
        switch (type) {
            case 'vacation': return <Palmtree className="w-5 h-5 text-emerald-500" />;
            case 'absence': return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'overtime': return <Clock className="w-5 h-5 text-orange-500" />;
            case 'schedule': return <CalendarDays className="w-5 h-5 text-blue-500" />;
            case 'coverage': return <Check className="w-5 h-5 text-violet-500" />;
        }
    };

    const getTitle = () => {
        switch (type) {
            case 'vacation': return t('vacationRequest');
            case 'absence': return t('absenceReport');
            case 'overtime': return t('overtimeRequest');
            case 'schedule': return t('draftSchedule');
            case 'coverage': return t('coverageOffer');
        }
    };

    const getDateInfo = () => {
        if (type === 'vacation') {
            return (
                <div className="flex items-center gap-2 text-sm font-bold">
                    <span>{format(new Date(item.requestedFrom), "MMM dd")}</span>
                    <ArrowRight className="w-3 h-3 opacity-30" />
                    <span>{format(new Date(item.requestedTo), "MMM dd")}</span>
                    <Badge variant="secondary" className="ml-2 font-black tracking-tighter text-[10px]">
                        {t('days', { count: item.totalDays })}
                    </Badge>
                </div>
            );
        }
        if (type === 'absence') {
            return (
                <div className="flex items-center gap-2 text-sm font-bold">
                    <span>{format(new Date(item.date), "EEEE, MMM dd")}</span>
                </div>
            );
        }
        if (type === 'overtime') {
            return (
                <div className="flex items-center gap-2 text-sm font-bold">
                    <span>{format(new Date(item.dayDate), "MMM dd")}</span>
                    <Badge variant="secondary" className="ml-2 font-black tracking-tighter text-[10px]">
                        {t('hours', { count: item.hoursRequested })}
                    </Badge>
                </div>
            );
        }
        if (type === 'schedule') {
            return (
                <div className="flex items-center gap-2 text-sm font-bold">
                    <span>{format(new Date(item.dateRange.startDate), "MMM dd")}</span>
                    <ArrowRight className="w-3 h-3 opacity-30" />
                    <span>{format(new Date(item.dateRange.endDate), "MMM dd")}</span>
                </div>
            );
        }
        if (type === 'coverage') {
            return (
                <div className="flex items-center gap-2 text-sm font-bold">
                    <span>{format(new Date(item.originalShift?.dayDate || new Date()), "MMM dd")}</span>
                    <Badge variant="secondary" className="ml-2 font-black tracking-tighter text-[10px]">
                        {item.originalShift?.startTime} - {item.originalShift?.endTime}
                    </Badge>
                </div>
            );
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.01 }}
            className="group"
        >
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                <CardContent className="p-0">
                    <div className="flex items-stretch min-h-[120px]">
                        {/* Status/Type Sidebar */}
                        <div className={cn(
                            "w-1.5 shrink-0 transition-colors duration-500",
                            type === 'vacation' && "bg-emerald-500",
                            type === 'absence' && "bg-red-500",
                            type === 'overtime' && "bg-orange-500",
                            type === 'schedule' && "bg-blue-500",
                            type === 'coverage' && "bg-violet-500",
                        )} />

                        {/* Main Content */}
                        <div className="flex-1 p-5 flex flex-col md:flex-row items-center gap-6">
                            <div className="flex-1 space-y-3 w-full">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-muted/20 flex items-center justify-center group-hover:bg-muted/30 transition-colors">
                                            {getIcon()}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground/60 leading-none mb-1">
                                                {getTitle()}
                                            </h4>
                                            {getDateInfo()}
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="md:hidden rounded-lg bg-primary/5 font-bold uppercase tracking-tighter text-[9px] border-primary/10">
                                        {format(new Date(item.createdAt), "MMM dd")}
                                    </Badge>
                                </div>

                                {isApproval ? (
                                    <div className="flex flex-wrap items-center gap-4 pt-1">
                                        <div className="flex items-center gap-2">
                                            <User className="w-3.5 h-3.5 text-primary" />
                                            <span className="text-xs font-bold">{item.employeeId?.firstName || item.originalEmployeeId?.firstName} {item.employeeId?.lastName || item.originalEmployeeId?.lastName}</span>
                                        </div>
                                        {/* Store Name */}
                                        {(item.employeeId?.storeId?.name || item.originalShift?.storeId?.name || item.storeId?.name) && (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Store className="w-3.5 h-3.5" />
                                                <span className="text-xs">{item.employeeId?.storeId?.name || item.originalShift?.storeId?.name || item.storeId?.name}</span>
                                            </div>
                                        )}
                                        {/* Department Name */}
                                        {(item.employeeId?.storeDepartmentId?.name || item.originalShift?.storeDepartmentId?.name || item.storeDepartmentId?.name) && (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <MapPin className="w-3.5 h-3.5" />
                                                <span className="text-xs font-medium">{item.employeeId?.storeDepartmentId?.name || item.originalShift?.storeDepartmentId?.name || item.storeDepartmentId?.name}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : type === 'coverage' ? (
                                    <div className="space-y-2 pt-1">
                                        {/* Coverage-specific details for candidates */}
                                        <div className="flex flex-wrap items-center gap-4">
                                            {item.originalEmployeeId && (
                                                <div className="flex items-center gap-2">
                                                    <User className="w-3.5 h-3.5 text-primary" />
                                                    <span className="text-xs font-bold">{t('covering', { name: `${item.originalEmployeeId?.firstName} ${item.originalEmployeeId?.lastName}` })}</span>
                                                </div>
                                            )}
                                            {item.originalShift?.storeId?.name && (
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Store className="w-3.5 h-3.5" />
                                                    <span className="text-xs">{item.originalShift.storeId.name}</span>
                                                </div>
                                            )}
                                            {item.originalShift?.storeDepartmentId?.name && (
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <MapPin className="w-3.5 h-3.5" />
                                                    <span className="text-xs font-medium">{item.originalShift.storeDepartmentId.name}</span>
                                                </div>
                                            )}
                                        </div>
                                        {item.coworkers && item.coworkers.length > 0 && (
                                            <div className="flex items-start gap-2 text-muted-foreground">
                                                <Users className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                                <span className="text-xs">{t('workingWith', { names: item.coworkers.join(', ') })}</span>
                                            </div>
                                        )}
                                        {item.reason && (
                                            <div className="flex items-start gap-2 text-muted-foreground">
                                                <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                                <span className="text-xs italic">{t('reason', { reason: item.reason })}</span>
                                            </div>
                                        )}
                                        {item.hrMessage && (
                                            <div className="flex items-start gap-2 text-blue-600">
                                                <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                                <span className="text-xs font-semibold italic">{t('hrMessage', { message: item.hrMessage })}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 italic">
                                        {item.comments || item.reason || t('noComments')}
                                    </div>
                                )}

                                {item.attachments && item.attachments.length > 0 && (isApproval || (userId && (item.employeeId?._id?.toString() === userId.toString() || item.originalEmployeeId?._id?.toString() === userId.toString() || item.originalEmployeeId?.toString() === userId.toString()))) && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {item.attachments.map((url: string, idx: number) => (
                                            <a
                                                key={idx}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-[10px] text-primary hover:underline hover:bg-muted/80 transition-colors"
                                            >
                                                <Paperclip className="w-3 h-3" />
                                                {t('viewAttachment', { index: idx + 1 })}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Actions Container */}
                            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-border/20 md:pl-6">
                                {isApproval ? (
                                    <>
                                        {type === 'schedule' ? (
                                            <Button
                                                size="sm"
                                                onClick={() => onAction(item._id, 'review')}
                                                className="rounded-full bg-primary hover:bg-primary/90 font-bold px-6 h-9 transition-all shadow-lg shadow-primary/20"
                                            >
                                                <Eye className="w-3.5 h-3.5 mr-2" />
                                                {t("item.review")}
                                            </Button>
                                        ) : type === 'coverage' ? (
                                            <Button
                                                size="sm"
                                                onClick={() => onAction(item._id, 'finalize')}
                                                className="rounded-full bg-primary hover:bg-primary/90 font-bold px-6 h-9 transition-all shadow-lg shadow-primary/20"
                                            >
                                                <Check className="w-3.5 h-3.5 mr-2" />
                                                {t('finalize')}
                                            </Button>
                                        ) : (
                                            <div className="flex gap-2 w-full md:w-auto">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => onAction(item._id, 'reject')}
                                                    className="flex-1 md:flex-none rounded-full border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white font-bold h-9 px-5 transition-all"
                                                >
                                                    <X className="w-3.5 h-3.5 mr-2" />
                                                    {t("item.reject")}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => onAction(item._id, 'approve')}
                                                    className="flex-1 md:flex-none rounded-full bg-emerald-500 hover:bg-emerald-600 font-bold h-9 px-5 transition-all shadow-lg shadow-emerald-500/10"
                                                >
                                                    <Check className="w-3.5 h-3.5 mr-2" />
                                                    {t("item.approve")}
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex gap-2 w-full md:w-auto">
                                        {/* Coverage Offer - Can Accept or Decline */}
                                        {type === 'coverage' && isCoverageOffer && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    onClick={() => onAction(item._id, 'accept')}
                                                    className="flex-1 md:flex-none rounded-full bg-violet-500 hover:bg-violet-600 font-bold h-9 px-5 transition-all shadow-lg shadow-violet-500/10"
                                                >
                                                    <Check className="w-3.5 h-3.5 mr-2" />
                                                    {t('accept')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => onAction(item._id, 'decline')}
                                                    className="flex-1 md:flex-none rounded-full border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white font-bold h-9 px-5 transition-all"
                                                >
                                                    <X className="w-3.5 h-3.5 mr-2" />
                                                    {t('decline')}
                                                </Button>
                                            </>
                                        )}

                                        {/* Non-coverage items can be edited */}
                                        {type !== 'coverage' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => onAction(item._id, 'edit')}
                                                className="flex-1 md:flex-none rounded-full border-border/60 hover:border-primary/40 hover:bg-primary/5 font-bold h-9 px-5 transition-all"
                                            >
                                                <Edit3 className="w-3.5 h-3.5 mr-2 text-primary" />
                                                {t("item.edit")}
                                            </Button>
                                        )}

                                        {/* Cancel button - only for own requests, not for coverage offers */}
                                        {!(type === 'coverage' && isCoverageOffer) && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => onAction(item._id, 'cancel')}
                                                className="flex-1 md:flex-none rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/5 font-bold h-9 px-5 transition-all"
                                            >
                                                <X className="w-3.5 h-3.5 mr-2" />
                                                {t("item.cancel")}
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
