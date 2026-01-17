"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, TrendingUp, TrendingDown } from "lucide-react";

interface ReputationProps {
    data: {
        average: string;
        trend: number;
        worstStore: { name: string, googleRating: number } | null;
    };
}

export function ReputationWidget({ data }: ReputationProps) {
    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Reputation</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-end gap-2 mb-4">
                    <div className="text-4xl font-bold">{data.average}</div>
                    <div className="flex flex-col mb-1 ml-1">
                        <div className="flex items-center gap-1">
                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Network Avg</span>
                    </div>
                    {data.trend !== 0 && (
                        <div className={`flex items-center text-sm mb-2 ml-auto ${data.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {data.trend > 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                            {data.trend > 0 ? '+' : ''}{data.trend}
                        </div>
                    )}
                </div>

                {data.worstStore && (
                    <div className="bg-red-500/10 p-3 rounded-md border border-red-500/20">
                        <div className="text-xs text-red-500 font-semibold uppercase mb-1">Attention Needed</div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{data.worstStore.name}</span>
                            <div className="flex items-center gap-1 text-sm font-bold">
                                {data.worstStore.googleRating} <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
