"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeStoreManager } from "@/lib/actions/store.actions";
import { useRouter } from "next/navigation";

interface RemoveStoreManagerButtonProps {
    storeId: string;
    employeeId: string;
    isSubManager?: boolean;
}

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

export function RemoveStoreManagerButton({ storeId, employeeId, isSubManager = false }: RemoveStoreManagerButtonProps) {
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const router = useRouter();

    async function handleRemove() {
        setLoading(true);
        try {
            await removeStoreManager(storeId, employeeId, isSubManager);
            router.refresh();
        } catch (error) {
            console.error("Failed to remove manager", error);
        } finally {
            setLoading(false);
            setOpen(false);
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-full"
                    disabled={loading}
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent row click
                    }}
                >
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                    <AlertDialogTitle>Remove {isSubManager ? "Sub-Manager" : "Manager"}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to remove this employee from their {isSubManager ? "Sub-Manager" : "Manager"} position?
                        This will remove their management permissions for this store.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleRemove();
                        }}
                        className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        disabled={loading}
                    >
                        {loading ? "Removing..." : "Remove Manager"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
