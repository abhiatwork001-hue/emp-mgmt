"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { EmployeeForm } from "./employee-form";

interface EditEmployeeDialogProps {
    employee: any;
}

const DAYS = [
    { label: "Sun", value: 0 },
    { label: "Mon", value: 1 },
    { label: "Tue", value: 2 },
    { label: "Wed", value: 3 },
    { label: "Thu", value: 4 },
    { label: "Fri", value: 5 },
    { label: "Sat", value: 6 },
];

export function EditEmployeeDialog({ employee }: EditEmployeeDialogProps) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white mt-4 border border-zinc-700">
                    <Edit className="mr-2 h-4 w-4" /> Edit Profile
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-[#0f172a] border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Employee Profile</DialogTitle>
                    <DialogDescription>Update personal information and contract details.</DialogDescription>
                </DialogHeader>

                <EmployeeForm
                    employee={employee}
                    mode="edit"
                    onSuccess={() => setOpen(false)}
                />
            </DialogContent>
        </Dialog>
    );
}
