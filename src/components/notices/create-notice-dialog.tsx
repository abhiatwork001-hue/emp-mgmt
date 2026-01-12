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
import { useTranslations } from "next-intl";

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
    const t = useTranslations("Notices");

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
                toast.success(t('noticeUpdated'));
            } else {
                await createNotice(payload);
                toast.success(t('noticePosted'));
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
            toast.error(t('failedToSave'));
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
                        {t('postNotice')}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{mode === 'edit' ? t('editNotice') : t('postNewNotice')}</DialogTitle>
                    <DialogDescription>
                        {mode === 'edit' ? t('editDescription') : t('createDescription')}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>{t('title')}</Label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('titlePlaceholder')} />
                    </div>

                    <div className="grid gap-2">
                        <Label>{t('targetAudience')}</Label>
                        <Select value={scope} onValueChange={setScope} disabled={mode === 'edit'}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('selectAudience')} />
                            </SelectTrigger>
                            <SelectContent>
                                {isSuper && (
                                    <>
                                        <SelectItem value="global">{t('allCompany')}</SelectItem>
                                        <SelectItem value="store">{t('specificStore')}</SelectItem>
                                        <SelectItem value="department">{t('specificGlobalDept')}</SelectItem>
                                        <SelectItem value="role_group">{t('specificRoleGroup')}</SelectItem>
                                    </>
                                )}
                                {isStoreManager && (
                                    <>
                                        <SelectItem value="store">{t('myStore')}</SelectItem>
                                        <SelectItem value="role_group">{t('roleGroupInStore')}</SelectItem>
                                        <SelectItem value="store_department">{t('deptInStore')}</SelectItem>
                                    </>
                                )}
                                {isDeptHead && <SelectItem value="department">{t('myDeptGlobal')}</SelectItem>}
                                {isStoreDeptHead && <SelectItem value="store_department">{t('myDeptStore')}</SelectItem>}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Dynamic Target Inputs based on selection */}

                    {/* Store Department Selection (Store Manager) */}
                    {scope === 'store_department' && isStoreManager && (
                        <div className="grid gap-2">
                            <Label>{t('selectDepartment')}</Label>
                            <Select value={targetId} onValueChange={setTargetId} disabled={mode === 'edit'}>
                                <SelectTrigger><SelectValue placeholder={t('pickDepartment')} /></SelectTrigger>
                                <SelectContent>
                                    {storeDepartments.length > 0 ? (
                                        storeDepartments.map(d => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)
                                    ) : (
                                        <SelectItem value="none" disabled>{t('noDeptsFound')}</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>

                            <Label className="mt-2">{t('filterContent')}</Label>
                            <Select value={targetRole} onValueChange={setTargetRole}>
                                <SelectTrigger><SelectValue placeholder={t('allEmployeesInDept')} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('allEmployees')}</SelectItem>
                                    <SelectItem value="Store Department Head">{t('deptHeadOnly')}</SelectItem>
                                    <SelectItem value="Employee">{t('staffOnly')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Store Department Head - Just Role Filter */}
                    {scope === 'store_department' && isStoreDeptHead && (
                        <div className="grid gap-2">
                            <Label>{t('filterContent')}</Label>
                            <Select value={targetRole} onValueChange={setTargetRole}>
                                <SelectTrigger><SelectValue placeholder={t('allEmployeesInDept')} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('allEmployees')}</SelectItem>
                                    <SelectItem value="Employee">{t('staffOnly')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Store Selection (Super User) */}
                    {scope === 'store' && isSuper && (
                        <div className="grid gap-2">
                            <Label>{t('selectStore')}</Label>
                            <Select value={targetId} onValueChange={setTargetId} disabled={mode === 'edit'}>
                                <SelectTrigger><SelectValue placeholder={t('pickStore')} /></SelectTrigger>
                                <SelectContent>
                                    {stores.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Global Dept Selection (Super User) */}
                    {scope === 'department' && isSuper && (
                        <div className="grid gap-2">
                            <Label>{t('selectDepartment')}</Label>
                            <Select value={targetId} onValueChange={setTargetId} disabled={mode === 'edit'}>
                                <SelectTrigger><SelectValue placeholder={t('pickDepartment')} /></SelectTrigger>
                                <SelectContent>
                                    {departments.map(d => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Role Selection (Super User & Store Manager) */}
                    {scope === 'role_group' && (isSuper || isStoreManager) && (
                        <div className="grid gap-2">
                            <Label>{t('selectRole')}</Label>
                            <Select value={targetRole} onValueChange={setTargetRole}>
                                <SelectTrigger><SelectValue placeholder={t('pickRole')} /></SelectTrigger>
                                <SelectContent>
                                    {isSuper && <SelectItem value="store_manager">{t('storeManagers')}</SelectItem>}
                                    {isSuper && <SelectItem value="department_head">{t('departmentHeads')}</SelectItem>}
                                    <SelectItem value="store_department_head">{t('storeDeptHeads')}</SelectItem>
                                    <SelectItem value="employee">{t('employees')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>{t('expirationDate')}</Label>
                            <DatePicker
                                date={expiresAt}
                                setDate={(d) => setExpiresAt(d ? d.toISOString().split('T')[0] : "")}
                                placeholder={t('pickExpiration')}
                            />
                            <p className="text-[10px] text-muted-foreground">{t('expirationHelp')}</p>
                        </div>
                    </div>

                    {!isSuper && (
                        <div className="flex items-center space-x-2 py-2">
                            <Checkbox
                                id="adminVis"
                                checked={visibleToAdmin}
                                onCheckedChange={(c) => setVisibleToAdmin(c as boolean)}
                            />
                            <Label htmlFor="adminVis" className="cursor-pointer">{t('publishToAdmin')}</Label>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label>{t('contentMarkdown')}</Label>
                        <Textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder={t('contentPlaceholder')}
                            className="min-h-[150px]"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setOpen(false)}>{t('cancel')}</Button>
                    <Button onClick={handleSubmit} disabled={loading || !title || !scope}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {mode === 'edit' ? t('saveChanges') : t('postNotice')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
