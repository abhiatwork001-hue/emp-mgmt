"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { removeEmployeeFromStore } from "@/lib/actions/employee.actions";
import { useRouter } from "next/navigation";

interface RemoveStoreEmployeeButtonProps {
    storeId: string;
    employeeId: string;
    employeeName: string;
}

export function RemoveStoreEmployeeButton({ storeId, employeeId, employeeName }: RemoveStoreEmployeeButtonProps) {
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const router = useRouter();

    async function handleRemove() {
        setLoading(true);
        try {
            await removeEmployeeFromStore(storeId, employeeId);
            setOpen(false);
            router.refresh();
        } catch (error) {
            console.error("Failed to remove employee", error);
            alert("Failed to remove employee. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Remove Employee from Store</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div>
                            Are you sure you want to remove <strong>{employeeName}</strong> from this store?
                            <br /><br />
                            This will:
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>Remove them from the store</li>
                                <li>Remove them from all departments in this store</li>
                                <li>Remove any manager/sub-manager roles</li>
                                <li>Close their store history record</li>
                            </ul>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleRemove();
                        }}
                        disabled={loading}
                        className="bg-red-500 hover:bg-red-600"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Removing...
                            </>
                        ) : (
                            "Remove Employee"
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
