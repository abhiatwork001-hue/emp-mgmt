"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPendingCoverageOffer, acceptCoverageOffer } from "@/lib/actions/coverage.actions";
import { Loader2, Calendar, Clock, CheckCircle2, User, MapPin, Briefcase, Users, Info } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export function ShiftOfferList({ employeeId }: { employeeId: string }) {
    const [offers, setOffers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState<string | null>(null);

    const fetchOffers = async () => {
        try {
            const data = await getPendingCoverageOffer(employeeId);
            setOffers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOffers();
    }, [employeeId]);

    const handleAccept = async (offerId: string) => {
        setAccepting(offerId);
        try {
            await acceptCoverageOffer(offerId, employeeId);
            toast.success("Offer accepted! Waiting for HR confirmation.");
            setOffers(prev => prev.filter(o => o._id !== offerId));
        } catch (error: any) {
            toast.error(error.message || "Failed to accept offer");
        } finally {
            setAccepting(null);
        }
    };

    if (loading) return null; // Or a skeleton
    if (offers.length === 0) return null; // Don't show if empty

    return (
        <Card className="border-blue-500/30 bg-blue-500/5 mb-6">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-blue-500">
                    <CheckCircle2 className="h-5 w-5" />
                    Available Shift Covers
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {offers.map((offer) => (
                    <div key={offer._id} className="flex items-center justify-between p-3 rounded-lg border border-blue-500/20 bg-background text-sm">
                        <div className="space-y-1">
                            <div className="font-semibold flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {format(new Date(offer.originalShift.dayDate), 'EEE, MMM d')}
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                {offer.originalShift.startTime} - {offer.originalShift.endTime}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1 font-medium text-blue-500/80">
                                    <User className="h-3 w-3" />
                                    Covering: {offer.originalEmployeeId.firstName} {offer.originalEmployeeId.lastName}
                                </span>
                                {offer.coworkers && offer.coworkers.length > 0 && (
                                    <span className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        Working with: {offer.coworkers.join(', ')}
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {offer.originalShift.storeId?.name || "Store"}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Briefcase className="h-3 w-3" />
                                    {offer.originalShift.storeDepartmentId?.name || "Dept"}
                                </span>
                            </div>
                            {offer.hrMessage && (
                                <div className="mt-2 p-2 rounded bg-blue-500/10 border border-blue-500/20 text-[11px] italic">
                                    <span className="font-bold non-italic not-italic flex items-center gap-1 text-blue-600 mb-0.5">
                                        <Info className="h-3 w-3" /> Note from HR:
                                    </span>
                                    {offer.hrMessage}
                                </div>
                            )}
                        </div>
                        <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleAccept(offer._id)}
                            disabled={!!accepting}
                        >
                            {accepting === offer._id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept Shift"}
                        </Button>
                    </div>
                ))}
            </CardContent>
        </Card >
    );
}
