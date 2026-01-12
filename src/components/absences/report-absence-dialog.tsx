"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAbsenceRequest } from "@/lib/actions/absence.actions";
import { reportAbsenceForCoverage } from "@/lib/actions/coverage.actions";
import { getAllStores } from "@/lib/actions/store.actions";
import { getEmployeesByStore } from "@/lib/actions/employee.actions";
import { getEmployeeSchedulesInRange } from "@/lib/actions/schedule.actions";
import { toast } from "sonner";
import { AlertCircle, UserSearch, Clock, Upload, Paperclip, X } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UploadButton } from "@/lib/uploadthing";

interface ReportAbsenceDialogProps {
    employeeId?: string;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    preselectedDate?: Date;
    preselectedShiftId?: string;
}

export function ReportAbsenceDialog({ employeeId, trigger, open: controlledOpen, onOpenChange: setControlledOpen, preselectedDate, preselectedShiftId }: ReportAbsenceDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = (val: boolean) => {
        if (isControlled) {
            setControlledOpen?.(val);
        } else {
            setInternalOpen(val);
        }
    };

    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const t = useTranslations("Absence");
    const tc = useTranslations("Common");

    // Selection Logic
    const [stores, setStores] = useState<any[]>([]);
    const [selectedStore, setSelectedStore] = useState<string>("");
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<string>(employeeId || "");

    // Shift Logic
    const [shifts, setShifts] = useState<any[]>([]);
    const [selectedShiftId, setSelectedShiftId] = useState<string>(preselectedShiftId || "none");
    const [files, setFiles] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        date: preselectedDate ? preselectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        type: "sick",
        reason: ""
    });

    // Reset/Sync when opening
    useEffect(() => {
        if (open) {
            if (preselectedDate) {
                setFormData(prev => ({ ...prev, date: preselectedDate.toISOString().split('T')[0] }));
            }
            if (preselectedShiftId) {
                setSelectedShiftId(preselectedShiftId);
            }
        }
    }, [open, preselectedDate, preselectedShiftId]);

    // If employeeId is NOT provided, load stores to enable selection
    useEffect(() => {
        if (!employeeId && open) {
            const loadStores = async () => {
                const data = await getAllStores();
                setStores(data || []);
            };
            loadStores();
        }
    }, [employeeId, open]);

    useEffect(() => {
        if (!employeeId && selectedStore) {
            const loadEmps = async () => {
                const data = await getEmployeesByStore(selectedStore);
                setEmployees(data || []);
            };
            loadEmps();
        }
    }, [selectedStore, employeeId]);

    // Enhanced Shift Fetching
    useEffect(() => {
        const finalEmployeeId = employeeId || selectedEmployee;
        if (finalEmployeeId && formData.date) {
            const fetchShifts = async () => {
                try {
                    // Fetch for just this day
                    const start = new Date(formData.date);
                    const end = new Date(formData.date);

                    const data = await getEmployeeSchedulesInRange(finalEmployeeId, start, end);
                    // Flatten shifts from schedule days


                    const foundShifts = data.filter((shift: any) => {
                        // Robust Date Comparison
                        const shiftDateStr = new Date(shift.date).toISOString().split('T')[0];
                        const formDateStr = formData.date;
                        return shiftDateStr === formDateStr;
                    });

                    setShifts(foundShifts);

                    // FORCE COVERAGE WORKFLOW: Auto-select first shift if found
                    if (foundShifts.length > 0) {
                        setSelectedShiftId(foundShifts[0]._id); // API needs _id
                        // Also auto-select store/dept if not already? (already handled by dropdowns)
                    } else {
                        setSelectedShiftId("none");
                    }
                } catch (error) {
                    console.error("Failed to fetch shifts", error);
                    setShifts([]);
                }
            };
            fetchShifts();
        } else {
            setShifts([]);
        }
    }, [formData.date, employeeId, selectedEmployee]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const finalEmployeeId = employeeId || selectedEmployee;

        if (!finalEmployeeId) {
            toast.error(tc('selectEmployee'));
            return;
        }

        setLoading(true);

        try {
            // DECISION: Coverage or Simple Absence?
            if (selectedShiftId && selectedShiftId !== "none") {
                // 1. Coverage Workflow
                const targetShift = shifts.find(s => s._id === selectedShiftId);
                if (!targetShift) throw new Error("Shift not found");

                await reportAbsenceForCoverage({
                    scheduleId: targetShift.scheduleId,
                    dayDate: new Date(formData.date),
                    shiftName: targetShift.shiftName,
                    startTime: targetShift.startTime || targetShift.start,
                    endTime: targetShift.endTime || targetShift.end,
                    storeId: targetShift.storeId,
                    storeDepartmentId: targetShift.storeDepartmentId,
                    reason: `${formData.type.toUpperCase()}: ${formData.reason}`, // Prefix type
                    attachments: files
                });
                toast.success("Absence coverage requested. HR notified.");

            } else {
                // 2. Standard Absence Workflow
                await createAbsenceRequest({
                    employeeId: finalEmployeeId,
                    date: new Date(formData.date),
                    type: formData.type,
                    reason: formData.reason,
                    attachments: files // Pass attachments
                });
                toast.success("Absence reported successfully.");
            }

            setOpen(false);
            setFormData({ date: new Date().toISOString().split('T')[0], type: "sick", reason: "" });
            setFiles([]);
            setSelectedShiftId("none");
            if (!employeeId) {
                setSelectedEmployee("");
                setSelectedStore("");
            }
            router.refresh();
        } catch (error) {
            toast.error("Failed to submit report.");
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
            <DialogContent className="bg-popover border-border text-popover-foreground sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t('report')}</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        {t('reportDescription')}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    {!employeeId && (
                        <div className="space-y-4 p-3 border border-dashed border-border rounded-lg bg-muted/30">
                            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-widest">
                                <UserSearch className="h-4 w-4" /> {tc('selectEmployee')}
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium">{tc('store')}</Label>
                                    <Select value={selectedStore} onValueChange={setSelectedStore}>
                                        <SelectTrigger className="bg-muted/50 border-border text-foreground h-8 text-xs">
                                            <SelectValue placeholder={tc('selectStore')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {stores.map(s => (
                                                <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium">{tc('employee')}</Label>
                                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee} disabled={!selectedStore}>
                                        <SelectTrigger className="bg-muted/50 border-border text-foreground h-8 text-xs">
                                            <SelectValue placeholder={tc('selectEmployee')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {employees.map(e => (
                                                <SelectItem key={e._id} value={e._id}>{e.firstName} {e.lastName}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date" className="text-sm font-medium">{tc('date')}</Label>
                            <DatePicker
                                date={formData.date}
                                setDate={(d) => {
                                    if (!d) {
                                        setFormData(prev => ({ ...prev, date: "" }));
                                        return;
                                    }

                                    // 7-Day Limit Validation
                                    const now = new Date();
                                    const diffTime = now.getTime() - d.getTime();
                                    const diffDays = diffTime / (1000 * 3600 * 24);

                                    if (diffDays > 7) {
                                        toast.error("Cannot report absence for a date older than 7 days.");
                                        return;
                                    }

                                    setFormData(prev => ({ ...prev, date: d.toISOString().split('T')[0] }))
                                }}
                                placeholder="Select date"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="type" className="text-sm font-medium">{tc('type')}</Label>
                            <Select value={formData.type} onValueChange={(val) => setFormData(prev => ({ ...prev, type: val }))}>
                                <SelectTrigger className="bg-muted/50 border-border text-foreground">
                                    <SelectValue placeholder={tc('type')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sick">{t('sickLeave')}</SelectItem>
                                    <SelectItem value="personal">{t('personalEmergency')}</SelectItem>
                                    <SelectItem value="late">{t('runningLate')}</SelectItem>
                                    <SelectItem value="other">{t('other')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Shift Selection - conditional on shifts availability */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Affected Shift (Optional)</Label>
                            {shifts.length > 0 && <span className="text-[10px] text-emerald-500 font-medium">Found {shifts.length} shift(s)</span>}
                        </div>

                        {shifts.length === 0 ? (
                            <div className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded border border-border/50">
                                No shifts found for this date. A standard absence will be logged.
                            </div>
                        ) : (
                            <Select value={selectedShiftId || ''} onValueChange={setSelectedShiftId}>
                                <SelectTrigger className="bg-muted/50 border-border text-foreground">
                                    <SelectValue placeholder="Select a shift to request coverage..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {/* <SelectItem value="none">-- Just Report Absence (No Coverage) --</SelectItem> */}
                                    {shifts.map(s => (
                                        <SelectItem key={s._id} value={s._id}>
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3 h-3 text-muted-foreground" />
                                                {/* Fix: API returns start/end not startTime/endTime for flat shifts */}
                                                <span>{s.start || s.startTime} - {s.end || s.endTime}</span>
                                                <span className="text-muted-foreground opacity-50">| {s.shiftName}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                            {selectedShiftId && shifts.length > 0
                                ? "Selecting a shift will trigger a coverage request for approval."
                                : "Standard reporting logs the absence without triggering replacement Logic."}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="reason" className="text-sm font-medium">{t('reasonOptional')}</Label>
                        <Textarea
                            id="reason"
                            className="bg-muted/50 border-border text-foreground resize-none h-20"
                            placeholder={t('detailsPlaceholder')}
                            value={formData.reason}
                            onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                        />
                    </div>

                    {/* Proof Upload */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Attachments / Proof (Optional)</Label>
                        <div className="border border-dashed border-border rounded-lg p-3 bg-muted/20">
                            <div className="flex items-center justify-between">
                                <UploadButton
                                    endpoint="messageAttachment"
                                    onClientUploadComplete={(res) => {
                                        if (res) {
                                            setFiles(prev => [...prev, ...res.map(r => r.url)]);
                                            toast.success("File uploaded");
                                        }
                                    }}
                                    onUploadError={(error: Error) => {
                                        toast.error(`Error: ${error.message}`);
                                    }}
                                    appearance={{
                                        button: "bg-primary h-8 text-xs w-auto px-4 gap-2"
                                    }}
                                    content={{
                                        button({ ready }) {
                                            if (ready) return <div className="flex items-center gap-1"><Upload className="h-3 w-3" /> Upload File</div>;
                                            return "Loading...";
                                        }
                                    }}
                                />
                                <span className="text-[10px] text-muted-foreground">PDF, IMG up to 4MB</span>
                            </div>

                            {files.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {files.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-background p-1.5 rounded border border-border/50 text-xs">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <Paperclip className="w-3 h-3 text-primary shrink-0" />
                                                <span className="truncate max-w-[200px]">{file.split('/').pop()}</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 text-muted-foreground hover:text-red-500"
                                                onClick={() => setFiles(prev => prev.filter(f => f !== file))}
                                                type="button"
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{tc('cancel')}</Button>
                        <Button type="submit" variant="destructive" disabled={loading || (!employeeId && !selectedEmployee)}>
                            {loading ? tc('loading') : (selectedShiftId !== "none" ? "Request Coverage" : t('report'))}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
