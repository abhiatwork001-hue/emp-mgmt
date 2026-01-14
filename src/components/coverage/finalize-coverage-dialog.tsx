"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { finalizeCoverage } from "@/lib/actions/coverage.actions";
import { Loader2 } from "lucide-react";

interface FinalizeCoverageDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    request: any;
    onSuccess: () => void;
}

export function FinalizeCoverageDialog({ open, onOpenChange, request, onSuccess }: FinalizeCoverageDialogProps) {
    const [isLoading, setIsLoading] = useState(false);

    // Absence Settings (for Original Employee)
    const [absenceType, setAbsenceType] = useState("sick");
    const [justification, setJustification] = useState("Medical Reason");
    const [justificationStatus, setJustificationStatus] = useState("Justified");

    // Compensation Settings (for Covering Employee)
    const [compType, setCompType] = useState<'extra_hour' | 'vacation_day'>("extra_hour");
    const [vacationDays, setVacationDays] = useState(1);

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            await finalizeCoverage(
                request._id,
                {
                    type: compType,
                    amount: compType === 'vacation_day' ? vacationDays : undefined
                },
                {
                    type: absenceType,
                    justification: justification,
                    justificationStatus: justificationStatus as 'Justified' | 'Unjustified'
                }
            );
            toast.success("Coverage finalized successfully");
            onOpenChange(false);
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || "Failed to finalize coverage");
        } finally {
            setIsLoading(false);
        }
    };

    if (!request) return null;

    const originalName = request.originalEmployeeId?.firstName || "Original Employee";
    const coverName = request.acceptedBy?.firstName || "Covering Employee";
    const shiftDate = request.originalShift?.dayDate ? new Date(request.originalShift.dayDate).toLocaleDateString() : 'Unknown Date';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Finalize Coverage</DialogTitle>
                    <DialogDescription>
                        Review and set final terms for this coverage.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Section 1: Original Employee Absence */}
                    <div className="space-y-3 bg-muted/20 p-3 rounded-md border border-border/40">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Original Employee: {originalName}</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="grid gap-1.5">
                                <Label htmlFor="abs-type">Absence Type</Label>
                                <Select value={absenceType} onValueChange={setAbsenceType}>
                                    <SelectTrigger id="abs-type" className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sick">Sick Leave</SelectItem>
                                        <SelectItem value="absence">Unjustified</SelectItem>
                                        <SelectItem value="vacation">Vacation</SelectItem>
                                        <SelectItem value="personal">Personal</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="abs-status">Justification</Label>
                                <Select value={justificationStatus} onValueChange={setJustificationStatus}>
                                    <SelectTrigger id="abs-status" className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Justified">Justified</SelectItem>
                                        <SelectItem value="Unjustified">Unjustified</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="justification">Notes / Description</Label>
                            <Input
                                id="justification"
                                value={justification}
                                onChange={(e) => setJustification(e.target.value)}
                                placeholder="e.g. Doctor's Note provided"
                                className="h-9"
                            />
                        </div>
                    </div>

                    {/* Section 2: Covering Employee Compensation */}
                    <div className="space-y-3 bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-md border border-blue-100 dark:border-blue-900/20">
                        <Label className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400">Covering Employee: {coverName}</Label>
                        <div className="grid gap-2">
                            <Label htmlFor="comp-type">Compensation Method</Label>
                            <Select value={compType} onValueChange={(v: any) => setCompType(v)}>
                                <SelectTrigger id="comp-type" className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="extra_hour">Paid Overtime (Extra Hours)</SelectItem>
                                    <SelectItem value="vacation_day">Add Vacation Day bonus</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {compType === 'vacation_day' && (
                            <div className="grid gap-2 p-2 bg-background rounded border border-blue-200 dark:border-blue-800 animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="vac-days" className="font-bold">Days to add</Label>
                                    <Input
                                        id="vac-days"
                                        type="number"
                                        min="0.5"
                                        step="0.5"
                                        className="w-20 h-8 text-right font-black text-blue-600"
                                        value={vacationDays}
                                        onChange={(e) => setVacationDays(parseFloat(e.target.value))}
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-tight italic">
                                    The employee's vacation balance will be updated immediately upon finalization. 1.0 day is the standard bonus for shift coverage.
                                </p>
                            </div>
                        )}

                        {compType === 'extra_hour' && (
                            <div className="text-[11px] text-muted-foreground mt-1 bg-background/50 p-2 rounded">
                                Will create an approved Extra Hour request for the shift duration ({request.originalShift?.startTime || '?'} - {request.originalShift?.endTime || '?'}).
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Confirm & Finalize
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
