"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { reportAbsenceForCoverage } from "@/lib/actions/coverage.actions";
import { Loader2, AlertTriangle, Upload } from "lucide-react";
import { toast } from "sonner";
import { UploadButton } from "@/lib/uploadthing";

interface ReportShiftAbsenceDialogProps {
    shift: any; // The shift object from schedule
    dayDate: Date;
    scheduleId: string;
    storeId: string;
    storeDepartmentId: string;
}

export function ReportShiftAbsenceDialog({ shift, dayDate, scheduleId, storeId, storeDepartmentId }: ReportShiftAbsenceDialogProps) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState("");
    const [files, setFiles] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleReport = async () => {
        if (!reason.trim()) {
            toast.error("Please provide a reason.");
            return;
        }

        setIsSubmitting(true);
        try {
            await reportAbsenceForCoverage({
                scheduleId,
                dayDate,
                shiftName: shift.shiftName,
                startTime: shift.startTime,
                endTime: shift.endTime,
                storeId,
                storeDepartmentId,
                reason,
                attachments: files
            });
            toast.success("Absence reported. HR has been notified.");
            setOpen(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to report absence.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-900/20 px-2 mt-2 w-full justify-start">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Report Absence
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Report Absence for Shift</DialogTitle>
                    <DialogDescription>
                        {new Date(dayDate).toDateString()} | {shift.startTime} - {shift.endTime}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Reason *</Label>
                        <Textarea
                            placeholder="Why can't you make it? (e.g. Sick, Emergency)"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Attachments (Optional)</Label>
                        <div className="flex items-center gap-4">
                            <UploadButton
                                endpoint="messageAttachment" // Reusing text attachment endpoint
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
                                    button: "bg-muted h-8 text-xs text-muted-foreground w-auto px-4"
                                }}
                                content={{
                                    button({ ready }) {
                                        if (ready) return <div className="flex items-center gap-1"><Upload className="h-3 w-3" /> Upload Proof</div>;
                                        return "Loading...";
                                    }
                                }}
                            />
                            {files.length > 0 && <span className="text-xs text-green-500">{files.length} file(s) attached</span>}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleReport} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Report"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
