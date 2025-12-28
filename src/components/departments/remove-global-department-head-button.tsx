"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeGlobalDepartmentHead, removeGlobalDepartmentSubHead } from "@/lib/actions/department.actions";
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
import { useTranslations } from "next-intl";

interface RemoveGlobalDepartmentHeadButtonProps {
    departmentId: string;
    employeeId: string;
    type: "head" | "subHead";
}

export function RemoveGlobalDepartmentHeadButton({ departmentId, employeeId, type }: RemoveGlobalDepartmentHeadButtonProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const t = useTranslations("Common");

    async function handleRemove() {
        setLoading(true);
        try {
            if (type === "head") {
                await removeGlobalDepartmentHead(departmentId, employeeId);
            } else {
                await removeGlobalDepartmentSubHead(departmentId, employeeId);
            }
            router.refresh();
        } catch (error) {
            console.error("Failed to remove head", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-full"
                    disabled={loading}
                >
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-popover border-border text-popover-foreground">
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('confirmTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('confirmDescription')}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="bg-muted hover:bg-muted/80">{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleRemove}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {t('continue')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
