"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Loader2, Pencil } from "lucide-react";
import { createNotice, updateNotice } from "@/lib/actions/notice.actions";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";

interface CreateNoticeDialogProps {
    userId: string;
    currentUserRole: string; // "admin", "store_manager", etc.
    storeId?: string;
    storeDepartmentId?: string;
    globalDepartmentId?: string;
    stores?: { _id: string; name: string }[];
    departments?: { _id: string; name: string }[]; // Global Departments
    storeDepartments?: { _id: string; name: string }[]; // Store specific departments
    mode?: 'create' | 'edit';
    initialData?: any;
    onSuccess?: () => void;
    trigger?: React.ReactNode;
}

export function CreateNoticeDialog({
    userId,
    currentUserRole,
    storeId,
    storeDepartmentId,
    globalDepartmentId,
    stores = [],
    departments = [],
    storeDepartments = [],
    mode = 'create',
    initialData,
    onSuccess,
    trigger
}: CreateNoticeDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [title, setTitle] = useState(initialData?.title || "");
    const [content, setContent] = useState(initialData?.content || "");
    const [scope, setScope] = useState(initialData?.targetScope || "");
    const [targetId, setTargetId] = useState(initialData?.targetId || "");
    const [targetRole, setTargetRole] = useState(initialData?.targetRole || "");
    const [expiresAt, setExpiresAt] = useState(initialData?.expiresAt ? new Date(initialData.expiresAt).toISOString().split('T')[0] : "");
    const [visibleToAdmin, setVisibleToAdmin] = useState(initialData?.visibleToAdmin || false);

    // Determine available scopes based on role
    const isSuper = ["owner", "admin", "hr", "super_user"].includes(currentUserRole);
    const isStoreManager = currentUserRole === "store_manager";
    const isDeptHead = currentUserRole === "department_head";
    const isStoreDeptHead = currentUserRole === "store_department_head";

    const handleSubmit = async () => {
        if (!title || !content || !scope) return;
        setLoading(true);

        try {
            const finalTargetId = targetId || (
                // Auto-fill target IDs for constrained roles
                scope === 'store' && isStoreManager ? storeId :
                    scope === 'store_department' && isStoreDeptHead ? storeDepartmentId :
                        undefined
            );

            const payload = {
                title,
                content,
                targetScope: scope,
                targetId: finalTargetId,
                targetRole: (scope === 'role_group' || scope === 'store_department')
                    ? (targetRole === 'all' ? undefined : targetRole)
                    : undefined,
                visibleToAdmin,
                expiresAt: expiresAt || undefined,
                userId
            };

            if (mode === 'edit' && initialData?._id) {
                await updateNotice(initialData._id, userId, payload);
                toast.success("Notice Updated");
            } else {
                await createNotice(payload);
                toast.success("Notice Posted");
            }

            setOpen(false);
            if (onSuccess) onSuccess();
            if (mode === 'create') {
                setTitle("");
                setContent("");
                setScope("");
                setTargetId("");
                setTargetRole("");
                setExpiresAt("");
                setVisibleToAdmin(false);
            }
        } catch (error) {
            toast.error("Failed to save notice");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button variant="outline" className="gap-2">
                        <Megaphone className="h-4 w-4" />
                        Post Notice
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{mode === 'edit' ? 'Edit Notice' : 'Post New Notice'}</DialogTitle>
                    <DialogDescription>
                        {mode === 'edit' ? 'Update your announcement.' : 'Announce updates, policies, or news to your team.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Title</Label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Holiday Schedule Changes" />
                    </div>

                    <div className="grid gap-2">
                        <Label>Target Audience</Label>
                        <Select value={scope} onValueChange={setScope} disabled={mode === 'edit'}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select who sees this..." />
                            </SelectTrigger>
                            <SelectContent>
                                {isSuper && (
                                    <>
                                        <SelectItem value="global">All Company (Global)</SelectItem>
                                        <SelectItem value="store">Specific Store</SelectItem>
                                        <SelectItem value="department">Specific Global Department</SelectItem>
                                        <SelectItem value="role_group">Specific Role Group</SelectItem>
                                    </>
                                )}
                                {isStoreManager && (
                                    <>
                                        <SelectItem value="store">My Store (All Employees)</SelectItem>
                                        <SelectItem value="role_group">Specific Role Group (In My Store)</SelectItem>
                                        <SelectItem value="store_department">Specific Department (In My Store)</SelectItem>
                                    </>
                                )}
                                {isDeptHead && <SelectItem value="department">My Department (All Global)</SelectItem>}
                                {isStoreDeptHead && <SelectItem value="store_department">My Department (Store Level)</SelectItem>}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Dynamic Target Inputs based on selection */}

                    {/* Store Department Selection (Store Manager) */}
                    {scope === 'store_department' && isStoreManager && (
                        <div className="grid gap-2">
                            <Label>Select Department</Label>
                            <Select value={targetId} onValueChange={setTargetId} disabled={mode === 'edit'}>
                                <SelectTrigger><SelectValue placeholder="Pick a department" /></SelectTrigger>
                                <SelectContent>
                                    {storeDepartments.length > 0 ? (
                                        storeDepartments.map(d => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)
                                    ) : (
                                        <SelectItem value="none" disabled>No departments found</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>

                            <Label className="mt-2">Filter by Content (Optional)</Label>
                            <Select value={targetRole} onValueChange={setTargetRole}>
                                <SelectTrigger><SelectValue placeholder="All Employees in Dept" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Employees</SelectItem>
                                    <SelectItem value="Store Department Head">Dept Head Only</SelectItem>
                                    <SelectItem value="Employee">Staff Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Store Selection (Super User) */}
                    {scope === 'store' && isSuper && (
                        <div className="grid gap-2">
                            <Label>Select Store</Label>
                            <Select value={targetId} onValueChange={setTargetId} disabled={mode === 'edit'}>
                                <SelectTrigger><SelectValue placeholder="Pick a store" /></SelectTrigger>
                                <SelectContent>
                                    {stores.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Global Dept Selection (Super User) */}
                    {scope === 'department' && isSuper && (
                        <div className="grid gap-2">
                            <Label>Select Department</Label>
                            <Select value={targetId} onValueChange={setTargetId} disabled={mode === 'edit'}>
                                <SelectTrigger><SelectValue placeholder="Pick a department" /></SelectTrigger>
                                <SelectContent>
                                    {departments.map(d => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Role Selection (Super User & Store Manager) */}
                    {scope === 'role_group' && (isSuper || isStoreManager) && (
                        <div className="grid gap-2">
                            <Label>Select Role</Label>
                            <Select value={targetRole} onValueChange={setTargetRole}>
                                <SelectTrigger><SelectValue placeholder="Pick a role" /></SelectTrigger>
                                <SelectContent>
                                    {isSuper && <SelectItem value="store_manager">Store Managers</SelectItem>}
                                    {isSuper && <SelectItem value="department_head">Department Heads</SelectItem>}
                                    <SelectItem value="store_department_head">Store Dept Heads</SelectItem>
                                    <SelectItem value="employee">Employees</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Expiration Date (Optional)</Label>
                            <DatePicker
                                date={expiresAt}
                                setDate={(d) => setExpiresAt(d ? d.toISOString().split('T')[0] : "")}
                                placeholder="Pick expiration date"
                            />
                            <p className="text-[10px] text-muted-foreground">Notice disappears after this date.</p>
                        </div>
                    </div>

                    {!isSuper && (
                        <div className="flex items-center space-x-2 py-2">
                            <Checkbox
                                id="adminVis"
                                checked={visibleToAdmin}
                                onCheckedChange={(c) => setVisibleToAdmin(c as boolean)}
                            />
                            <Label htmlFor="adminVis" className="cursor-pointer">Publish to Administrator as well</Label>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label>Content (Markdown)</Label>
                        <Textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder="Type your notice here..."
                            className="min-h-[150px]"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading || !title || !scope}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {mode === 'edit' ? "Save Changes" : "Post Notice"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
