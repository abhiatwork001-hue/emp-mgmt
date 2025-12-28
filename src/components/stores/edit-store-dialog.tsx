"use client";

import { useState } from "react";
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

    const [formData, setFormData] = useState({
        name: store.name,
        address: store.address || "",
        active: store.active
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            await updateStore(store._id, {
                name: formData.name,
                address: formData.address,
                active: formData.active
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white">
                        <Settings className="h-4 w-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-[#1e293b] border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>Edit Store</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Update store details and status.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="store-name">Name</Label>
                        <Input
                            id="store-name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="bg-[#111827] border-zinc-700 text-white"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="store-address">Address</Label>
                        <Input
                            id="store-address"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="bg-[#111827] border-zinc-700 text-white"
                        />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-zinc-700 p-3 bg-[#111827]">
                        <div className="space-y-0.5">
                            <Label className="text-base">Active Status</Label>
                            <p className="text-sm text-zinc-400">
                                {formData.active ? "Store is active" : "Store is inactive"}
                            </p>
                        </div>
                        <Switch
                            checked={formData.active}
                            onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-white text-black hover:bg-zinc-200">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
