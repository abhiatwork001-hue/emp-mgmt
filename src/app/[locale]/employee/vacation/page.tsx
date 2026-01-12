"use client";


import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Vacation {
    _id: string;
    requestedFrom: string;
    requestedTo: string;
    status: string;
    type?: string;
}

export default function VacationRequestPage() {
    const [vacations, setVacations] = useState<Vacation[]>([]);
    const [type, setType] = useState("vacation");
    const [startDate, setStartDate] = useState<Date>();
    const [endDate, setEndDate] = useState<Date>();
    const [reason, setReason] = useState("");

    useEffect(() => {
        fetchVacations();
    }, []);

    const fetchVacations = async () => {
        const res = await fetch("/api/vacations");
        const data = await res.json();
        setVacations(data);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!startDate || !endDate) {
            toast.error("Please select start and end dates");
            return;
        }

        const res = await fetch("/api/vacations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                reason
            }),
        });

        if (res.ok) {
            fetchVacations();
            setStartDate(undefined);
            setEndDate(undefined);
            setReason("");
            toast.success("Request submitted successfully");
        } else {
            toast.error("Failed to submit request");
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">My Vacations & Absences</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Request New</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label>Type</Label>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="vacation">Vacation</SelectItem>
                                        <SelectItem value="absence">Absence</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col space-y-2">
                                <Label>Start Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !startDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={startDate}
                                            onSelect={setStartDate}
                                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="flex flex-col space-y-2">
                                <Label>End Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !endDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={endDate}
                                            onSelect={setEndDate}
                                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div>
                                <Label>Reason</Label>
                                <Input
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                />
                            </div>
                            <Button type="submit">Submit Request</Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Mobile View: Cards */}
                        <div className="md:hidden space-y-4">
                            {vacations.map((v) => (
                                <div key={v._id} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                                    <div className="flex justify-between items-center">
                                        <span className="capitalize font-medium">{v.type || "Vacation"}</span>
                                        <span className={`text-xs font-bold capitalize ${v.status === 'approved' ? 'text-green-600' : v.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`}>
                                            {v.status}
                                        </span>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {new Date(v.requestedFrom).toLocaleDateString()} - {new Date(v.requestedTo).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop View: Table */}
                        <Table className="hidden md:table">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Dates</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {vacations.map((v) => (
                                    <TableRow key={v._id}>
                                        <TableCell className="capitalize">{v.type || "Vacation"}</TableCell>
                                        <TableCell>
                                            {new Date(v.requestedFrom).toLocaleDateString()} -{" "}
                                            {new Date(v.requestedTo).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="capitalize">{v.status}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
