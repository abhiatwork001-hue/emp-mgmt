"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getNoticesForUser } from "@/lib/actions/notice.actions";
import { format } from "date-fns";
import { Link } from "@/i18n/routing";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Megaphone, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";

interface NoticeBoardProps {
    userId: string;
}

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function NoticeBoard({ userId }: NoticeBoardProps) {
    const [notices, setNotices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 1;

    useEffect(() => {
        const fetch = async () => {
            const data = await getNoticesForUser(userId);
            setNotices(data);
            setLoading(false);
        };
        fetch();
    }, [userId]);

    const totalPages = notices.length;
    const notice = notices[currentPage - 1];

    const handleNext = () => {
        if (currentPage < totalPages) setCurrentPage(p => p + 1);
    };

    const handlePrev = () => {
        if (currentPage > 1) setCurrentPage(p => p - 1);
    };

    if (loading) return (
        <Card glass className="h-[400px] flex items-center justify-center border-border/40">
            <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Synchronizing Announcements</p>
            </div>
        </Card>
    );

    if (notices.length === 0) return (
        <Card glass className="border-dashed border-border/40 h-[400px] flex items-center justify-center">
            <div className="text-center space-y-4 p-8">
                <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto">
                    <Megaphone className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <div>
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Notice Board</CardTitle>
                    <p className="text-xs text-muted-foreground/60 mt-1 italic">No active announcements at this time.</p>
                </div>
                <Link href="/dashboard/notices">
                    <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest hover:bg-primary/5">
                        OPEN ARCHIVE
                    </Button>
                </Link>
            </div>
        </Card>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
                <Link href="/dashboard/notices" className="group/title">
                    <div className="flex flex-col">
                        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground/60 group-hover/title:text-primary transition-colors flex items-center gap-2">
                            <Megaphone className="h-4 w-4" />
                            ECOSYSTEM BROADCASTS
                        </h2>
                        <div className="h-0.5 w-8 bg-primary/20 scale-x-0 group-hover/title:scale-x-200 transition-transform origin-left mt-1" />
                    </div>
                </Link>
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black tabular-nums tracking-widest text-muted-foreground/40">{currentPage} <span className="text-muted-foreground/20 italic mx-1">OF</span> {totalPages}</span>
                    <div className="flex gap-1.5 p-1 bg-muted/30 rounded-xl border border-border/20">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-background/80 hover:shadow-sm"
                            onClick={handlePrev}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-background/80 hover:shadow-sm"
                            onClick={handleNext}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={notice?._id || 'empty'}
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.02, y: -10 }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                >
                    {notice && (
                        <Card glass premium className="h-[400px] flex flex-col group overflow-hidden border-border/40 hover:border-primary/20 transition-all duration-500">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-125 transition-all duration-700 pointer-events-none">
                                <Megaphone className="h-24 w-24 -rotate-12" />
                            </div>

                            <CardHeader className="pb-4 relative z-10">
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex flex-wrap gap-2">
                                            {notice.priority === 'urgent' && (
                                                <Badge className="bg-destructive text-destructive-foreground font-black text-[10px] tracking-widest uppercase border-none px-3 py-1 shadow-lg shadow-destructive/20 animate-pulse">
                                                    URGENT
                                                </Badge>
                                            )}
                                            {notice.targetScope === 'global' ? (
                                                <Badge variant="outline" className="font-black text-[10px] tracking-widest uppercase bg-primary/5 text-primary border-primary/20 px-3 py-1">GLOBAL</Badge>
                                            ) : (
                                                <Badge variant="outline" className="font-black text-[10px] tracking-widest uppercase bg-muted/40 text-muted-foreground border-border/40 px-3 py-1">STORE</Badge>
                                            )}
                                        </div>
                                        <Link href={`/dashboard/notices/${notice._id}`}>
                                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/5 hover:text-primary">
                                                <ChevronRight className="h-5 w-5" />
                                            </Button>
                                        </Link>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Link href={`/dashboard/notices/${notice._id}`} className="group/link block">
                                            <CardTitle className="text-2xl font-black text-foreground/90 group-hover/link:text-primary transition-colors leading-tight">
                                                {notice.title}
                                            </CardTitle>
                                        </Link>
                                        <CardDescription className="flex items-center gap-3 text-xs font-bold">
                                            <div className="flex items-center gap-2 text-muted-foreground/60">
                                                <Avatar className="h-5 w-5 ring-2 ring-background ring-offset-2 ring-offset-muted/40">
                                                    <AvatarImage src={notice.createdBy?.image} />
                                                    <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black uppercase">
                                                        {notice.createdBy?.firstName?.[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span>{notice.createdBy?.firstName}</span>
                                            </div>
                                            <span className="w-1 h-1 rounded-full bg-border/40" />
                                            <span className="text-muted-foreground/40 uppercase tracking-tighter">{format(new Date(notice.createdAt), "MMMM d")}</span>
                                            {notice.comments?.length > 0 && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-border/40" />
                                                    <div className="flex items-center gap-1.5 text-primary">
                                                        <MessageCircle className="h-3 w-3" />
                                                        <span className="text-[10px] font-black tracking-widest">{notice.comments.length}</span>
                                                    </div>
                                                </>
                                            )}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="flex-1 min-h-0 pt-0 flex flex-col relative z-10 px-8">
                                <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-border/20 to-transparent mb-6" />
                                <ScrollArea className="flex-1 -mr-4 pr-6">
                                    <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/70 leading-relaxed font-medium italic">
                                        {notice.content}
                                    </div>
                                </ScrollArea>
                                <div className="mt-8 pb-8">
                                    <Link href={`/dashboard/notices/${notice._id}`}>
                                        <Button className="w-full bg-foreground text-background font-black text-xs tracking-[0.2em] rounded-xl h-12 hover:bg-primary hover:text-primary-foreground transition-all duration-300">
                                            ENGAGE ANNOUNCEMENT
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
