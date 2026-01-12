"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Shift {
    user: { _id: string; name: string } | string;
    startTime: string;
    endTime: string;
}

interface User {
    _id: string;
    name: string;
}

import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ScheduleManagementPage() {
    const [date, setDate] = useState<Date>(new Date());
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    // Mock storeDepartmentId for now - in real app, get from user context or selection
    const [storeDepartmentId, setStoreDepartmentId] = useState("65a1234567890abcdef12345");

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (storeDepartmentId && date) {
            fetchSchedule();
        }
    }, [storeDepartmentId, date]);

    const fetchUsers = async () => {
        const res = await fetch("/api/users");
        const data = await res.json();
        setUsers(data);
    };

    const fetchSchedule = async () => {
        const res = await fetch(
            `/api/schedules?storeDepartmentId=${storeDepartmentId}&date=${date.toISOString().split("T")[0]}`
        );
        const data = await res.json();
        if (data.shifts) {
            // Format dates for input
            const formattedShifts = data.shifts.map((s: any) => ({
                ...s,
                startTime: new Date(s.startTime).toTimeString().slice(0, 5),
                endTime: new Date(s.endTime).toTimeString().slice(0, 5),
            }));
            setShifts(formattedShifts);
        } else {
            setShifts([]);
        }
    };

    const addShift = () => {
        setShifts([...shifts, { user: "", startTime: "09:00", endTime: "17:00" }]);
    };

    const updateShift = (index: number, field: keyof Shift, value: string) => {
        const newShifts = [...shifts];
        newShifts[index] = { ...newShifts[index], [field]: value };
        setShifts(newShifts);
    };

    const saveSchedule = async () => {
        // Convert times back to full dates
        const shiftsToSave = shifts.map((s) => {
            const start = new Date(date);
            const [startH, startM] = s.startTime.split(":");
            start.setHours(parseInt(startH), parseInt(startM));

            const end = new Date(date);
            const [endH, endM] = s.endTime.split(":");
            end.setHours(parseInt(endH), parseInt(endM));

            return {
                user: typeof s.user === 'object' ? s.user._id : s.user,
                startTime: start,
                endTime: end,
            };
        });

        const res = await fetch("/api/schedules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                storeDepartmentId,
                date: date.toISOString().split("T")[0],
                shifts: shiftsToSave,
            }),
        });

        if (res.ok) {
            toast.success("Schedule saved!");
        } else {
            toast.error("Failed to save schedule");
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Schedule Management</h1>

            <div className="flex gap-4 mb-6">
                <div className="flex flex-col space-y-2">
                    <Label>Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-[240px] justify-start text-left font-normal",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={(day) => day && setDate(day)}
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                {/* Add Store Department Selector here if needed */}
            </div>

            <div className="space-y-4">
                {shifts.map((shift, index) => (
                    <Card key={index}>
                        <CardContent className="flex gap-4 items-end p-4">
                            <div className="w-1/3">
                                <Label>Employee</Label>
                                <Select
                                    value={typeof shift.user === 'object' ? shift.user._id : shift.user}
                                    onValueChange={(val) => updateShift(index, "user", val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select employee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {users.map((u) => (
                                            <SelectItem key={u._id} value={u._id}>
                                                {u.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Start Time</Label>
                                <Input
                                    type="time"
                                    value={shift.startTime}
                                    onChange={(e) => updateShift(index, "startTime", e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>End Time</Label>
                                <Input
                                    type="time"
                                    value={shift.endTime}
                                    onChange={(e) => updateShift(index, "endTime", e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="mt-6 flex gap-4">
                <Button onClick={addShift} variant="outline">
                    Add Shift
                </Button>
                <Button onClick={saveSchedule}>Save Schedule</Button>
            </div>
        </div>
    );
}
