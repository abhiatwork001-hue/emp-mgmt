"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { finalizeCoverage } from "@/lib/actions/coverage.actions";
import { Loader2, Radio, Wallet, Palmtree, AlertCircle, CheckCircle2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function FinalizeCoverageForm({ request }: { request: any }) {
    const [compensation, setCompensation] = useState<"extra_hour" | "vacation_day">("extra_hour");
    const [submitting, setSubmitting] = useState(false);

    const handleFinalize = async () => {
        setSubmitting(true);
        try {
            await finalizeCoverage(request._id, compensation);
            toast.success("Coverage finalized and schedule updated.");
        } catch (error) {
            toast.error("Failed to finalize coverage");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card className="border-blue-500/20 shadow-lg shadow-blue-500/5">
            <CardHeader className="bg-blue-500/10 rounded-t-lg">
                <CardTitle className="text-blue-500 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Approve Coverage Match
                </CardTitle>
                <CardDescription className="text-blue-400/80">
                    <strong>{request.acceptedBy.firstName} {request.acceptedBy.lastName}</strong> accepted the offer. Finalize to update schedule.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-lg border border-border">
                    <Avatar className="h-12 w-12 border-2 border-background">
                        <AvatarImage src={request.acceptedBy.image} />
                        <AvatarFallback>{request.acceptedBy.firstName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-semibold text-lg">{request.acceptedBy.firstName} {request.acceptedBy.lastName}</div>
                        <div className="text-sm text-muted-foreground">Acceptance received {format(new Date(request.acceptedAt), 'p')}</div>
                    </div>
                </div>

                <div className="space-y-3">
                    <Label className="text-base">Select Compensation Method</Label>
                    <RadioGroup value={compensation} onValueChange={(v) => setCompensation(v as any)} className="grid grid-cols-2 gap-4">
                        <div className={`flex flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-muted/50 cursor-pointer transition-all ${compensation === 'extra_hour' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                            <RadioGroupItem value="extra_hour" id="extra_hour" className="sr-only" />
                            <Label htmlFor="extra_hour" className="cursor-pointer w-full text-center space-y-2">
                                <Wallet className={`h-6 w-6 mx-auto ${compensation === 'extra_hour' ? 'text-primary' : 'text-muted-foreground'}`} />
                                <span className="block font-semibold">Extra Pay</span>
                                <span className="block text-xs text-muted-foreground">Log as overtime hours</span>
                            </Label>
                        </div>
                        <div className={`flex flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-muted/50 cursor-pointer transition-all ${compensation === 'vacation_day' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                            <RadioGroupItem value="vacation_day" id="vacation_day" className="sr-only" />
                            <Label htmlFor="vacation_day" className="cursor-pointer w-full text-center space-y-2">
                                <Palmtree className={`h-6 w-6 mx-auto ${compensation === 'vacation_day' ? 'text-primary' : 'text-muted-foreground'}`} />
                                <span className="block font-semibold">Vacation Day</span>
                                <span className="block text-xs text-muted-foreground">Add equivalent time off</span>
                            </Label>
                        </div>
                    </RadioGroup>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg text-sm text-yellow-500 flex gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>This will remove {request.originalEmployeeId.firstName} from the schedule and add {request.acceptedBy.firstName} in their place.</p>
                </div>
            </CardContent>
            <CardFooter className="bg-muted/20 pb-6">
                <Button onClick={handleFinalize} disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Finalize & Update Schedule
                </Button>
            </CardFooter>
        </Card>
    );
}
