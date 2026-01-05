// src/components/dashboard/insights-panel.tsx
"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// Dummy data – replace with real API data later
const data = [
    { date: "2024-01-01", value: 30 },
    { date: "2024-02-01", value: 45 },
    { date: "2024-03-01", value: 50 },
    { date: "2024-04-01", value: 70 },
    { date: "2024-05-01", value: 65 },
    { date: "2024-06-01", value: 80 },
];

export default function InsightsPanel() {
    return (
        <Card className="bg-card/80 border-border/30 shadow-lg">
            <CardHeader>
                <CardTitle className="text-primary">Insights</CardTitle>
            </CardHeader>
            <CardContent className="h-64 p-4 min-w-0">
                <div className="h-full w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
