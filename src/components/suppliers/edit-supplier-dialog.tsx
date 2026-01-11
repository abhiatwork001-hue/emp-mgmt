"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";
import { SupplierForm } from "./supplier-form";
import { useRouter } from "next/navigation";

interface EditSupplierDialogProps {
    supplier: any;
}

export function EditSupplierDialog({ supplier }: EditSupplierDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    const handleSuccess = () => {
        setIsOpen(false);
        router.refresh(); // Refresh server component to get new data
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Edit2 className="h-4 w-4" />
                    Edit Supplier
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Supplier: {supplier.name}</DialogTitle>
                </DialogHeader>
                <SupplierForm supplier={supplier} onSuccess={handleSuccess} />
            </DialogContent>
        </Dialog>
    );
}
