import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Clock, MapPin, User, Calendar } from "lucide-react";
import { useTranslations } from "next-intl";

interface ShiftDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shift: any;
    date: Date;
    employeeName: string;
    storeName?: string;
}

export function ShiftDetailsDialog({
    open,
    onOpenChange,
    shift,
    date,
    employeeName,
    storeName
}: ShiftDetailsDialogProps) {
    const t = useTranslations("Schedule");

    if (!shift) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('shiftDetails') || "Shift Details"}</DialogTitle>
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

                    <div className="mt-4 bg-amber-500/10 text-amber-600 p-3 rounded-md text-xs">
                        <p className="font-semibold mb-1">Shift Actions Unavailable</p>
                        <p>You cannot swap or modify this shift because it has either already started, passed, or belongs to another location.</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
