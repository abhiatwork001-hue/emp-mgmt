"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Calendar, User, Search } from "lucide-react";
import { approveVacationRequest, rejectVacationRequest } from "@/lib/actions/vacation.actions";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "next-auth/react";

interface VacationRequestListProps {
    initialRequests: any[];
}

export function VacationRequestList({ initialRequests }: VacationRequestListProps) {
    const { data: session } = useSession();
    const [requests, setRequests] = useState(initialRequests);
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
    const [filter, setFilter] = useState("");

    const updateStatus = async (requestId: string, action: 'approve' | 'reject') => {
        if (!session?.user) return;

        setLoadingMap(prev => ({ ...prev, [requestId]: true }));
        try {
            let updatedRequest;
            if (action === 'approve') {
                updatedRequest = await approveVacationRequest(requestId, session.user.id);
                toast.success("Vacation Approved");
            } else {
                updatedRequest = await rejectVacationRequest(requestId, session.user.id);
                toast.success("Vacation Rejected");
            }
            // Update local state to reflect change immediately (or could just rely on revalidatePath via router.refresh but that's async)
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
                            <VacationRequestCard key={req._id} req={req} onAction={updateStatus} loading={loadingMap[req._id]} />
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
                            <VacationRequestCard key={req._id} req={req} onAction={updateStatus} loading={loadingMap[req._id]} isHistory />
                        ))
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function VacationRequestCard({ req, onAction, loading, isHistory }: { req: any, onAction: any, loading: boolean, isHistory?: boolean }) {
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
                                <span>{format(new Date(req.requestedFrom), "dd/MM/yyyy")} - {format(new Date(req.requestedTo), "dd/MM/yyyy")}</span>
                                <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 ml-2">
                                    {req.totalDays} Days
                                </Badge>
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
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                                    onClick={() => onAction(req._id, 'approve')}
                                    disabled={loading}
                                >
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Approve
                                </Button>
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
                {req.comments && (
                    <div className="mt-4 bg-[#0f172a] p-3 rounded text-sm text-zinc-400">
                        <span className="font-medium text-zinc-300">Note:</span> {req.comments}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
