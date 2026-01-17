"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface SmartInsightProps {
    insight: string;
}

export function SmartInsightWidget({ insight }: SmartInsightProps) {
    if (!insight) return null;

    return (
        <Card className="bg-indigo-500/10 border-indigo-500/20">
            <CardContent className="p-4 flex items-center gap-3">
                <div className="bg-indigo-500/20 p-2 rounded-full shadow-sm">
                    <Sparkles className="h-5 w-5 text-indigo-500" />
                </div>
                <p className="text-sm font-medium text-foreground">
                    <span className="text-indigo-500 font-bold">Top Insight:</span> {insight}
                </p>
            </CardContent>
        </Card>
    );
}
