"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateEmployee } from "@/lib/actions/employee.actions";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface EditProfileDialogProps {
    employee: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditProfileDialog({ employee, open, onOpenChange }: EditProfileDialogProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const t = useTranslations("Profile");
    const tc = useTranslations("Common");

    const [formData, setFormData] = useState({
        // Editable fields
        phone: employee.phone || "",
        address: employee.address || "",
        bankName: employee.bankName || "",
        iban: employee.iban || "",
        nif: employee.nif || "", // allow editing NIF? User said "bank details", NIF often with bank/tax. Let's include.
        image: employee.image || ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            // Only update specific fields
            await updateEmployee(employee._id, {
                ...formData
            });
            router.refresh();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            // toast error
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t("editProfile")}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-muted-foreground uppercase">{t("contactInformation")}</h4>
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">{t("phone")}</Label>
                                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 234 567 890" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address">{t("address")}</Label>
                                <Input id="address" name="address" value={formData.address} onChange={handleChange} placeholder="123 Main St" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="image">{t("profilePicture")}</Label>
                                <Input id="image" name="image" value={formData.image} onChange={handleChange} placeholder="https://..." />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border">
                        <h4 className="text-sm font-medium text-muted-foreground uppercase">{t("bankTaxDetails")}</h4>
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="bankName">{t("bankName")}</Label>
                                <Input id="bankName" name="bankName" value={formData.bankName} onChange={handleChange} placeholder="Bank of America" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="iban">{t("iban")}</Label>
                                <Input id="iban" name="iban" value={formData.iban} onChange={handleChange} placeholder="US12 3456..." />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nif">{t("nif")}</Label>
                                <Input id="nif" name="nif" value={formData.nif} onChange={handleChange} placeholder="123456789" />
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{tc("cancel")}</Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading ? tc("loading") : tc("save")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
//
