"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Edit, Loader2, Settings } from "lucide-react";
import { updateStore } from "@/lib/actions/store.actions";
import { useRouter } from "next/navigation";

interface EditStoreDialogProps {
    store: {
        _id: string;
        name: string;
        address?: string; // Optional in list
        active: boolean;
    };
    trigger?: React.ReactNode;
}

export function EditStoreDialog({ store, trigger }: EditStoreDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const tc = useTranslations("Common");

    const [formData, setFormData] = useState({
        name: store.name,
        address: store.address || "",
        active: store.active,
        minEmployees: (store as any).minEmployees || 0
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            await updateStore(store._id, {
                name: formData.name,
                address: formData.address,
                active: formData.active,
                minEmployees: formData.minEmployees
            });
            setOpen(false);
            router.refresh();
        } catch (error) {
            console.error("Failed to update store", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Settings className="h-4 w-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-popover border-border text-popover-foreground">
                <DialogHeader>
                    <DialogTitle>{tc('edit')} {tc('store')}</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Update store details and status.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="store-name">{tc('name')}</Label>
                        <Input
                            id="store-name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="bg-muted/50 border-border"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="store-address">Address</Label>
                        <Input
                            id="store-address"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="bg-muted/50 border-border"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="min-employees">Minimum Employees</Label>
                        <Input
                            id="min-employees"
                            type="number"
                            min="0"
                            value={formData.minEmployees}
                            onChange={(e) => setFormData({ ...formData, minEmployees: parseInt(e.target.value) || 0 })}
                            className="bg-muted/50 border-border"
                        />
                        <p className="text-xs text-muted-foreground">Sets the minimum staff requirement for this store.</p>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/30">
                        <div className="space-y-0.5">
                            <Label className="text-base">Active Status</Label>
                            <p className="text-sm text-muted-foreground">
                                {formData.active ? "Store is active" : "Store is inactive"}
                            </p>
                        </div>
                        <Switch
                            checked={formData.active}
                            onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                            {tc('cancel')}
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {tc('save')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
