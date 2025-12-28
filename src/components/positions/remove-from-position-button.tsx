"use client";

import { Button } from "@/components/ui/button";
import { UserMinus } from "lucide-react";
import { removeEmployeeFromPosition } from "@/lib/actions/position.actions";
import { useTransition } from "react";
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

export function RemoveFromPositionButton({ employeeId }: { employeeId: string }) {
    const [isPending, startTransition] = useTransition();

    const handleRemove = () => {
        startTransition(async () => {
            try {
                const result = await removeEmployeeFromPosition(employeeId);
                if (!result.success) {
                    alert("Failed to remove employee: " + result.message);
                }
            } catch (error) {
                console.error(error);
                alert("An error occurred");
            }
        });
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
                    disabled={isPending}
                >
                    <UserMinus className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Remove from Position?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to remove this employee from this position?
                        This will properly close their position history and remove any tied management roles in Stores or Departments.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRemove} className="bg-destructive hover:bg-destructive/90 text-white">
                        {isPending ? "Removing..." : "Remove"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
