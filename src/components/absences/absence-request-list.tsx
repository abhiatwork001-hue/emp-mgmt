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

interface AbsenceRequestListProps {
    initialRequests: any[];
}

export function AbsenceRequestList({ initialRequests }: AbsenceRequestListProps) {
    const { data: session } = useSession();
    const [requests, setRequests] = useState(initialRequests);
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
    const [filter, setFilter] = useState("");

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
                <Search className="h-4 w-4 text-zinc-500" />
                <Input
                    placeholder="Search employee..."
                    className="max-w-xs bg-[#1e293b] border-zinc-700 text-white"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>

            <Tabs defaultValue="pending">
                <TabsList className="bg-[#1e293b]">
                    <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
                    <TabsTrigger value="history">History ({historyRequests.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="space-y-4 mt-4">
                    {pendingRequests.length === 0 ? (
                        <div className="text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                            No pending requests.
                        </div>
                    ) : (
                        pendingRequests.map((req: any) => (
                            <AbsenceRequestCard key={req._id} req={req} onAction={updateStatus} loading={loadingMap[req._id]} />
                        ))
                    )}
                </TabsContent>

                <TabsContent value="history" className="space-y-4 mt-4">
                    {historyRequests.length === 0 ? (
                        <div className="text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                            No history found.
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

    const handleApprove = () => {
        onAction(req._id, 'approve', { type, justification });
        setOpen(false);
    };

    return (
        <Card className="bg-[#1e293b] border-none text-white">
            <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Avatar>
                            <AvatarImage src={req.employeeId?.image} />
                            <AvatarFallback>{req.employeeId?.firstName?.[0]}{req.employeeId?.lastName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h4 className="font-bold text-lg">{req.employeeId?.firstName} {req.employeeId?.lastName}</h4>
                            <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(req.date).toLocaleDateString()}</span>
                                {req.type && (
                                    <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 ml-2">
                                        {req.type}
                                    </Badge>
                                )}
                                {req.justification && (
                                    <Badge variant={req.justification === 'Justified' ? 'default' : 'destructive'} className="ml-2">
                                        {req.justification}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isHistory ? (
                            <Badge className={`${req.status === 'approved' ? 'bg-emerald-500' : 'bg-red-500'} text-white`}>
                                {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
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
                                            Approve
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-[#1e293b] border-zinc-700 text-white">
                                        <DialogHeader>
                                            <DialogTitle>Approve Absence</DialogTitle>
                                            <DialogDescription className="text-zinc-400">
                                                Confirm details for this absence.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor="type" className="text-right">
                                                    Type
                                                </Label>
                                                <Select value={type} onValueChange={setType}>
                                                    <SelectTrigger className="col-span-3 bg-[#0f172a] border-zinc-700">
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#1e293b] border-zinc-700 text-white">
                                                        <SelectItem value="sick">Sick</SelectItem>
                                                        <SelectItem value="personal">Personal</SelectItem>
                                                        <SelectItem value="late">Late</SelectItem>
                                                        <SelectItem value="other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label className="text-right">Justification</Label>
                                                <RadioGroup value={justification} onValueChange={setJustification} className="col-span-3 flex gap-4">
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="Justified" id="r1" />
                                                        <Label htmlFor="r1">Justified</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="Unjustified" id="r2" />
                                                        <Label htmlFor="r2">Unjustified</Label>
                                                    </div>
                                                </RadioGroup>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setOpen(false)} className="border-zinc-700 hover:bg-zinc-800 text-white hover:text-white">Cancel</Button>
                                            <Button onClick={handleApprove} className="bg-emerald-600 hover:bg-emerald-700 text-white">Confirm Approval</Button>
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
                                    Reject
                                </Button>
                            </>
                        )}
                    </div>
                </div>
                {req.reason && (
                    <div className="mt-4 bg-[#0f172a] p-3 rounded text-sm text-zinc-400">
                        <span className="font-medium text-zinc-300">Reason:</span> {req.reason}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
