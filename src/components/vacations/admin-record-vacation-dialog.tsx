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
import { useRouter } from "next/navigation";

export function AdminRecordVacationDialog() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

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
                    toast.error("Failed to load stores");
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
                    toast.error("Failed to load employees");
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
            toast.error("Please fill in all required fields");
            return;
        }

        setLoading(true);

        try {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                toast.error("Invalid dates selected");
                setLoading(false);
                return;
            }

            if (end < start) {
                toast.error("End date cannot be before start date");
                setLoading(false);
                return;
            }

            const totalDays = calculateWorkingDays(start, end);

            // Note: Admin Bypass skips 15-day rule and balance check on backend,
            // but we still calculate working days.

            if (totalDays === 0) {
                // Admins might want to record weekends? 
                // If so, we'd need to change simple calc, but safe default is working days.
                toast.warning("Selected range has 0 working days. Proceeding anyway as this is an Admin action.");
            }

            await createVacationRequest({
                employeeId: selectedEmployee,
                requestedFrom: start,
                requestedTo: end,
                totalDays, // Pass working days. If 0, backend handles it? 
                comments: formData.comments || "Recorded by Admin",
                bypassValidation: true // KEY FLAG
            });

            toast.success("Vacation recorded successfully");
            setOpen(false);
            setFormData({ startDate: "", endDate: "", comments: "" });
            setSelectedStore("");
            setSelectedEmployee("");
            router.refresh(); // Ensure the UI updates immediately
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("Failed to record vacation.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                    <CalendarPlus className="mr-2 h-4 w-4" /> Record Vacation
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1e293b] border-zinc-700 text-white sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Record Vacation (Admin)</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">

                    {/* Store Selection */}
                    <div className="space-y-2">
                        <Label>Select Store</Label>
                        <Select value={selectedStore} onValueChange={setSelectedStore}>
                            <SelectTrigger className="bg-[#0f172a] border-zinc-700 text-white">
                                <SelectValue placeholder="Select a store..." />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1e293b] border-zinc-700 text-white">
                                {stores.map(store => (
                                    <SelectItem key={store._id} value={store._id}>{store.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Employee Selection */}
                    <div className="space-y-2">
                        <Label>Select Employee</Label>
                        <Select value={selectedEmployee} onValueChange={setSelectedEmployee} disabled={!selectedStore || loading}>
                            <SelectTrigger className="bg-[#0f172a] border-zinc-700 text-white">
                                <SelectValue placeholder={loading ? "Loading..." : "Select an employee..."} />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1e293b] border-zinc-700 text-white max-h-[200px]">
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
                            <Label htmlFor="admin-start">Start Date</Label>
                            <Input
                                id="admin-start"
                                type="date"
                                required
                                className="bg-[#0f172a] border-zinc-700 text-white"
                                value={formData.startDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="admin-end">End Date</Label>
                            <Input
                                id="admin-end"
                                type="date"
                                required
                                className="bg-[#0f172a] border-zinc-700 text-white"
                                value={formData.endDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="admin-comments">Comments</Label>
                        <Textarea
                            id="admin-comments"
                            className="bg-[#0f172a] border-zinc-700 text-white resize-none"
                            placeholder="Reason / Notes..."
                            value={formData.comments}
                            onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading || !selectedEmployee}>
                            {loading ? "Processing..." : "Record & Approve"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
