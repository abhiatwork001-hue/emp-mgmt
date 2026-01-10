"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    ArrowLeftRight,
    Calendar,
    Check,
    X,
    Clock,
    AlertCircle,
    UserCheck,
    ChevronRight,
    Loader2
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { respondToSwapRequest } from "@/lib/actions/shift-swap.actions";
import { acceptCoverageOffer, declineCoverageOffer, cancelCoverageRequest } from "@/lib/actions/coverage.actions";
import { cancelVacationRequest } from "@/lib/actions/vacation.actions";
import { cancelAbsenceRequest } from "@/lib/actions/absence.actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EmployeePendingActionsWidgetProps {
    swapRequests: any[];
    coverageOffers: any[];
    myVacations: any[];
    myAbsences: any[];
    myCoverageRequests: any[];
    userId: string;
}

export function EmployeePendingActionsWidget({
    swapRequests = [],
    coverageOffers = [],
    myVacations = [],
    myAbsences = [],
    myCoverageRequests = [],
    userId
}: EmployeePendingActionsWidgetProps) {
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        type: 'swap' | 'coverage';
        id: string;
        action: string;
        title: string;
        description: string;
    }>({
        isOpen: false,
        type: 'swap',
        id: '',
        action: '',
        title: '',
        description: ''
    });

    // Merge and Sort by Date (newest first)
    const allActions = [
        ...swapRequests.map(i => ({ ...i, type: 'swap', date: new Date(i.createdAt) })),
        ...coverageOffers.map(i => ({ ...i, type: 'coverage_offer', date: new Date(i.createdAt) })),
        ...myVacations.map(i => ({ ...i, type: 'vacation', date: new Date(i.createdAt) })),
        ...myAbsences.map(i => ({ ...i, type: 'absence', date: new Date(i.createdAt) })),
        ...myCoverageRequests.map(i => ({ ...i, type: 'coverage_request', date: new Date(i.createdAt) }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    const executeSwapAction = async (requestId: string, action: 'approved' | 'rejected') => {
        setLoadingId(requestId);
        try {
            const res = await respondToSwapRequest(requestId, action, userId);
            if (res.success) {
                toast.success(`Swap request ${action}`);
                router.refresh();
            } else {
                toast.error("Failed to process request");
            }
        } catch (e) {
            toast.error("An error occurred");
        } finally {
            setLoadingId(null);
            setConfirmState(prev => ({ ...prev, isOpen: false }));
        }
    };

    const handleSwapAction = (requestId: string, action: 'approved' | 'rejected') => {
        if (action === 'approved') {
            setConfirmState({
                isOpen: true,
                type: 'swap',
                id: requestId,
                action: action,
                title: "Accept Shift Swap?",
                description: "This will modify your schedule. You will be responsible for this shift."
            });
        } else {
            // Reject doesn't need strict alert, or maybe it does? User asked for "accept alert". 
            // Let's just do it directly for reject to keep it fast, or standard confirm if needed.
            if (confirm("Reject this swap request?")) executeSwapAction(requestId, action);
        }
    };

    const executeCoverageAction = async (requestId: string, action: 'accept' | 'decline') => {
        setLoadingId(requestId);
        try {
            let res;
            if (action === 'accept') res = await acceptCoverageOffer(requestId, userId);
            else res = await declineCoverageOffer(requestId, userId);

            if (res.success) {
                toast.success(`Coverage offer ${action}ed`);
                router.refresh();
            } else {
                // toast.error((res as any).error || "Failed");
                toast.error("Failed to process request");
            }
        } catch (e) {
            toast.error("An error occurred");
        } finally {
            setLoadingId(null);
            setConfirmState(prev => ({ ...prev, isOpen: false }));
        }
    };

    const handleCoverageAction = (requestId: string, action: 'accept' | 'decline') => {
        if (action === 'accept') {
            setConfirmState({
                isOpen: true,
                type: 'coverage',
                id: requestId,
                action: action,
                title: "Accept Extra Shift?",
                description: "You are agreeing to cover this shift. It will be added to your schedule immediately."
            });
        } else {
            if (confirm("Decline this coverage offer?")) executeCoverageAction(requestId, action);
        }
    };

    const handleCancelRequest = async (id: string, type: 'vacation' | 'absence' | 'coverage') => {
        if (!confirm("Are you sure you want to cancel this request?")) return;
        setLoadingId(id);
        try {
            let res;
            if (type === 'vacation') res = await cancelVacationRequest(id, userId);
            else if (type === 'absence') res = await cancelAbsenceRequest(id, userId);
            else if (type === 'coverage') res = await cancelCoverageRequest(id);

            if (res && res.success) {
                toast.success("Request cancelled");
                router.refresh();
            }
        } catch (e) {
            toast.error("An error occurred");
        } finally {
            setLoadingId(null);
        }
    };

    if (allActions.length === 0) return null;

    return (
        <Card className="border-l-4 border-l-blue-500 bg-card/50 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700">
            <CardHeader className="pb-3 border-b bg-muted/5">
                <CardTitle className="text-md font-black uppercase tracking-wider flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        Pending Actions
                        <Badge variant="secondary" className="ml-2 rounded-full px-2 bg-blue-100 text-blue-700 hover:bg-blue-200">
                            {allActions.length}
                        </Badge>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground hover:text-primary" onClick={() => router.push('/dashboard/pending-actions')}>
                        View All <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[300px] w-full">
                    <div className="flex flex-col">
                        {allActions.map((item) => (
                            <div key={item._id} className="p-4 border-b last:border-0 hover:bg-muted/5 transition-colors">
                                {/* ITEM CONTENT BASED ON TYPE */}

                                {/* 1. SWAP REQUEST */}
                                {item.type === 'swap' && (
                                    <div className="space-y-3 hidden md:block">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 border">
                                                    <AvatarImage src={item.requestorId.image} />
                                                    <AvatarFallback>{item.requestorId.firstName[0]}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="text-sm font-semibold">
                                                        {item.requestorId.firstName} wants to swap
                                                    </div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                        <ArrowLeftRight className="h-3 w-3" /> Shift Swap Request
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="shrink-0 bg-blue-50 text-blue-700 border-blue-200">Pending</Badge>
                                        </div>

                                        <div className="bg-muted/30 rounded-lg p-2 text-xs flex items-center gap-2 border">
                                            <div className="flex-1 text-center">
                                                <div className="font-bold text-blue-600">{format(new Date(item.requestorShift.dayDate), 'MMM d')}</div>
                                                <div className="text-muted-foreground">{item.requestorShift.startTime} - {item.requestorShift.endTime}</div>
                                            </div>
                                            <ArrowLeftRight className="h-4 w-4 text-muted-foreground/50" />
                                            <div className="flex-1 text-center">
                                                <div className="font-bold text-orange-600">{format(new Date(item.targetShift.dayDate), 'MMM d')}</div>
                                                <div className="text-muted-foreground">{item.targetShift.startTime} - {item.targetShift.endTime}</div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-1">
                                            <Button
                                                size="sm"
                                                className="flex-1 h-8 bg-green-600 hover:bg-green-700 text-white"
                                                onClick={() => handleSwapAction(item._id, 'approved')}
                                                disabled={!!loadingId}
                                            >
                                                {loadingId === item._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                                                Accept
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex-1 h-8 text-red-600 hover:bg-red-50 border-red-200"
                                                onClick={() => handleSwapAction(item._id, 'rejected')}
                                                disabled={!!loadingId}
                                            >
                                                <X className="h-3 w-3 mr-1" /> Reject
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* 2. COVERAGE OFFER */}
                                {item.type === 'coverage_offer' && (
                                    <div className="space-y-3 hidden md:block">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 border border-violet-200">
                                                    <UserCheck className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold">
                                                        Shift Coverage Available
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {item.originalShift.storeDepartmentId?.name || 'Department'} Shift
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 border-violet-200">Open</Badge>
                                        </div>

                                        <div className="bg-violet-50/50 rounded-lg p-3 text-xs border border-violet-100 flex items-center justify-between">
                                            <div>
                                                <div className="font-bold text-violet-900">{format(new Date(item.originalShift.dayDate), 'EEEE, MMM d, yyyy')}</div>
                                                <div className="text-violet-700/80 font-mono mt-0.5">{item.originalShift.startTime} - {item.originalShift.endTime}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-medium text-violet-800">{item.originalEmployeeId?.firstName}</div>
                                                <div className="text-[10px] text-violet-600/70">needs cover</div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-1">
                                            <Button
                                                size="sm"
                                                className="flex-1 h-8 bg-violet-600 hover:bg-violet-700 text-white"
                                                onClick={() => handleCoverageAction(item._id, 'accept')}
                                                disabled={!!loadingId}
                                            >
                                                {loadingId === item._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                                                Accept Shift
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex-1 h-8"
                                                onClick={() => handleCoverageAction(item._id, 'decline')}
                                                disabled={!!loadingId}
                                            >
                                                Decline
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* 5. MY ABSENCE REQUEST */}
                                {item.type === 'absence' && (
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 border border-rose-200">
                                                    <AlertCircle className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold">
                                                        Absence Reported
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Pending review
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200">Pending</Badge>
                                        </div>

                                        <div className="text-xs text-muted-foreground pl-12">
                                            Date: <span className="font-medium text-foreground">{format(new Date(item.date), 'MMM d, yyyy')}</span>
                                            <div className="mt-1 line-clamp-1 italic">"{item.reason}"</div>
                                        </div>

                                        <div className="flex gap-2 pl-12 pt-1">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs border-dashed text-muted-foreground hover:text-destructive hover:border-destructive/50"
                                                onClick={() => handleCancelRequest(item._id, 'absence')}
                                                disabled={!!loadingId}
                                            >
                                                Cancel Request
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* 3. MY VACATION REQUEST */}
                                {item.type === 'vacation' && (
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 border border-emerald-200">
                                                    <Calendar className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold">
                                                        Vacation Request
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Waiting for approval
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">In Review</Badge>
                                        </div>

                                        <div className="text-xs text-muted-foreground pl-12">
                                            Requested: <span className="font-medium text-foreground">{format(new Date(item.requestedFrom), 'MMM d')} - {format(new Date(item.requestedTo), 'MMM d')}</span>
                                            {item.totalDays && <span className="ml-1">({item.totalDays} days)</span>}
                                        </div>

                                        <div className="flex gap-2 pl-12 pt-1">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs border-dashed text-muted-foreground hover:text-destructive hover:border-destructive/50"
                                                onClick={() => handleCancelRequest(item._id, 'vacation')}
                                                disabled={!!loadingId}
                                            >
                                                Cancel Request
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* 4. MY COVERAGE REQUEST */}
                                {item.type === 'coverage_request' && (
                                    <div className="space-y-3 hidden md:block">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 border border-amber-200">
                                                    <AlertCircle className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold">
                                                        Seeking Coverage
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Checking for candidates...
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Broadcasting</Badge>
                                        </div>

                                        <div className="text-xs text-muted-foreground pl-12">
                                            Shift: <span className="font-medium text-foreground">{format(new Date(item.originalShift.dayDate), 'MMM d')} ({item.originalShift.startTime}-{item.originalShift.endTime})</span>
                                        </div>

                                        <div className="flex gap-2 pl-12 pt-1">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs border-dashed text-muted-foreground hover:text-destructive hover:border-destructive/50"
                                                onClick={() => handleCancelRequest(item._id, 'coverage')}
                                                disabled={!!loadingId}
                                            >
                                                Cancel Request
                                            </Button>
                                        </div>
                                    </div>
                                )}

                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>

            <AlertDialog open={confirmState.isOpen} onOpenChange={(open) => setConfirmState(prev => ({ ...prev, isOpen: open }))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmState.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmState.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (confirmState.type === 'swap') {
                                    executeSwapAction(confirmState.id, confirmState.action as 'approved' | 'rejected');
                                } else {
                                    executeCoverageAction(confirmState.id, confirmState.action as 'accept' | 'decline');
                                }
                            }}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
