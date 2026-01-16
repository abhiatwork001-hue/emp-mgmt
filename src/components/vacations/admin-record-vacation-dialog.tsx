"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createVacationRequest } from "@/lib/actions/vacation.actions";
import { getAllStores } from "@/lib/actions/store.actions";
import { getEmployeesByStore } from "@/lib/actions/employee.actions";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function AdminRecordVacationDialog() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const t = useTranslations("Vacation");
    const tc = useTranslations("Common");

    // Selection State
    const [stores, setStores] = useState<any[]>([]);
    const [selectedStore, setSelectedStore] = useState<string>("");

    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<string>("");

    const [formData, setFormData] = useState({
        startDate: "",
        endDate: "",
        comments: ""
    });

    // Fetch Stores on mount
    useEffect(() => {
        if (open) {
            const loadStores = async () => {
                try {
                    const data = await getAllStores();
                    setStores(data);
                } catch (e) {
                    toast.error(t('loadStoresError'));
                }
            };
            loadStores();
        }
    }, [open]);

    // Fetch Employees when store changes
    useEffect(() => {
        if (selectedStore) {
            const loadEmployees = async () => {
                setLoading(true);
                try {
                    const data = await getEmployeesByStore(selectedStore);
                    setEmployees(data);
                } catch (e) {
                    toast.error(t('loadEmployeesError'));
                } finally {
                    setLoading(false);
                }
            };
            loadEmployees();
        } else {
            setEmployees([]);
        }
    }, [selectedStore]);

    const calculateWorkingDays = (start: Date, end: Date) => {
        let count = 0;
        const curDate = new Date(start);
        while (curDate <= end) {
            const dayOfWeek = curDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                count++;
            }
            curDate.setDate(curDate.getDate() + 1);
        }
        return count;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedEmployee || !formData.startDate || !formData.endDate) {
            toast.error(t('fillRequiredFields'));
            return;
        }

        setLoading(true);

        try {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                toast.error(t('invalidDates'));
                setLoading(false);
                return;
            }

            if (end < start) {
                toast.error(t('endDateError'));
                setLoading(false);
                return;
            }

            const totalDays = calculateWorkingDays(start, end);

            await createVacationRequest({
                employeeId: selectedEmployee,
                requestedFrom: start,
                requestedTo: end,
                totalDays,
                comments: formData.comments || t('recordedByAdmin'),
                bypassValidation: true
            });

            toast.success(t('recordSuccess'));
            setOpen(false);
            setFormData({ startDate: "", endDate: "", comments: "" });
            setSelectedStore("");
            setSelectedEmployee("");
            router.refresh();
        } catch (error) {
            console.error("Submission error:", error);
            toast.error(t('recordError'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <CalendarPlus className="mr-2 h-4 w-4" /> {t('record')}
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-popover border-border text-popover-foreground sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t('recordAdmin')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">

                    {/* Store Selection */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">{tc('store')}</Label>
                        <Select value={selectedStore} onValueChange={setSelectedStore}>
                            <SelectTrigger className="bg-muted/50 border-border text-foreground">
                                <SelectValue placeholder={tc('selectStore')} />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border text-popover-foreground">
                                {stores.map(store => (
                                    <SelectItem key={store._id} value={store._id}>{store.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Employee Selection */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">{tc('employee')}</Label>
                        <Select value={selectedEmployee} onValueChange={setSelectedEmployee} disabled={!selectedStore || loading}>
                            <SelectTrigger className="bg-muted/50 border-border text-foreground">
                                <SelectValue placeholder={loading ? tc('loading') : tc('selectEmployee')} />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border text-popover-foreground max-h-[200px]">
                                {employees.map(emp => (
                                    <SelectItem key={emp._id} value={emp._id}>
                                        {emp.firstName} {emp.lastName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="admin-start" className="text-sm font-medium">{t('startDate')}</Label>
                            <DatePicker
                                date={formData.startDate}
                                setDate={(d) => setFormData(prev => ({ ...prev, startDate: d ? d.toISOString().split('T')[0] : "" }))}
                                placeholder={t('pickStartDate')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="admin-end" className="text-sm font-medium">{t('endDate')}</Label>
                            <DatePicker
                                date={formData.endDate}
                                setDate={(d) => setFormData(prev => ({ ...prev, endDate: d ? d.toISOString().split('T')[0] : "" }))}
                                placeholder={t('pickEndDate')}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="admin-comments" className="text-sm font-medium">{t('comments')}</Label>
                        <Textarea
                            id="admin-comments"
                            className="bg-muted/50 border-border text-foreground resize-none"
                            placeholder={t('reasonPlaceholder')}
                            value={formData.comments}
                            onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
                        />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{tc('cancel')}</Button>
                        <Button type="submit" disabled={loading || !selectedEmployee} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {loading ? tc('loading') : t('record')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
