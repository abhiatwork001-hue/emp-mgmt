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
import { useTranslations } from "next-intl";

interface VacationRequestListProps {
    initialRequests: any[];
}

export function VacationRequestList({ initialRequests }: VacationRequestListProps) {
    const { data: session } = useSession();
    const [requests, setRequests] = useState(initialRequests);
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
    const [filter, setFilter] = useState("");
    const t = useTranslations("Vacation");
    const tc = useTranslations("Common");

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
                            <VacationRequestCard key={req._id} req={req} onAction={updateStatus} loading={loadingMap[req._id]} />
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
                            <VacationRequestCard key={req._id} req={req} onAction={updateStatus} loading={loadingMap[req._id]} isHistory />
                        ))
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function VacationRequestCard({ req, onAction, loading, isHistory }: { req: any, onAction: any, loading: boolean, isHistory?: boolean }) {
    const t = useTranslations("Vacation");
    const tc = useTranslations("Common");

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
                                <span>{format(new Date(req.requestedFrom), "dd/MM/yyyy")} - {format(new Date(req.requestedTo), "dd/MM/yyyy")}</span>
                                <Badge variant="secondary" className="bg-muted text-muted-foreground ml-2">
                                    {t('days', { count: req.totalDays })}
                                </Badge>
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
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                                    onClick={() => onAction(req._id, 'approve')}
                                    disabled={loading}
                                >
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    {tc('approve')}
                                </Button>
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
                {req.comments && (
                    <div className="mt-4 bg-muted/30 p-3 rounded text-sm text-muted-foreground border border-border">
                        <span className="font-medium text-foreground">{tc('note')}:</span> {req.comments}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
