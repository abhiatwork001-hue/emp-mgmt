"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, EyeOff, Plus, Lock, History, ClipboardCopy } from "lucide-react";
import { getCredentialsForStore, createCredential, revealPassword, updateCredential } from "@/lib/actions/credential.actions";
import { toast } from "sonner";
import { format } from "date-fns";

interface CredentialManagerProps {
    storeId: string;
    userId: string;
    canEdit: boolean;
}

export function CredentialManager({ storeId, userId, canEdit }: CredentialManagerProps) {
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
                        Store Credentials
                    </CardTitle>
                    <CardDescription>Securely manage shared logins for this store.</CardDescription>
                </div>
                {canEdit && <AddCredentialDialog storeId={storeId} userId={userId} onSuccess={fetchCreds} />}
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Service</TableHead>
                            <TableHead>Username</TableHead>
                            <TableHead>Password</TableHead>
                            <TableHead>Last Updated</TableHead>
                            {canEdit && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {creds.map(c => (
                            <CredentialRow key={c._id} credential={c} userId={userId} onUpdate={fetchCreds} canEdit={canEdit} />
                        ))}
                        {creds.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                    No credentials stored yet.
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
            toast.success("Password revealed");
        } else {
            toast.error("Access Denied or Error");
        }
    };

    const copyToClipboard = () => {
        if (revealed) {
            navigator.clipboard.writeText(revealed);
            toast.success("Copied to clipboard");
        }
    };

    return (
        <TableRow>
            <TableCell className="font-medium">{credential.serviceName}</TableCell>
            <TableCell>{credential.username}</TableCell>
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
                {format(new Date(credential.updatedAt), "yyyy-MM-dd")}
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
    const [open, setOpen] = useState(false);
    const [service, setService] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [desc, setDesc] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!service || !username || !password) return;
        setLoading(true);
        await createCredential({ storeId, userId, serviceName: service, username, passwordRaw: password, description: desc });
        setLoading(false);
        setOpen(false);
        onSuccess();
        toast.success("Credential created");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add New</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Add Credential</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2"><Label>Service Name</Label><Input placeholder="e.g. UberEats" value={service} onChange={e => setService(e.target.value)} /></div>
                    <div className="grid gap-2"><Label>Username/Email</Label><Input value={username} onChange={e => setUsername(e.target.value)} /></div>
                    <div className="grid gap-2"><Label>Password</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
                    <div className="grid gap-2"><Label>Notes</Label><Input value={desc} onChange={e => setDesc(e.target.value)} /></div>
                </div>
                <DialogFooter><Button onClick={handleSubmit} disabled={loading}>Save</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function UpdateCredentialDialog({ credential, userId, onSuccess }: any) {
    const [open, setOpen] = useState(false);
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!password) return;
        setLoading(true);
        await updateCredential({ credentialId: credential._id, passwordRaw: password, userId });
        setLoading(false);
        setOpen(false);
        onSuccess();
        toast.success("Password Updated");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="ghost" size="sm">Edit</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Update Password for {credential.serviceName}</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="text-sm text-muted-foreground">Changes will be logged in audit history.</div>
                    <div className="grid gap-2"><Label>New Password</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
                </div>
                <DialogFooter><Button onClick={handleSubmit} disabled={loading}>Update</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
