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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Vacation {
    _id: string;
    type: string;
    startDate: string;
    endDate: string;
    status: string;
}

export default function VacationRequestPage() {
    const [vacations, setVacations] = useState<Vacation[]>([]);
    const [type, setType] = useState("vacation");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
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
        const res = await fetch("/api/vacations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, startDate, endDate, reason }),
        });

        if (res.ok) {
            fetchVacations();
            setStartDate("");
            setEndDate("");
            setReason("");
        } else {
            alert("Failed to submit request");
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
                            <div>
                                <Label>Start Date</Label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <Label>End Date</Label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    required
                                />
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
                        <Table>
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
                                        <TableCell className="capitalize">{v.type}</TableCell>
                                        <TableCell>
                                            {new Date(v.startDate).toLocaleDateString()} -{" "}
                                            {new Date(v.endDate).toLocaleDateString()}
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
