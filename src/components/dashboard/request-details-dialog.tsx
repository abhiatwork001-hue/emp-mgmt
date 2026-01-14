"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface RequestDetailsDialogProps {
    item: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    canEdit: boolean; // If true, shows Edit buttons for own requests
    onCancel: (id: string, type: string) => void;
    onSaveEdit: (id: string, type: string, data: any) => Promise<void>;
    onApprove?: (id: string, type: string) => void;
    onReject?: (id: string, type: string) => void;
    isProcessing: boolean;
    userId: string;
}

export function RequestDetailsDialog({
    item,
    open,
    onOpenChange,
    canEdit,
    onCancel,
    onSaveEdit,
    onApprove,
    onReject,
    isProcessing,
    userId
}: RequestDetailsDialogProps) {
    // We'll use common translations or hardcode english for now if translations missing
    // Ideally pass 't' or use generic
    const [editMode, setEditMode] = useState(false);
    const [editData, setEditData] = useState<any>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (item) {
            setEditData({
                hours: item.hoursRequested,
                reason: item.reason || item.comments || "",
                requestedFrom: item.requestedFrom,
                requestedTo: item.requestedTo,
                date: item.date || item.dayDate, // Handle absence 'date' and overtime 'dayDate'
            });
            setEditMode(false);
        }
    }, [item]);

    if (!item) return null;

    // Determine type from item or passed structure. 
    // The calling parent usually knows the type, but let's try to infer or rely on item structure if type not passed. 
    // Actually, looking at ActionItemCard, 'type' is passed. We should probably pass 'type' to this dialog too explicitly, 
    // but item usually has it in 'type' field? No, mongoose docs don't always have 'type'.
    // Let's assume the parent passes the type or we infer.
    // 'pending-actions-client' knows the type when it opens the dialog.
    // Let's add 'type' to props or assume item has it. 
    // In pending-actions-client handleAction, we know the type. 
    // Let's update props to include type.

    // For now, let's look at the implementation. 'item' from pending-actions-client seems to be the raw doc.
    // Absence has 'date', Overtime has 'dayDate', Vacation has 'requestedFrom'.

    const type = item.type || (item.requestedFrom ? 'vacation' : (item.hoursRequested ? 'overtime' : 'absence'));
    // Note: Overtime might just have hoursRequested. Absence has date.

    const isOwner = item.employeeId?._id === userId || item.employeeId === userId;
    const canApprove = !!onApprove;

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSaveEdit(item._id, type, editData);
            setEditMode(false);
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 capitalize">
                        <span>{type} Request</span>
                        <Badge variant="outline">{type}</Badge>
                    </DialogTitle>
                    <DialogDescription>
                        Submitted on {item.createdAt ? format(new Date(item.createdAt), "PPP p") : "Unknown date"}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-muted-foreground text-xs uppercase">Employee</Label>
                            <div className="font-medium">
                                {item.employeeId?.firstName} {item.employeeId?.lastName}
                            </div>
                        </div>
                        <div>
                            <Label className="text-muted-foreground text-xs uppercase">Store/Dept</Label>
                            <div className="font-medium">
                                {item.employeeId?.storeId?.name} / {item.employeeId?.storeDepartmentId?.name}
                            </div>
                        </div>

                        {(type === 'absence' || type === 'overtime') && (
                            <div>
                                <Label className="text-muted-foreground text-xs uppercase">Date</Label>
                                {editMode ? (
                                    <Input
                                        type="date"
                                        value={editData.date ? new Date(editData.date).toISOString().split('T')[0] : ''}
                                        onChange={e => setEditData({ ...editData, date: new Date(e.target.value) })}
                                        className="h-8"
                                    />
                                ) : (
                                    <div className="font-medium">{(item.date || item.dayDate) ? format(new Date(item.date || item.dayDate), "PPP") : 'N/A'}</div>
                                )}
                            </div>
                        )}

                        {type === 'overtime' && (
                            <div>
                                <Label className="text-muted-foreground text-xs uppercase">Hours</Label>
                                {editMode ? (
                                    <Input
                                        type="number"
                                        value={editData.hours}
                                        onChange={e => setEditData({ ...editData, hours: Number(e.target.value) })}
                                        className="h-8"
                                    />
                                ) : (
                                    <div className="font-medium">{item.hoursRequested} Hours</div>
                                )}
                            </div>
                        )}

                        {type === 'vacation' && (
                            <>
                                <div>
                                    <Label className="text-muted-foreground text-xs uppercase">From</Label>
                                    {editMode ? (
                                        <Input
                                            type="date"
                                            value={editData.requestedFrom ? new Date(editData.requestedFrom).toISOString().split('T')[0] : ''}
                                            onChange={e => setEditData({ ...editData, requestedFrom: new Date(e.target.value) })}
                                            className="h-8"
                                        />
                                    ) : (
                                        <div className="font-medium">{item.requestedFrom ? format(new Date(item.requestedFrom), "PPP") : 'N/A'}</div>
                                    )}
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-xs uppercase">To</Label>
                                    {editMode ? (
                                        <Input
                                            type="date"
                                            value={editData.requestedTo ? new Date(editData.requestedTo).toISOString().split('T')[0] : ''}
                                            onChange={e => setEditData({ ...editData, requestedTo: new Date(e.target.value) })}
                                            className="h-8"
                                        />
                                    ) : (
                                        <div className="font-medium">{item.requestedTo ? format(new Date(item.requestedTo), "PPP") : 'N/A'}</div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-muted-foreground text-xs uppercase">Reason / Details</Label>
                        {editMode ? (
                            <Textarea
                                value={editData.reason}
                                onChange={e => setEditData({ ...editData, reason: e.target.value })}
                            />
                        ) : (
                            <div className="p-3 rounded-lg bg-muted/30 text-sm min-h-[60px]">
                                {item.reason || item.comments || "No details provided."}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="flex gap-2 justify-end">
                    {/* Actions for Approver */}
                    {canApprove && !isOwner && onApprove && onReject && (
                        <>
                            <Button variant="destructive" onClick={() => onReject(item._id, type)} disabled={isProcessing}>
                                Reject
                            </Button>
                            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => onApprove(item._id, type)} disabled={isProcessing}>
                                Approve
                            </Button>
                        </>
                    )}

                    {/* Actions for Owner (Edit/Cancel) */}
                    {canEdit && isOwner && (
                        <>
                            {editMode ? (
                                <>
                                    <Button variant="ghost" onClick={() => setEditMode(false)} disabled={saving}>Cancel Edit</Button>
                                    <Button onClick={handleSave} disabled={saving}>
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        Save Changes
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => onCancel(item._id, type)} disabled={isProcessing}>
                                        Cancel Request
                                    </Button>
                                    <Button variant="outline" onClick={() => setEditMode(true)} disabled={isProcessing}>
                                        Edit Request
                                    </Button>
                                </>
                            )}
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
