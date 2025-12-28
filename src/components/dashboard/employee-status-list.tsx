"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, MessageSquare } from "lucide-react";
import { Link } from "@/i18n/routing";

interface EmployeeStatus {
    _id: string;
    name: string;
    role: string;
    store: string;
    image?: string;
    status: string; // "Active" | "On Vacation" | "Absent"
}

export function EmployeeStatusList({ employees }: { employees: EmployeeStatus[] }) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case "Active": return "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25";
            case "On Vacation": return "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25";
            case "Absent": return "bg-rose-500/15 text-rose-400 hover:bg-rose-500/25";
            default: return "bg-slate-500/15 text-slate-400";
        }
    };

    return (
        <Card className="border-zinc-800 bg-slate-900/50">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium text-white">Employee Status</CardTitle>
                    <UsersIcon className="h-4 w-4 text-slate-400" />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {employees.map((emp) => (
                    <div key={emp._id} className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-slate-900 p-4 transition-colors hover:bg-slate-800/50">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border border-zinc-700">
                                    <AvatarImage src={emp.image} />
                                    <AvatarFallback>{emp.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-white">{emp.name}</span>
                                        <Badge variant="secondary" className={`border-0 ${getStatusColor(emp.status)}`}>
                                            {emp.status}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-slate-400">{emp.role}</p>
                                    <p className="text-xs text-slate-500">{emp.store}</p>
                                </div>
                            </div>
                        </div>

                        {emp.status !== "Active" && (
                            <div className="ml-14 rounded bg-slate-950/50 px-3 py-2 text-sm text-slate-400">
                                {emp.status === "On Vacation" ? "Family vacation" : emp.status === "Absent" ? "Sick leave" : ""}
                            </div>
                        )}

                        <div className="ml-14 flex items-center gap-2">
                            <Button variant="outline" size="sm" className="h-8 border-zinc-700 bg-transparent text-slate-300 hover:bg-slate-800" asChild>
                                <Link href={`/dashboard/employees/${emp._id}`}>
                                    <User className="mr-2 h-3 w-3" /> View Profile
                                </Link>
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 border-zinc-700 bg-transparent text-slate-300 hover:bg-slate-800">
                                <MessageSquare className="mr-2 h-3 w-3" /> Contact
                            </Button>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

function UsersIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    )
}
