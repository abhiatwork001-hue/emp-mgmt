import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, User, Calendar } from "lucide-react";
import { useTranslations } from "next-intl";

interface ShiftDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shift: any;
    date: Date;
    employeeName: string;
    storeName?: string;
    canSwap?: boolean;
    onSwapRequest?: () => void;
}

export function ShiftDetailsDialog({
    open,
    onOpenChange,
    shift,
    date,
    employeeName,
    storeName,
    canSwap,
    onSwapRequest,
    onReportAbsence
}: ShiftDetailsDialogProps & { onReportAbsence?: () => void }) {
    const t = useTranslations("Schedules.shiftDetails");

    if (!shift) return null;

    // Helper to check if shift is in the future (allow reporting absence for today/future)
    const isFutureOrToday = () => {
        const now = new Date();
        const shiftDate = new Date(date);
        shiftDate.setHours(parseInt(shift.endTime.split(':')[0]), 0, 0, 0); // Approx end time checking
        return shiftDate >= now || new Date().toDateString() === date.toDateString();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('title')}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">
                                {shift.startTime} - {shift.endTime}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {format(date, "EEEE, MMMM do, yyyy")}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3 mt-2 border-t pt-4">
                        <div className="flex items-center gap-3 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{employeeName}</span>
                        </div>

                        {storeName && (
                            <div className="flex items-center gap-3 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{storeName}</span>
                            </div>
                        )}

                        {shift.shiftName && (
                            <div className="flex items-center gap-3 text-sm">
                                <Badge variant="outline">{shift.shiftName}</Badge>
                            </div>
                        )}

                        {shift.notes && (
                            <div className="bg-muted/50 p-3 rounded-md text-sm italic text-muted-foreground mt-2">
                                "{shift.notes}"
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2 mt-6">
                        {canSwap && (
                            <Button className="w-full" onClick={onSwapRequest}>
                                {t('swapButton')}
                            </Button>
                        )}

                        {/* Absence Reporting - Only for future/today shifts */}
                        {isFutureOrToday() && onReportAbsence && (
                            <Button variant="destructive" className="w-full border-red-200 text-white hover:bg-red-600" onClick={onReportAbsence}>
                                {t('reportAbsenceButton')}
                            </Button>
                        )}
                    </div>

                    {!canSwap && !onReportAbsence && (
                        <div className="mt-4 bg-muted/50 text-muted-foreground p-3 rounded-md text-[10px] leading-relaxed">
                            <p className="font-semibold mb-1 opacity-70 uppercase tracking-wider">{t('unavailableTitle')}</p>
                            <p>{t('unavailableDesc')}</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
