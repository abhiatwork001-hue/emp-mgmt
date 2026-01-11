"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { getAllDocuments, IDocumentResult } from "@/lib/actions/document.actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, Filter, Download, ExternalLink, Calendar, Paperclip, AlertCircle, CheckSquare, Stethoscope } from "lucide-react";
import { format } from "date-fns";
import { useDebounce } from "@/hooks/use-debounce";
import Link from "next/link";
import { toast } from "sonner";

export default function DocumentsPage() {
    const t = useTranslations("Documents");
    const [docs, setDocs] = useState<IDocumentResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const debouncedSearch = useDebounce(search, 500);
    const [stats, setStats] = useState({ total: 0 });

    useEffect(() => {
        fetchDocs();
    }, [debouncedSearch, typeFilter]);

    async function fetchDocs() {
        setLoading(true);
        try {
            const res = await getAllDocuments(
                debouncedSearch,
                { type: typeFilter === 'all' ? undefined : typeFilter }
            );
            setDocs(res.data);
            setStats({ total: res.total });
        } catch (error) {
            console.error(error);
            toast.error("Failed to load documents");
        } finally {
            setLoading(false);
        }
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'task': return <CheckSquare className="h-4 w-4 text-blue-500" />;
            case 'problem': return <AlertCircle className="h-4 w-4 text-orange-500" />;
            case 'absence': return <Stethoscope className="h-4 w-4 text-red-500" />;
            case 'employee_profile': return <FileText className="h-4 w-4 text-green-500" />;
            default: return <Paperclip className="h-4 w-4" />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'task': return t('types.task');
            case 'problem': return t('types.problem');
            case 'absence': return t('types.absence');
            case 'employee_profile': return t('types.employee_profile');
            default: return t('types.document');
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
                    <p className="text-muted-foreground">
                        {t('subtitle')}
                    </p>
                </div>
                {/* <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" /> Export Report
                </Button> */}
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('searchPlaceholder')}
                                className="pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <Filter className="mr-2 h-4 w-4" />
                                    <SelectValue placeholder={t('filterByType')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('allTypes')}</SelectItem>
                                    <SelectItem value="absence">{t('sickLeaves')}</SelectItem>
                                    <SelectItem value="task">{t('taskSubmissions')}</SelectItem>
                                    <SelectItem value="problem">{t('problemReports')}</SelectItem>
                                    {/* <SelectItem value="employee_profile">HR Files</SelectItem> */}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('table.type')}</TableHead>
                                    <TableHead>{t('table.document')}</TableHead>
                                    <TableHead>{t('table.submittedBy')}</TableHead>
                                    <TableHead>{t('table.context')}</TableHead>
                                    <TableHead>{t('table.date')}</TableHead>
                                    <TableHead className="text-right">{t('table.action')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={6} className="h-12 text-center text-muted-foreground">
                                                {t('table.loading')}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : docs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            {t('table.noDocuments')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    docs.map((doc) => (
                                        <TableRow key={`${doc.sourceType}-${doc.id}-${doc.url}`}>
                                            <TableCell>
                                                <Badge variant="outline" className="flex items-center w-fit gap-1">
                                                    {getTypeIcon(doc.sourceType)}
                                                    {getTypeLabel(doc.sourceType)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                                    <span className="truncate max-w-[200px]" title={doc.fileName}>{doc.fileName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarImage src={doc.submittedBy.image} />
                                                        <AvatarFallback>{doc.submittedBy.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm">{doc.submittedBy.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium truncate max-w-[250px]">{doc.title}</span>
                                                    <span className="text-xs text-muted-foreground truncate max-w-[250px]">{doc.description}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {format(new Date(doc.submittedAt), "MMM d, yyyy")}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={doc.url} target="_blank">
                                                        <ExternalLink className="h-4 w-4" /> {t('table.view')}
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="mt-4 text-xs text-muted-foreground text-center">
                        {t('table.showing', { count: docs.length, total: stats.total })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
