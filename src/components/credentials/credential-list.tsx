"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, EyeOff, Plus, Lock, ClipboardCopy } from "lucide-react";
import { getCredentialsForStore, createCredential, revealPassword, updateCredential } from "@/lib/actions/credential.actions";
import { toast } from "sonner";
import { format } from "date-fns";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useTranslations, useLocale } from "next-intl";
import { enUS, ptBR } from "date-fns/locale";

interface CredentialManagerProps {
    storeId: string;
    userId: string;
    canEdit: boolean;
}

export function CredentialManager({ storeId, userId, canEdit }: CredentialManagerProps) {
    const t = useTranslations("Credentials");
    const [creds, setCreds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCreds = async () => {
        setLoading(true);
        const data = await getCredentialsForStore(storeId);
        setCreds(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchCreds();
    }, [storeId]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        {t('title')}
                    </CardTitle>
                    <CardDescription>{t('subtitle')}</CardDescription>
                </div>
                {canEdit && <AddCredentialDialog storeId={storeId} userId={userId} onSuccess={fetchCreds} />}
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('table.service')}</TableHead>
                            <TableHead>{t('table.type')}</TableHead>
                            <TableHead>{t('table.username')}</TableHead>
                            <TableHead>{t('table.password')}</TableHead>
                            <TableHead>{t('table.lastUpdated')}</TableHead>
                            {canEdit && <TableHead className="text-right">{t('table.actions')}</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {creds.map(c => (
                            <CredentialRow key={c._id} credential={c} userId={userId} onUpdate={fetchCreds} canEdit={canEdit} />
                        ))}
                        {creds.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                    {t('table.empty')}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function CredentialRow({ credential, userId, onUpdate, canEdit }: { credential: any, userId: string, onUpdate: () => void, canEdit: boolean }) {
    const t = useTranslations("Credentials");
    const locale = useLocale();
    const dateLocale = locale === 'pt' ? ptBR : enUS;

    const [revealed, setRevealed] = useState("");
    const [loading, setLoading] = useState(false);

    const handleReveal = async () => {
        if (revealed) {
            setRevealed("");
            return;
        }
        setLoading(true);
        const res = await revealPassword(credential._id, userId);
        setLoading(false);
        if (res.success && res.password) {
            setRevealed(res.password);
            toast.success(t('actions.reveal'));
        } else {
            toast.error(t('actions.denied'));
        }
    };

    const copyToClipboard = () => {
        if (revealed) {
            navigator.clipboard.writeText(revealed);
            toast.success(t('actions.copy'));
        }
    };

    const isSimple = credential.type === 'simple';

    return (
        <TableRow>
            <TableCell className="font-medium">
                {credential.serviceName}
                {credential.description && <div className="text-xs text-muted-foreground">{credential.description}</div>}
            </TableCell>
            <TableCell>
                <Badge variant="outline" className="text-xs font-normal">
                    {isSimple ? t('table.types.simple') : t('table.types.standard')}
                </Badge>
            </TableCell>
            <TableCell>
                {isSimple ? (
                    <span className="text-muted-foreground text-xs italic">N/A</span>
                ) : (
                    credential.username
                )}
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <div className="font-mono bg-muted px-2 py-1 rounded text-xs min-w-[100px]">
                        {revealed ? revealed : "•••••••••••••"}
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleReveal} disabled={loading}>
                        {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                    {revealed && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyToClipboard}>
                            <ClipboardCopy className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
                {format(new Date(credential.updatedAt || credential.createdAt), "yyyy-MM-dd", { locale: dateLocale })}
            </TableCell>
            {canEdit && (
                <TableCell className="text-right">
                    <UpdateCredentialDialog credential={credential} userId={userId} onSuccess={onUpdate} />
                </TableCell>
            )}
        </TableRow>
    );
}

function AddCredentialDialog({ storeId, userId, onSuccess }: any) {
    const t = useTranslations("Credentials");
    const [open, setOpen] = useState(false);
    const [service, setService] = useState("");
    const [type, setType] = useState<"standard" | "simple">("standard");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [desc, setDesc] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!service || !password) return;
        if (type === 'standard' && !username) return;

        setLoading(true);
        await createCredential({
            storeId,
            userId,
            serviceName: service,
            type,
            username: type === 'standard' ? username : undefined,
            passwordRaw: password,
            description: desc
        });
        setLoading(false);
        setOpen(false);
        // Reset
        setService(""); setUsername(""); setPassword(""); setDesc(""); setType("standard");
        onSuccess();
        toast.success(t('dialog.created'));
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> {t('addNew')}</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>{t('dialog.addTitle')}</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>{t('dialog.typeLabel')}</Label>
                        <RadioGroup defaultValue="standard" value={type} onValueChange={(v: any) => setType(v)}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="standard" id="std" />
                                <Label htmlFor="std">{t('dialog.standard')}</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="simple" id="simp" />
                                <Label htmlFor="simp">{t('dialog.simple')}</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="grid gap-2">
                        <Label>{type === 'standard' ? t('dialog.serviceLabel') : t('dialog.titleLabel')}</Label>
                        <Input placeholder={type === 'standard' ? t('dialog.servicePlaceholder') : t('dialog.titlePlaceholder')} value={service} onChange={e => setService(e.target.value)} />
                    </div>

                    {type === 'standard' && (
                        <div className="grid gap-2"><Label>{t('dialog.usernameLabel')}</Label><Input value={username} onChange={e => setUsername(e.target.value)} /></div>
                    )}

                    <div className="grid gap-2"><Label>{t('dialog.passwordLabel')}</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
                    <div className="grid gap-2"><Label>{t('dialog.notesLabel')}</Label><Input value={desc} onChange={e => setDesc(e.target.value)} /></div>
                </div>
                <DialogFooter><Button onClick={handleSubmit} disabled={loading}>{t('dialog.save')}</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


function UpdateCredentialDialog({ credential, userId, onSuccess }: any) {
    const t = useTranslations("Credentials");
    const [open, setOpen] = useState(false);
    const [service, setService] = useState(credential.serviceName);
    const [username, setUsername] = useState(credential.username || "");
    const [desc, setDesc] = useState(credential.description || "");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        await updateCredential({
            credentialId: credential._id,
            serviceName: service,
            username: username,
            description: desc,
            passwordRaw: password || undefined,
            userId
        });
        setLoading(false);
        setOpen(false);
        onSuccess();
        toast.success(t('dialog.updated'));
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="ghost" size="sm">{t('actions.edit')}</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>{t('dialog.editTitle')}</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2"><Label>{t('dialog.serviceLabel')}</Label><Input value={service} onChange={e => setService(e.target.value)} /></div>

                    {credential.type !== 'simple' && (
                        <div className="grid gap-2"><Label>{t('dialog.usernameLabel')}</Label><Input value={username} onChange={e => setUsername(e.target.value)} /></div>
                    )}

                    <div className="grid gap-2"><Label>{t('dialog.notesLabel')}</Label><Input value={desc} onChange={e => setDesc(e.target.value)} /></div>

                    <div className="pt-4 border-t mt-2">
                        <Label className="text-muted-foreground">{t('dialog.changePasswordLabel')}</Label>
                        <Input className="mt-2" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('dialog.newPasswordPlaceholder')} />
                    </div>
                </div>
                <DialogFooter><Button onClick={handleSubmit} disabled={loading}>{t('dialog.update')}</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
