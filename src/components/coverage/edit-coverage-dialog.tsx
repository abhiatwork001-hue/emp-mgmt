"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { inviteCandidatesForCoverage } from "@/lib/actions/coverage.actions";

interface EditCoverageDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    request: any;
    onSuccess?: () => void;
}

export function EditCoverageDialog({ open, onOpenChange, request, onSuccess }: EditCoverageDialogProps) {
    const [hrMessage, setHrMessage] = useState(request?.hrMessage || "");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!request) return;

        setSaving(true);
        try {
            // Re-invite the same candidates with updated message
            const candidateIds = request.candidates.map((c: any) => c._id || c);
            await inviteCandidatesForCoverage(request._id, candidateIds, hrMessage);

            toast.success("Coverage request updated successfully");
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (error: any) {
            toast.error(error.message || "Failed to update coverage request");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Coverage Request</DialogTitle>
                    <DialogDescription>
                        Update the message sent to invited candidates. To change the candidate list, you'll need to re-invite.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Current Candidates ({request?.candidates?.length || 0})</Label>
                        <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg border">
                            {request?.candidates?.map((c: any, idx: number) => (
                                <div key={idx}>
                                    {c.firstName} {c.lastName}
                                </div>
                            )) || "No candidates"}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="hrMessage">Message to Candidates</Label>
                        <Textarea
                            id="hrMessage"
                            placeholder="Add or update your message to candidates..."
                            value={hrMessage}
                            onChange={(e) => setHrMessage(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
