"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface Vacation {
    _id: string;
    user: { name: string; email: string };
    type: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: string;
}

export default function AdminVacationPage() {
    const [requests, setRequests] = useState<Vacation[]>([]);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        const res = await fetch("/api/vacations");
        const data = await res.json();
        // Filter for pending requests or show all sorted
        setRequests(data);
    };

    const handleStatusUpdate = async (id: string, status: "approved" | "rejected") => {
        const res = await fetch("/api/vacations", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status }),
        });

        if (res.ok) {
            fetchRequests();
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Vacation Requests</h1>
            {/* Mobile View: Cards */}
            <div className="md:hidden space-y-4">
                {requests.map((req) => (
                    <div key={req._id} className="border rounded-lg p-4 space-y-3 bg-card">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-foreground">{req.user.name}</h3>
                                <p className="text-xs text-muted-foreground">{req.user.email}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className="capitalize text-xs font-medium px-2 py-1 rounded bg-muted">
                                    {req.type}
                                </span>
                                <span className={`text-xs font-bold capitalize ${req.status === 'approved' ? 'text-green-600' : req.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`}>
                                    {req.status}
                                </span>
                            </div>
                        </div>
                        <div className="text-sm space-y-1">
                            <p><span className="text-muted-foreground">Dates:</span> {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</p>
                            <p><span className="text-muted-foreground">Reason:</span> {req.reason}</p>
                        </div>
                        {req.status === "pending" && (
                            <div className="flex gap-2 pt-2 border-t mt-2">
                                <Button
                                    size="sm"
                                    onClick={() => handleStatusUpdate(req._id, "approved")}
                                    className="flex-1 bg-green-600 hover:bg-green-700 h-8 text-xs"
                                >
                                    Approve
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleStatusUpdate(req._id, "rejected")}
                                    className="flex-1 h-8 text-xs"
                                >
                                    Reject
                                </Button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Dates</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests.map((req) => (
                            <TableRow key={req._id}>
                                <TableCell>
                                    <div>{req.user.name}</div>
                                    <div className="text-sm text-gray-500">{req.user.email}</div>
                                </TableCell>
                                <TableCell className="capitalize">{req.type}</TableCell>
                                <TableCell>
                                    {new Date(req.startDate).toLocaleDateString()} -{" "}
                                    {new Date(req.endDate).toLocaleDateString()}
                                </TableCell>
                                <TableCell>{req.reason}</TableCell>
                                <TableCell className="capitalize">{req.status}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    {req.status === "pending" && (
                                        <>
                                            <Button
                                                size="sm"
                                                onClick={() => handleStatusUpdate(req._id, "approved")}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                Approve
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => handleStatusUpdate(req._id, "rejected")}
                                            >
                                                Reject
                                            </Button>
                                        </>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
