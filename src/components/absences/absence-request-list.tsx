"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Calendar, User, Search } from "lucide-react";
import { approveAbsenceRequest, rejectAbsenceRequest } from "@/lib/actions/absence.actions";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";

interface AbsenceRequestListProps {
    initialRequests: any[];
}

export function AbsenceRequestList({ initialRequests }: AbsenceRequestListProps) {
    const { data: session } = useSession();
    const [requests, setRequests] = useState(initialRequests);
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
    const [filter, setFilter] = useState("");
    const t = useTranslations("Absence");
    const tc = useTranslations("Common");

    const updateStatus = async (requestId: string, action: 'approve' | 'reject', payload?: any) => {
        if (!session?.user) return;

        setLoadingMap(prev => ({ ...prev, [requestId]: true }));
        try {
            let updatedRequest;
            if (action === 'approve') {
                updatedRequest = await approveAbsenceRequest(requestId, session.user.id, payload);
                toast.success("Absence Approved");
            } else {
                updatedRequest = await rejectAbsenceRequest(requestId, session.user.id);
                toast.success("Absence Rejected");
            }
            setRequests(prev => prev.map(r => r._id === requestId ? updatedRequest : r));
        } catch (error) {
            toast.error("Failed to update request");
            console.error(error);
        } finally {
            setLoadingMap(prev => ({ ...prev, [requestId]: false }));
        }
    };

    const filteredRequests = requests.filter((r: any) => {
        const name = `${r.employeeId?.firstName} ${r.employeeId?.lastName}`.toLowerCase();
        return name.includes(filter.toLowerCase());
    });

    const pendingRequests = filteredRequests.filter((r: any) => r.status === 'pending');
    const historyRequests = filteredRequests.filter((r: any) => r.status !== 'pending');

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={tc('searchEmployee')}
                    className="max-w-xs bg-muted/50 border-border"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>

            <Tabs defaultValue="pending">
                <TabsList className="bg-muted border border-border">
                    <TabsTrigger value="pending">{tc('pending')} ({pendingRequests.length})</TabsTrigger>
                    <TabsTrigger value="history">{tc('history')} ({historyRequests.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="space-y-4 mt-4">
                    {pendingRequests.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg bg-muted/20">
                            {t('noPending')}
                        </div>
                    ) : (
                        pendingRequests.map((req: any) => (
                            <AbsenceRequestCard key={req._id} req={req} onAction={updateStatus} loading={loadingMap[req._id]} />
                        ))
                    )}
                </TabsContent>

                <TabsContent value="history" className="space-y-4 mt-4">
                    {historyRequests.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg bg-muted/20">
                            {t('noHistory')}
                        </div>
                    ) : (
                        historyRequests.map((req: any) => (
                            <AbsenceRequestCard key={req._id} req={req} onAction={updateStatus} loading={loadingMap[req._id]} isHistory />
                        ))
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function AbsenceRequestCard({ req, onAction, loading, isHistory }: { req: any, onAction: any, loading: boolean, isHistory?: boolean }) {
    const [open, setOpen] = useState(false);
    const [type, setType] = useState(req.type || "sick");
    const [justification, setJustification] = useState("Justified");
    const t = useTranslations("Absence");
    const tc = useTranslations("Common");

    const handleApprove = () => {
        onAction(req._id, 'approve', { type, justification });
        setOpen(false);
    };

    return (
        <Card className="bg-card border-border">
            <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Avatar>
                            <AvatarImage src={req.employeeId?.image} />
                            <AvatarFallback className="bg-muted text-muted-foreground">{req.employeeId?.firstName?.[0]}{req.employeeId?.lastName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h4 className="font-bold text-lg text-foreground">{req.employeeId?.firstName} {req.employeeId?.lastName}</h4>
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <Calendar className="h-4 w-4" />
                                <span>{format(new Date(req.date), "PPP")}</span>
                                {req.type && (
                                    <Badge variant="secondary" className="bg-muted text-muted-foreground ml-2">
                                        {t(req.type)}
                                    </Badge>
                                )}
                                {req.justification && (
                                    <Badge variant={req.justification === 'Justified' ? 'default' : 'destructive'} className="ml-2">
                                        {req.justification === 'Justified' ? t('justified') : t('unjustified')}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isHistory ? (
                            <Badge className={`${req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'} border`}>
                                {tc(req.status)}
                            </Badge>
                        ) : (
                            <>
                                <Dialog open={open} onOpenChange={setOpen}>
                                    <DialogTrigger asChild>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                                            disabled={loading}
                                        >
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                            {tc('approve')}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-popover border-border text-popover-foreground">
                                        <DialogHeader>
                                            <DialogTitle>{t('approveAbsence')}</DialogTitle>
                                            <DialogDescription className="text-muted-foreground">
                                                {t('confirmDetails')}
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor="type" className="text-right">
                                                    Type
                                                </Label>
                                                <Select value={type} onValueChange={setType}>
                                                    <SelectTrigger className="col-span-3 bg-muted/50 border-border">
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-popover border-border text-popover-foreground">
                                                        <SelectItem value="sick">{t('sick')}</SelectItem>
                                                        <SelectItem value="personal">{t('personal')}</SelectItem>
                                                        <SelectItem value="late">{t('late')}</SelectItem>
                                                        <SelectItem value="other">{t('other')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label className="text-right">Justification</Label>
                                                <RadioGroup value={justification} onValueChange={setJustification} className="col-span-3 flex gap-4">
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="Justified" id="r1" />
                                                        <Label htmlFor="r1">{t('justified')}</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="Unjustified" id="r2" />
                                                        <Label htmlFor="r2">{t('unjustified')}</Label>
                                                    </div>
                                                </RadioGroup>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setOpen(false)} className="border-border hover:bg-muted">{tc('cancel')}</Button>
                                            <Button onClick={handleApprove} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium">{t('confirmApproval')}</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                    onClick={() => onAction(req._id, 'reject')}
                                    disabled={loading}
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    {tc('reject')}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
                {req.reason && (
                    <div className="mt-4 bg-muted/30 p-3 rounded text-sm text-muted-foreground border border-border">
                        <span className="font-medium text-foreground">Reason:</span> {req.reason}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
