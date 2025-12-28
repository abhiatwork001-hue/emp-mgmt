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
import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface ReportAbsenceDialogProps {
    employeeId?: string;
    trigger?: React.ReactNode;
}

export function ReportAbsenceDialog({ employeeId, trigger }: ReportAbsenceDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

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
            toast.error("Please select an employee");
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
                        <AlertCircle className="mr-2 h-4 w-4" /> Report Absence
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="bg-[#1e293b] border-zinc-700 text-white sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Report Absence</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Notify admin about your absence.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    {!employeeId && (
                        <div className="space-y-4 p-3 border border-dashed border-zinc-700 rounded-lg bg-zinc-900/50">
                            <h4 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                <UserSearch className="h-4 w-4" /> Select Employee
                            </h4>
                            <div className="space-y-2">
                                <Label>Store</Label>
                                <Select value={selectedStore} onValueChange={setSelectedStore}>
                                    <SelectTrigger className="bg-[#0f172a] border-zinc-700 text-white">
                                        <SelectValue placeholder="Select Store" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-zinc-700 text-white">
                                        {stores.map(s => (
                                            <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Employee</Label>
                                <Select value={selectedEmployee} onValueChange={setSelectedEmployee} disabled={!selectedStore}>
                                    <SelectTrigger className="bg-[#0f172a] border-zinc-700 text-white">
                                        <SelectValue placeholder="Select Employee" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-zinc-700 text-white">
                                        {employees.map(e => (
                                            <SelectItem key={e._id} value={e._id}>{e.firstName} {e.lastName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                            id="date"
                            type="date"
                            required
                            className="bg-[#0f172a] border-zinc-700 text-white"
                            value={formData.date}
                            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Select value={formData.type} onValueChange={(val) => setFormData(prev => ({ ...prev, type: val }))}>
                            <SelectTrigger className="bg-[#0f172a] border-zinc-700 text-white">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1e293b] border-zinc-700 text-white">
                                <SelectItem value="sick">Sick Leave</SelectItem>
                                <SelectItem value="personal">Personal Emergency</SelectItem>
                                <SelectItem value="late">Running Late</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason (Optional)</Label>
                        <Textarea
                            id="reason"
                            className="bg-[#0f172a] border-zinc-700 text-white resize-none"
                            placeholder="Additional details..."
                            value={formData.reason}
                            onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="destructive" disabled={loading || (!employeeId && !selectedEmployee)}>
                            {loading ? "Submitting..." : "Report Absence"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
