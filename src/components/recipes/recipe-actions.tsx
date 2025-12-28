"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Archive, Trash2, RotateCcw, MonitorX } from "lucide-react";
import { archiveFood, deleteFood, restoreFood } from "@/lib/actions/recipe.actions";
import { toast } from "sonner";

interface RecipeActionsProps {
    id: string;
    isActive: boolean;
    isDeleted: boolean;
    canDelete: boolean; // Tech only for Delete
    canArchive: boolean; // Kitchen Head
    userId?: string;
}

export function RecipeActions({ id, isActive, isDeleted, canDelete, canArchive, userId }: RecipeActionsProps) {
    const [loading, setLoading] = useState(false);

    // Permission refinement (done in parent mostly, but we can double check logic here visually)
    // Parent passed broad 'canEdit'.
    // We assume 'canArchive' allows Archiving (isActive -> false).
    // 'canDelete' allows Hard Deleting (isDeleted -> true).

    const onArchive = async () => {
        setLoading(true);
        try {
            await archiveFood(id);
            toast.success("Recipe Archived", { description: "Recipe is now hidden from general staff." });
        } catch (e) {
            toast.error("Error", { description: "Failed to archive recipe." });
        } finally {
            setLoading(false);
        }
    };

    const onDelete = async () => {
        if (!confirm("Are you sure? This will move the recipe to trash (visible only to Tech).")) return;
        setLoading(true);
        try {
            await deleteFood(id);
            toast.success("Recipe Deleted", { description: "Recipe moved to trash." });
        } catch (e) {
            toast.error("Error", { description: "Failed to delete recipe." });
        } finally {
            setLoading(false);
        }
    };

    const onRestore = async () => {
        setLoading(true);
        try {
            await restoreFood(id);
            toast.success("Recipe Restored", { description: "Recipe is active again." });
        } catch (e) {
            toast.error("Error", { description: "Failed to restore recipe." });
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <Button disabled variant="ghost" size="icon">...</Button>;

    // Case 1: Active
    if (isActive) {
        if (!canArchive) return null;
        return (
            <Button onClick={onArchive} variant="outline" className="gap-2 text-amber-600 border-amber-200 hover:bg-amber-50">
                <Archive className="w-4 h-4" /> Archive
            </Button>
        );
    }

    // Case 2: Archived (isActive=false, isDeleted=false)
    if (!isActive && !isDeleted) {
        return (
            <div className="flex gap-2">
                <Button onClick={onRestore} variant="outline" className="gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                    <RotateCcw className="w-4 h-4" /> Restore
                </Button>
                {canDelete && (
                    <Button onClick={onDelete} variant="destructive" className="gap-2">
                        <Trash2 className="w-4 h-4" /> Delete
                    </Button>
                )}
            </div>
        );
    }

    // Case 3: Deleted (isDeleted=true) - Only visible to "Tech" (canDelete=true)
    if (isDeleted && canDelete) {
        return (
            <Button disabled variant="outline" className="gap-2 opacity-50 cursor-not-allowed border-red-200 bg-red-50 text-red-800">
                <MonitorX className="w-4 h-4" /> Trashed (Tech Only)
            </Button>
        );
    }

    return null;
}
