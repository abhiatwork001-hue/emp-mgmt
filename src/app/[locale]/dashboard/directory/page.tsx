"use client";

import { useEffect, useState } from "react";
import { getDirectoryData, createStoreResource, deleteStoreResource } from "@/lib/actions/directory.actions";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Mail, MapPin, User, Shield, Wrench, Monitor, CreditCard, Plus, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DirectoryPage() {
    const { data: session } = useSession();
    const [data, setData] = useState<{ resources: any[], keyContacts: any[], stores: any[] } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Resource Form State
    const [newResource, setNewResource] = useState<{
        type: "IT" | "POS" | "Maintenance" | "Insurance" | "Other";
        name: string;
        phoneNumber: string;
        email: string;
        info: string;
        visibility: "global" | "store_specific";
    }>({
        type: "IT",
        name: "",
        phoneNumber: "",
        email: "",
        info: "",
        visibility: "global"
    });

    const userRoles = (session?.user as any)?.roles || [];
    const canManageResources = userRoles.some((r: string) => ["admin", "owner", "tech"].includes(r.toLowerCase()));

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const result = await getDirectoryData((session?.user as any)?.storeId);
            setData(result);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [session]);

    const handleCreateResource = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createStoreResource(newResource);
            toast.success("Resource added");
            setIsDialogOpen(false);
            fetchData();
            setNewResource({ type: "IT", name: "", phoneNumber: "", email: "", info: "", visibility: "global" });
        } catch (error) {
            toast.error("Failed to add resource");
        }
    };

    const handleDeleteResource = async (id: string) => {
        if (!confirm("Delete this resource?")) return;
        try {
            await deleteStoreResource(id);
            toast.success("Resource deleted");
            fetchData();
        } catch (error) {
            toast.error("Failed to delete");
        }
    };

    if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading directory...</div>;
    if (!data) return <div className="p-8 text-center text-red-500">Failed to load directory.</div>;

    const getIconForType = (type: string) => {
        switch (type) {
            case "IT": return <Monitor className="w-5 h-5 text-blue-500" />;
            case "POS": return <CreditCard className="w-5 h-5 text-purple-500" />;
            case "Maintenance": return <Wrench className="w-5 h-5 text-orange-500" />;
            case "Insurance": return <Shield className="w-5 h-5 text-green-500" />;
            default: return <Phone className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-12 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                        Store Directory
                    </h1>
                    <p className="text-muted-foreground mt-1">Essential contacts, support numbers, and store network.</p>
                </div>
                {canManageResources && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2"><Plus className="w-4 h-4" /> Add Resource</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Add Store Resource</DialogTitle></DialogHeader>
                            <form onSubmit={handleCreateResource} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Type</Label>
                                        <Select value={newResource.type} onValueChange={(val) => setNewResource({ ...newResource, type: val as any })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="IT">IT Support</SelectItem>
                                                <SelectItem value="POS">POS Support</SelectItem>
                                                <SelectItem value="Maintenance">Maintenance</SelectItem>
                                                <SelectItem value="Insurance">Insurance</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Visibility</Label>
                                        <Select value={newResource.visibility} onValueChange={(val) => setNewResource({ ...newResource, visibility: val as any })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="global">Global</SelectItem>
                                                <SelectItem value="store_specific">Store Specific</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Name / Provider</Label>
                                    <Input value={newResource.name} onChange={e => setNewResource({ ...newResource, name: e.target.value })} required placeholder="e.g. Verifone Support" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone Number</Label>
                                    <Input value={newResource.phoneNumber} onChange={e => setNewResource({ ...newResource, phoneNumber: e.target.value })} required placeholder="+1..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email (Optional)</Label>
                                    <Input value={newResource.email} onChange={e => setNewResource({ ...newResource, email: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Additional Info</Label>
                                    <Input value={newResource.info} onChange={e => setNewResource({ ...newResource, info: e.target.value })} placeholder="Account #, Policy #..." />
                                </div>
                                <Button type="submit" className="w-full">Save Resource</Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* 1. Emergency & Support Resources */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground/80">
                    <Shield className="w-5 h-5" /> Emergency & Support
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.resources.map((res: any) => (
                        <Card key={res._id} className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-muted rounded-full">
                                            {getIconForType(res.type)}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">{res.name}</h3>
                                            <p className="text-xs text-muted-foreground uppercase">{res.type}</p>
                                        </div>
                                    </div>
                                    {canManageResources && (
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={() => handleDeleteResource(res._id)}>
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-2 text-sm">
                                    {res.phoneNumber && (
                                        <a href={`tel:${res.phoneNumber}`} className="flex items-center gap-2 text-foreground font-medium hover:text-primary transition-colors">
                                            <Phone className="w-4 h-4" /> {res.phoneNumber}
                                        </a>
                                    )}
                                    {res.email && (
                                        <a href={`mailto:${res.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                                            <Mail className="w-4 h-4" /> {res.email}
                                        </a>
                                    )}
                                    {res.info && (
                                        <div className="pt-2 mt-2 border-t border-dashed text-xs text-muted-foreground">
                                            {res.info}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {data.resources.length === 0 && (
                        <div className="col-span-full py-8 text-center bg-muted/20 rounded-xl border border-dashed">
                            <p className="text-muted-foreground">No support resources configured.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* 2. Key Internal Contacts */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground/80">
                    <User className="w-5 h-5" /> Key Leadership
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {data.keyContacts.map((contact: any) => (
                        <div key={contact._id} className="bg-muted/30 p-4 rounded-xl border border-border flex items-start gap-4 hover:bg-muted/50 transition-colors">
                            <Avatar>
                                <AvatarImage src={contact.image} />
                                <AvatarFallback>{contact.firstName[0]}{contact.lastName[0]}</AvatarFallback>
                            </Avatar>
                            <div className="space-y-1 min-w-0">
                                <p className="font-medium truncate">{contact.firstName} {contact.lastName}</p>
                                <div className="flex flex-wrap gap-1">
                                    {(contact.roles || []).slice(0, 2).map((role: string) => (
                                        <Badge key={role} variant="outline" className="text-[10px] h-5 px-1 uppercase">{role.replace("_", " ")}</Badge>
                                    ))}
                                </div>
                                {contact.phone && <a href={`tel:${contact.phone}`} className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary"><Phone className="w-3 h-3" /> {contact.phone}</a>}
                                {contact.email && <a href={`mailto:${contact.email}`} className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary truncate"><Mail className="w-3 h-3" /> {contact.email}</a>}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 3. Store Network */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground/80">
                    <MapPin className="w-5 h-5" /> Store Network
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.stores.map((store: any) => (
                        <Card key={store._id} className="overflow-hidden">
                            <CardHeader className="bg-muted/30 py-3 border-b">
                                <CardTitle className="text-base font-medium">{store.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>{store.address || "No address listed"}</span>
                                </div>

                                {store.managers && store.managers.length > 0 ? (
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold text-foreground">Managers:</p>
                                        {store.managers.map((mgr: any) => (
                                            <div key={mgr._id} className="flex items-center gap-2 text-sm">
                                                <Avatar className="w-6 h-6">
                                                    <AvatarImage src={mgr.image} />
                                                    <AvatarFallback className="text-[10px]">{mgr.firstName[0]}</AvatarFallback>
                                                </Avatar>
                                                <span className="truncate">{mgr.firstName} {mgr.lastName}</span>
                                                {mgr.phone && (
                                                    <a href={`tel:${mgr.phone}`} className="ml-auto text-muted-foreground hover:text-primary">
                                                        <Phone className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground italic">No managers assigned.</p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>
        </div>
    );
}
