"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, Check, X, Clock } from "lucide-react";
import { respondToSwapRequest } from "@/lib/actions/shift-swap.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SwapRequestsWidgetProps {
    incomingRequests: any[];
    userId: string;
}

export function SwapRequestsWidget({ incomingRequests, userId }: SwapRequestsWidgetProps) {
    const [requests, setRequests] = useState(incomingRequests);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const router = useRouter();

    if (!requests || requests.length === 0) return null;

    const handleAction = async (requestId: string, action: 'approved' | 'rejected') => {
        setLoadingId(requestId);
        try {
            const result = await respondToSwapRequest(requestId, action);
            if (result.success) {
                toast.success(`Swap request ${action}`);
                setRequests(prev => prev.filter(r => r._id !== requestId));
                router.refresh();
            } else {
                toast.error(result.error || "Failed to process request");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <Card className="border-l-4 border-l-blue-500 bg-blue-50/10 mb-6">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <ArrowLeftRight className="h-5 w-5 text-blue-500" />
                    Shift Swap Requests
                </CardTitle>
                <CardDescription>
                    Colleagues want to swap shifts with you.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {requests.map((request) => (
                    <div key={request._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 border rounded-lg bg-card shadow-sm">
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={request.requestorId.image} />
                                <AvatarFallback>{request.requestorId.firstName[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium">
                                    {request.requestorId.firstName} {request.requestorId.lastName}
                                </p>
                                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">
                                        Offers: {new Date(request.requestorShift.dayDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} <span className="font-mono ml-1">{request.requestorShift.startTime}-{request.requestorShift.endTime}</span>
                                    </Badge>
                                    <span className="text-xs">for</span>
                                    <Badge variant="outline" className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">
                                        Yours: {new Date(request.targetShift.dayDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} <span className="font-mono ml-1">{request.targetShift.startTime}-{request.targetShift.endTime}</span>
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                            <Button
                                size="sm"
                                variant="outline"
                                className="border-red-200 hover:bg-red-50 text-red-600 flex-1 sm:flex-none"
                                onClick={() => handleAction(request._id, 'rejected')}
                                disabled={loadingId === request._id}
                            >
                                <X className="h-4 w-4 mr-1" /> Reject
                            </Button>
                            <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none"
                                onClick={() => handleAction(request._id, 'approved')}
                                disabled={loadingId === request._id}
                            >
                                {loadingId === request._id ? <Clock className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                                Accept
                            </Button>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
