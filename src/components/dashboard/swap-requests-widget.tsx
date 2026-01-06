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
import { EmployeeLink } from "../common/employee-link";

interface SwapRequestsWidgetProps {
    incomingRequests: any[];
    userId: string;
    currentUserRoles: string[];
}

export function SwapRequestsWidget({ incomingRequests, userId, currentUserRoles }: SwapRequestsWidgetProps) {
    const [requests, setRequests] = useState(incomingRequests);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const router = useRouter();

    const handleAction = async (requestId: string, action: 'approved' | 'rejected') => {
        setLoadingId(requestId);
        try {
            const result = await respondToSwapRequest(requestId, action, userId);
            if (result.success) {
                toast.success(`Swap request ${action}`);
                setRequests(prev => prev.filter(r => r._id !== requestId));
                router.refresh();
            } else {
                toast.error((result as any).error || "Failed to process request");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setLoadingId(null);
        }
    };

    // Return null AFTER all hooks have been called
    if (!requests || requests.length === 0) return null;

    return (
        <Card className="h-full border-l-4 border-l-blue-500 bg-blue-50/10 flex flex-col overflow-hidden">
            <CardHeader className="pb-3 shrink-0">
                <CardTitle className="text-lg flex items-center gap-2">
                    <ArrowLeftRight className="h-5 w-5 text-blue-500" />
                    Shift Swap Requests
                </CardTitle>
                <CardDescription>
                    Colleagues want to swap shifts with you.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 overflow-y-auto">
                {requests.map((request) => (
                    <div key={request._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 border rounded-lg bg-card shadow-sm">
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={request.requestorId.image} />
                                <AvatarFallback>{request.requestorId.firstName[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                                <EmployeeLink
                                    employeeId={request.requestorId._id}
                                    slug={request.requestorId.slug}
                                    name={`${request.requestorId.firstName} ${request.requestorId.lastName}`}
                                    currentUserRoles={currentUserRoles}
                                    className="font-medium"
                                />
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

                        <div className="flex gap-2 shrink-0">
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                                onClick={() => handleAction(request._id, 'rejected')}
                                disabled={loadingId === request._id}
                            >
                                <X className="h-4 w-4 mr-1" />
                                Decline
                            </Button>
                            <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleAction(request._id, 'approved')}
                                disabled={loadingId === request._id}
                            >
                                <Check className="h-4 w-4 mr-1" />
                                Accept
                            </Button>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
