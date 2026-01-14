"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { removeStoreEmployeeFromDepartment } from "@/lib/actions/store-department.actions";
import { useRouter } from "next/navigation";
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

interface RemoveStoreEmployeeButtonProps {
    departmentId: string;
    employeeId: string;
}

export function RemoveStoreEmployeeButton({ departmentId, employeeId }: RemoveStoreEmployeeButtonProps) {
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const router = useRouter();

    async function onConfirm() {
        setLoading(true);
        try {
            await removeStoreEmployeeFromDepartment(departmentId, employeeId);
            setOpen(false);
            router.refresh();
        } catch (error) {
            console.error("Failed to remove employee", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    disabled={loading}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-accent"
                >
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Trash2 className="h-4 w-4" />
                    )}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Remove Employee?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to remove this employee from the department? They will remain in the store but will no longer be assigned to this department.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            onConfirm();
                        }}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 text-white border-none"
                    >
                        {loading ? "Removing..." : "Remove Employee"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
