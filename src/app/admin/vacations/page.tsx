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
    );
}
