"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeGlobalDepartmentHead, removeGlobalDepartmentSubHead } from "@/lib/actions/department.actions";
import { useRouter } from "next/navigation";

interface RemoveGlobalDepartmentHeadButtonProps {
    departmentId: string;
    employeeId: string;
    type: "head" | "subHead";
}

export function RemoveGlobalDepartmentHeadButton({ departmentId, employeeId, type }: RemoveGlobalDepartmentHeadButtonProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleRemove() {
        if (!confirm(`Are you sure you want to remove this ${type === "head" ? "Department Head" : "Sub Head"}?`)) return;

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
        <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-full"
            onClick={handleRemove}
            disabled={loading}
        >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
        </Button>
    );
}
