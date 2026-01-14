"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { Building2, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddDepartmentDialog } from "@/components/stores/add-department-dialog";
import { EditStoreDepartmentDialog } from "@/components/stores/edit-store-department-dialog";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface StoreDepartmentsListClientProps {
    storeDepartments: any[];
    storeSlug: string;
    storeId: string;
    canManage: boolean;
}

export function StoreDepartmentsListClient({ storeDepartments, storeSlug, storeId, canManage }: StoreDepartmentsListClientProps) {
    // Removal State
    const [deptToRemove, setDeptToRemove] = useState<{ id: string; name: string } | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const { removeStoreDepartment } = require("@/lib/actions/store.actions"); // Dynamic import to avoid server action in client boundary if not direct
    // Actually we can import server actions directly in client components in Next.js 14+ specific setups but usually safer to pass as prop or import top level if marked "use server"
    // store.actions.ts starts with 'use server', so we can import.

    // For simplicity, we'll assume we can import removeStoreDepartment from top.
    // Let's add imports first.

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg">Departments</CardTitle>
                    <p className="text-sm text-zinc-400">Departments operating in this store</p>
                </div>
                <div className="flex gap-2">
                    {/* AddDepartmentDialog needs ID for backend */}
                    {canManage && <AddDepartmentDialog storeId={storeId} />}
                    {canManage && (
                        <Button
                            variant={isEditing ? "secondary" : "outline"}
                            size="sm"
                            className="border-border hover:bg-accent"
                            onClick={() => setIsEditing(!isEditing)}
                        >
                            {isEditing ? "Done Editing" : "Manage Depts"}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {storeDepartments.length === 0 ? (
                    <p className="text-zinc-500 text-sm">No departments assigned to this store.</p>
                ) : (
                    <div className="space-y-4">
                        {storeDepartments.map((dept: any) => (
                            <div key={dept._id} className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-accent transition group">
                                <Link
                                    href={`/dashboard/stores/${storeSlug}/departments/${dept.slug}`}
                                    className="flex-1"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                            <Building2 className="h-5 w-5 text-zinc-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium group-hover:text-muted-foreground">{dept.name}</p>
                                            <p className="text-sm text-zinc-500">{dept.globalDepartmentId?.description || "No description available"}</p>
                                        </div>
                                    </div>
                                    <div className="mt-2 ml-14 flex items-center gap-2">
                                        {/* Display Department Head(s) if available */}
                                        {dept.headOfDepartment && dept.headOfDepartment.length > 0 ? (
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs font-bold bg-muted px-1 rounded text-muted-foreground">HD</span>
                                                <div className="flex -space-x-2">
                                                    {dept.headOfDepartment.map((head: any) => (
                                                        <div key={`${dept._id}-head-${head._id}`} className="h-5 w-5 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden" title={`${head.firstName} ${head.lastName}`}>
                                                            {head.image ? (
                                                                <img src={head.image} alt={head.firstName} className="h-full w-full object-cover" />
                                                            ) : (
                                                                <span className="text-[8px] font-bold text-zinc-300">{head.firstName?.[0]}{head.lastName?.[0]}</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 opacity-50">
                                                <span className="text-xs font-bold bg-muted px-1 rounded text-muted-foreground">HD</span>
                                                <span className="text-sm text-zinc-500">Unassigned</span>
                                            </div>
                                        )}
                                    </div>
                                </Link>

                                {isEditing && (
                                    <div className="ml-4 flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <EditStoreDepartmentDialog department={dept} />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                                            onClick={() => setDeptToRemove({ id: dept._id, name: dept.name })}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            <AlertDialog open={!!deptToRemove} onOpenChange={(open) => !open && setDeptToRemove(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove {deptToRemove?.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove the department from this store.
                            Employees will be unassigned and pending coverage requests cancelled.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={isRemoving}
                            onClick={async (e) => {
                                e.preventDefault();
                                if (!deptToRemove) return;
                                setIsRemoving(true);
                                try {
                                    // Use imported action
                                    const { removeStoreDepartment } = await import("@/lib/actions/store.actions");
                                    const res = await removeStoreDepartment(storeId, deptToRemove.id);
                                    if (res.success) {
                                        toast.success("Department removed");
                                        // window.location.reload(); // Simple refresh or router.refresh() 
                                        // Since we are client, better to stick to props update or router refresh
                                        // imports from next/navigation needed
                                    } else {
                                        toast.error("Failed to remove");
                                    }
                                } catch (err) {
                                    toast.error("Error occurred");
                                } finally {
                                    setIsRemoving(false);
                                    setDeptToRemove(null);
                                    // Trigger refresh
                                    window.location.reload();
                                }
                            }}
                        >
                            {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
