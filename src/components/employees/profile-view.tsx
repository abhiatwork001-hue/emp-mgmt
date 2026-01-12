"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Edit2, Building2, CreditCard, Mail, Phone, MapPin, Hash, FileText } from "lucide-react";
import { EditProfileDialog } from "./edit-profile-dialog";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { useSession } from "next-auth/react";

interface ProfileViewProps {
    employee: any;
}

export function ProfileView({ employee }: ProfileViewProps) {
    const { data: session } = useSession();
    const [editOpen, setEditOpen] = useState(false);
    const t = useTranslations("Profile");
    const tc = useTranslations("Common");
    const vt = useTranslations("Vacation");

    return (
        <div className="space-y-6">
            {/* Header / Actions */}
            <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg border border-border">
                <div>
                    <h3 className="text-lg font-medium text-white">{t("contactPersonal")}</h3>
                    <p className="text-sm text-muted-foreground">{t("contactPersonalDescription")}</p>
                </div>
                <Button onClick={() => setEditOpen(true)} size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Edit2 className="w-4 h-4 mr-2" />
                    {t("editDetails")}
                </Button>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Info */}
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("contactInformation")}</h4>
                    <div className="bg-muted/30 rounded-xl p-4 space-y-4 border border-border">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <Mail className="w-4 h-4 text-zinc-400" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{t("email")}</p>
                                <p className="text-sm text-foreground">{employee.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <Phone className="w-4 h-4 text-zinc-400" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{t("phone")}</p>
                                <p className="text-sm text-foreground">{employee.phone || "-"}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-zinc-400" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{t("address")}</p>
                                <p className="text-sm text-foreground">{employee.address || "-"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bank Details */}
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("bankDetails")}</h4>
                    <div className="bg-muted/30 rounded-xl p-4 space-y-4 border border-border">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-zinc-400" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{t("bankName")}</p>
                                <p className="text-sm text-foreground">{employee.bankName || "-"}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <CreditCard className="w-4 h-4 text-zinc-400" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{t("iban")}</p>
                                <p className="text-sm font-mono text-foreground">{employee.iban || "-"}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <Hash className="w-4 h-4 text-zinc-400" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{t("nif")}</p>
                                <p className="text-sm text-foreground">{employee.nif || "-"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Emergency Contact */}
                <div className="space-y-4 md:col-span-2">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Emergency Contact</h4>
                    <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                                <Phone className="w-4 h-4 text-red-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Contact Name</p>
                                <p className="text-sm font-medium text-foreground">{employee.emergencyContact?.name || "-"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                                <Hash className="w-4 h-4 text-red-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Relationship</p>
                                <p className="text-sm font-medium text-foreground">{employee.emergencyContact?.relationship || "-"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                                <Phone className="w-4 h-4 text-red-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Phone Number</p>
                                <p className="text-sm font-medium text-foreground">{employee.emergencyContact?.phoneNumber || "-"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                                <Mail className="w-4 h-4 text-red-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Email</p>
                                <p className="text-sm font-medium text-foreground">{employee.emergencyContact?.email || "-"}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contract Summary (Read Only) */}
            <div className="space-y-4 pt-6 border-t border-border">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("employmentDetails")}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-xl border border-border">
                    <div>
                        <p className="text-xs text-muted-foreground">{tc("type")}</p>
                        <p className="text-sm font-medium text-white">{employee.contract?.employmentType || "Contracted"}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">{t("weeklyHours")}</p>
                        <p className="text-sm font-medium text-white">{employee.contract?.weeklyHours || 40}h</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">{t("vacationAllowance")}</p>
                        <p className="text-sm font-medium text-white">{employee.vacationTracker?.defaultDays || 22} {vt("days")}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">{t("joined")}</p>
                        <p className="text-sm font-medium text-white">{employee.joinedOn ? format(new Date(employee.joinedOn), "PPP") : "-"}</p>
                    </div>
                </div>
            </div>

            <EditProfileDialog
                employee={employee}
                open={editOpen}
                onOpenChange={setEditOpen}
            />
        </div>
    );
}
