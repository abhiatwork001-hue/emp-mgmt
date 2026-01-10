"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPendingEvaluationsForManager } from "@/lib/actions/evaluation.actions";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { ClipboardList, CheckCircle } from "lucide-react";
import { EvaluationFormDialog } from "./evaluation-form-dialog";

export function ManagerEvaluationList() {
    const { data: session } = useSession();
    const [assignments, setAssignments] = useState<any[]>([]);

    useEffect(() => {
        if (session?.user) {
            getPendingEvaluationsForManager((session.user as any).id)
                .then(setAssignments);
        }
    }, [session]);

    if (assignments.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <ClipboardList className="h-10 w-10 mb-2 opacity-20" />
                    <p>No pending evaluations.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {assignments.map(assignment => (
                <Card key={assignment._id}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-lg">{assignment.templateId?.title}</CardTitle>
                            <CardDescription>Store: {assignment.storeId?.name}</CardDescription>
                        </div>
                        <Badge variant={assignment.status === 'pending' ? "secondary" : "default"}>
                            {assignment.status}
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                            <span>Due: {assignment.dueDate ? format(new Date(assignment.dueDate), "PPP") : "No deadline"}</span>
                        </div>

                        <EvaluationFormDialog
                            assignment={assignment}
                            onComplete={() => {
                                // Simple way to refresh UI context for now
                                // In production, react-query is better
                            }}
                        />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
