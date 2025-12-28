"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAbsenceRequest } from "@/lib/actions/absence.actions";
import { getAllStores } from "@/lib/actions/store.actions";
import { getEmployeesByStore } from "@/lib/actions/employee.actions";
import { toast } from "sonner";
import { AlertCircle, UserSearch } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface ReportAbsenceDialogProps {
    employeeId?: string;
    trigger?: React.ReactNode;
}

export function ReportAbsenceDialog({ employeeId, trigger }: ReportAbsenceDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const t = useTranslations("Absence");
    const tc = useTranslations("Common");

    // Selection Logic
    const [stores, setStores] = useState<any[]>([]);
    const [selectedStore, setSelectedStore] = useState<string>("");
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<string>(employeeId || "");

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        type: "sick",
        reason: ""
    });

    // If employeeId is NOT provided, load stores to enable selection
    useEffect(() => {
        if (!employeeId && open) {
            const loadStores = async () => {
                const data = await getAllStores();
                setStores(data);
            };
            loadStores();
        }
    }, [employeeId, open]);

    useEffect(() => {
        if (!employeeId && selectedStore) {
            const loadEmps = async () => {
                const data = await getEmployeesByStore(selectedStore);
                setEmployees(data);
            };
            loadEmps();
        }
    }, [selectedStore, employeeId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const finalEmployeeId = employeeId || selectedEmployee;

        if (!finalEmployeeId) {
            toast.error(tc('selectEmployee'));
            return;
        }

        setLoading(true);

        try {
            await createAbsenceRequest({
                employeeId: finalEmployeeId,
                date: new Date(formData.date),
                type: formData.type,
                reason: formData.reason
            });

            toast.success("Absence reported");
            setOpen(false);
            setFormData({ date: new Date().toISOString().split('T')[0], type: "sick", reason: "" });
            if (!employeeId) {
                setSelectedEmployee("");
                setSelectedStore("");
            }
            router.refresh();
        } catch (error) {
            toast.error("Failed to report absence");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button variant="destructive">
                        <AlertCircle className="mr-2 h-4 w-4" /> {t('report')}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="bg-popover border-border text-popover-foreground sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('report')}</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        {t('reportDescription')}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    {!employeeId && (
                        <div className="space-y-4 p-3 border border-dashed border-border rounded-lg bg-muted/30">
                            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-widest">
                                <UserSearch className="h-4 w-4" /> {tc('selectEmployee')}
                            </h4>
                            <div className="space-y-2">
                                <Label className="text-xs font-medium">{tc('store')}</Label>
                                <Select value={selectedStore} onValueChange={setSelectedStore}>
                                    <SelectTrigger className="bg-muted/50 border-border text-foreground">
                                        <SelectValue placeholder={tc('selectStore')} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover border-border text-popover-foreground">
                                        {stores.map(s => (
                                            <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-medium">{tc('employee')}</Label>
                                <Select value={selectedEmployee} onValueChange={setSelectedEmployee} disabled={!selectedStore}>
                                    <SelectTrigger className="bg-muted/50 border-border text-foreground">
                                        <SelectValue placeholder={tc('selectEmployee')} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover border-border text-popover-foreground">
                                        {employees.map(e => (
                                            <SelectItem key={e._id} value={e._id}>{e.firstName} {e.lastName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="date" className="text-sm font-medium">{tc('date')}</Label>
                        <DatePicker
                            date={formData.date}
                            setDate={(d) => setFormData(prev => ({ ...prev, date: d ? d.toISOString().split('T')[0] : "" }))}
                            placeholder="Select date"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="type" className="text-sm font-medium">{tc('type')}</Label>
                        <Select value={formData.type} onValueChange={(val) => setFormData(prev => ({ ...prev, type: val }))}>
                            <SelectTrigger className="bg-muted/50 border-border text-foreground">
                                <SelectValue placeholder={tc('type')} />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border text-popover-foreground">
                                <SelectItem value="sick">{t('sickLeave')}</SelectItem>
                                <SelectItem value="personal">{t('personalEmergency')}</SelectItem>
                                <SelectItem value="late">{t('runningLate')}</SelectItem>
                                <SelectItem value="other">{t('other')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="reason" className="text-sm font-medium">{t('reasonOptional')}</Label>
                        <Textarea
                            id="reason"
                            className="bg-muted/50 border-border text-foreground resize-none"
                            placeholder={t('detailsPlaceholder')}
                            value={formData.reason}
                            onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{tc('cancel')}</Button>
                        <Button type="submit" variant="destructive" disabled={loading || (!employeeId && !selectedEmployee)}>
                            {loading ? tc('loading') : t('report')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
