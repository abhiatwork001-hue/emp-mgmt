"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateEmployee } from "@/lib/actions/employee.actions";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UploadButton } from "@/lib/uploadthing";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImagePlus, X, Loader2 } from "lucide-react";

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
                                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder={t('placeholders.phone')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address">{t("address")}</Label>
                                <Input id="address" name="address" value={formData.address} onChange={handleChange} placeholder={t('placeholders.address')} />
                            </div>
                            <div className="space-y-3">
                                <Label>{t("profilePicture")}</Label>
                                <div className="flex items-center gap-6 p-4 bg-muted/30 rounded-2xl border border-dashed border-border group">
                                    <div className="relative">
                                        <Avatar className="h-20 w-20 border-2 border-primary/20 shadow-md">
                                            <AvatarImage src={formData.image} />
                                            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                                                {employee.firstName?.[0]}{employee.lastName?.[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                        {formData.image && (
                                            <button
                                                onClick={() => setFormData(prev => ({ ...prev, image: "" }))}
                                                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 shadow-lg hover:scale-110 transition-transform"
                                                title="Remove Image"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex-1 space-y-2">
                                        <UploadButton
                                            endpoint="profileImage"
                                            onClientUploadComplete={(res) => {
                                                if (res?.[0]) {
                                                    setFormData(prev => ({ ...prev, image: res[0].url }));
                                                }
                                            }}
                                            onUploadError={(error: Error) => {
                                                console.error(error);
                                            }}
                                            appearance={{
                                                button: "bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 rounded-xl text-xs font-bold transition-all",
                                                allowedContent: "text-[10px] text-muted-foreground font-medium uppercase tracking-tighter"
                                            }}
                                            content={{
                                                button({ ready }) {
                                                    if (ready) return <div className="flex items-center gap-2"><ImagePlus className="w-3 h-3" /> {formData.image ? t('changePhoto') : t('uploadPhoto')}</div>;
                                                    return <Loader2 className="w-3 h-3 animate-spin" />;
                                                }
                                            }}
                                        />
                                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                                            {t('recommendedImage')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border">
                        <h4 className="text-sm font-medium text-muted-foreground uppercase">{t("bankTaxDetails")}</h4>
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="bankName">{t("bankName")}</Label>
                                <Input id="bankName" name="bankName" value={formData.bankName} onChange={handleChange} placeholder={t('placeholders.bankName')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="iban">{t("iban")}</Label>
                                <Input id="iban" name="iban" value={formData.iban} onChange={handleChange} placeholder={t('placeholders.iban')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nif">{t("nif")}</Label>
                                <Input id="nif" name="nif" value={formData.nif} onChange={handleChange} placeholder={t('placeholders.nif')} />
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
