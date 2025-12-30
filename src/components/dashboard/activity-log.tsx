"use client";

import { useEffect, useState, useCallback } from "react";
import { getActionLogs } from "@/lib/actions/log.actions";
import { getAllStores } from "@/lib/actions/store.actions";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Filter, Search, RotateCcw, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const ACTION_TYPES = [
    "CREATE_EMPLOYEE", "UPDATE_EMPLOYEE", "ARCHIVE_EMPLOYEE",
    "CREATE_STORE", "UPDATE_STORE", "ARCHIVE_STORE",
    "CREATE_STORE_DEPARTMENT", "ASSIGN_EMPLOYEES_TO_DEPT",
    "CREATE_SCHEDULE", "UPDATE_SCHEDULE", "APPROVE_SCHEDULE", "PUBLISH_SCHEDULE", "REJECT_SCHEDULE",
    "REQUEST_VACATION", "APPROVE_VACATION", "REJECT_VACATION",
    "SEND_MESSAGE", "CREATE_GROUP_CHAT"
];

interface ActivityLogProps {
    userId?: string;
    userRoles?: string[];
}

export function ActivityLog({ userId, userRoles }: ActivityLogProps) {
    const [logs, setLogs] = useState<any[]>([]);
    const [stores, setStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [action, setAction] = useState<string>("all");
    const [storeId, setStoreId] = useState<string>("all");
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        const options: any = {
            limit: 50,
            userId,
            userRoles,
            action: action !== "all" ? action : undefined,
            storeId: storeId !== "all" ? storeId : undefined,
            startDate: date ? date.toISOString() : undefined,
        };
        const data = await getActionLogs(options);
        setLogs(data);
        setLoading(false);
    }, [userId, userRoles, action, storeId, date]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    useEffect(() => {
        const fetchStores = async () => {
            const data = await getAllStores();
            setStores(data);
        };
        fetchStores();
    }, []);

    const resetFilters = () => {
        setAction("all");
        setStoreId("all");
        setDate(undefined);
        setSearchTerm("");
    };

    const getActionBadge = (action: string) => {
        if (action.includes("CREATE")) return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Create</Badge>;
        if (action.includes("UPDATE")) return <Badge variant="secondary" className="bg-blue-500 text-white hover:bg-blue-600">Update</Badge>;
        if (action.includes("DELETE") || action.includes("ARCHIVE") || action.includes("REJECT")) return <Badge variant="destructive">Delete/Reject</Badge>;
        if (action.includes("APPROVE") || action.includes("PUBLISH")) return <Badge variant="outline" className="border-green-500 text-green-500">Approve</Badge>;
        return <Badge variant="outline">{action.toLowerCase().replace(/_/g, " ")}</Badge>;
    };

    const filteredLogs = logs.filter(log => {
        if (!searchTerm) return true;
        const actorName = log.performedBy ? `${log.performedBy.firstName} ${log.performedBy.lastName}` : "System";
        return (
            actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.details && JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase()))
        );
    });

    return (
        <div className="space-y-6">
            {/* Filter Bar */}
            {!userId && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-xl bg-card shadow-sm">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search actor or details..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <Select value={action} onValueChange={setAction}>
                        <SelectTrigger>
                            <SelectValue placeholder="Action Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Actions</SelectItem>
                            {ACTION_TYPES.map(a => (
                                <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={storeId} onValueChange={setStoreId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Store" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Stores</SelectItem>
                            {stores.map(s => (
                                <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="flex gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <Button variant="ghost" size="icon" onClick={resetFilters}>
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[180px]">Actor (Who)</TableHead>
                            <TableHead>Action (What)</TableHead>
                            <TableHead>Where (Store)</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead className="text-right">When</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    {Array.from({ length: 5 }).map((_, j) => (
                                        <TableCell key={j}><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : filteredLogs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No activity logs found matching the criteria.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredLogs.map((log) => (
                                <TableRow key={log._id} className="hover:bg-muted/30 transition-colors">
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-7 w-7 border">
                                                <AvatarImage src={log.performedBy?.image} />
                                                <AvatarFallback className="text-[10px]">
                                                    {log.performedBy ? log.performedBy.firstName[0] : "S"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium leading-none">
                                                    {log.performedBy ? `${log.performedBy.firstName} ${log.performedBy.lastName}` : "System"}
                                                </span>
                                                {log.performedBy?.email && (
                                                    <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                                        {log.performedBy.email}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            {getActionBadge(log.action)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {log.storeId?.name ? (
                                            <Badge variant="outline" className="font-normal capitalize border-primary/20 bg-primary/5">
                                                {log.storeId.name}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground text-xs italic">Global / System</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-[300px] text-xs text-muted-foreground">
                                            {log.details ? (
                                                <div className="grid grid-cols-1 gap-0.5">
                                                    {Object.entries(log.details).filter(([k]) => k !== 'systemActor').map(([k, v]) => (
                                                        <div key={k} className="flex gap-1">
                                                            <span className="font-semibold uppercase text-[9px] text-primary/70">{k}:</span>
                                                            <span className="truncate">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                                                        </div>
                                                    ))}
                                                    {log.details.systemActor && (
                                                        <div className="text-[10px] italic text-primary/80">Actor: {log.details.systemActor}</div>
                                                    )}
                                                </div>
                                            ) : "-"}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right text-[11px] text-muted-foreground tabular-nums">
                                        {format(new Date(log.createdAt), "MMM d, yyyy")}<br />
                                        <span className="font-medium text-foreground">{format(new Date(log.createdAt), "HH:mm:ss")}</span>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
