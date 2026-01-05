"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle2, ChevronRight, Clock, Search, Filter } from "lucide-react";
import { Link } from "@/i18n/routing";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";

interface Problem {
    _id: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    type: string;
    status: 'open' | 'resolved';
    reportedBy: {
        firstName: string;
        lastName: string;
        image?: string;
    };
    createdAt: string;
    recipientRole: string;
}

interface ProblemsListProps {
    initialProblems: Problem[];
}

export function ProblemsList({ initialProblems }: ProblemsListProps) {
    const [problems, setProblems] = useState<Problem[]>(initialProblems);
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [filterPriority, setFilterPriority] = useState<string>("all");
    const [search, setSearch] = useState("");

    const filteredProblems = problems.filter(p => {
        const matchesStatus = filterStatus === "all" || p.status === filterStatus;
        const matchesPriority = filterPriority === "all" || p.priority === filterPriority;
        const matchesSearch = p.description.toLowerCase().includes(search.toLowerCase()) ||
            (p.type || "").toLowerCase().includes(search.toLowerCase());
        return matchesStatus && matchesPriority && matchesSearch;
    });

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'critical': return "text-red-600 bg-red-100 border-red-200";
            case 'high': return "text-orange-600 bg-orange-100 border-orange-200";
            case 'medium': return "text-amber-600 bg-amber-100 border-amber-200";
            default: return "text-blue-600 bg-blue-100 border-blue-200";
        }
    };

    return (
        <div className="space-y-6">
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3 border-b border-border/10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search description or type..."
                                className="pl-9 bg-background/50"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-[140px]">
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                                        <SelectValue placeholder="Status" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="resolved">Resolved</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={filterPriority} onValueChange={setFilterPriority}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Priorities</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="w-[400px]">Description</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Reported By</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProblems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                            <p>No problems found matching your filters.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProblems.map((problem) => (
                                    <TableRow key={problem._id} className="group hover:bg-muted/30">
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    {problem.priority === 'critical' && <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />}
                                                    <span className="font-medium truncate max-w-[300px]">{problem.description}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDistanceToNow(new Date(problem.createdAt), { addSuffix: true })}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {(problem.type || 'other').replace(/_/g, ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(problem.priority)}`}>
                                                {problem.priority}
                                            </div>
                                            {problem.status === 'resolved' && (
                                                <div className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                                    <CheckCircle2 className="h-3 w-3" /> Resolved
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={problem.reportedBy?.image} />
                                                    <AvatarFallback>{problem.reportedBy?.firstName?.[0] || 'U'}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm text-foreground/80">
                                                    {problem.reportedBy?.firstName || 'User'} {problem.reportedBy?.lastName || ''}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/dashboard/problems/${problem._id}`}>
                                                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    View
                                                    <ChevronRight className="ml-1 h-3 w-3" />
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
