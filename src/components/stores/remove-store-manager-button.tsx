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

export function RemoveStoreManagerButton({ storeId, employeeId, isSubManager = false }: RemoveStoreManagerButtonProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleRemove() {
        if (!confirm(`Are you sure you want to remove this ${isSubManager ? "Sub-Manager" : "Manager"}?`)) return;

        setLoading(true);
        try {
            await removeStoreManager(storeId, employeeId, isSubManager);
            router.refresh();
        } catch (error) {
            console.error("Failed to remove manager", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-full"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRemove();
            }}
            disabled={loading}
        >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
        </Button>
    );
}
