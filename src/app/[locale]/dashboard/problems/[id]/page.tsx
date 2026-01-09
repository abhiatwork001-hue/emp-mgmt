
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getProblemById, addComment, resolveProblem } from "@/lib/actions/problem.actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow, format } from "date-fns";
import {
    AlertTriangle,
    CheckCircle2,
    MessageSquare,
    User,
    Clock,
    Building2,
    Send,
    ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { ProblemCommentForm } from "./problem-comment-form"; // Client component
import { ResolveProblemButton } from "./resolve-problem-button"; // Client component
import { ProblemRealtimeListener } from "./problem-realtime-listener";

export default async function ProblemDetailsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const problem = await getProblemById(params.id);
    if (!problem) notFound();

    const currentUserId = (session.user as any).id;
    const isReporter = problem.reportedBy?._id === currentUserId;
    // Simple permission check: Admins, HR, Owners, or the Reporter can view/act
    // Also recipients (managers) should be able to view if it's assigned to their store/role?
    // For now assuming access if they have the link (since notification sends it to relevant people)

    const priorityColor = {
        low: "bg-blue-500",
        medium: "bg-yellow-500",
        high: "bg-orange-500",
        critical: "bg-red-500"
    }[problem.priority as string] || "bg-gray-500";

    const statusColor = {
        open: "text-blue-500 bg-blue-500/10",
        in_progress: "text-yellow-500 bg-yellow-500/10",
        resolved: "text-green-500 bg-green-500/10",
        wont_fix: "text-gray-500 bg-gray-500/10"
    }[problem.status as string] || "text-gray-500";

    return (
        <div className="container mx-auto max-w-4xl p-6 space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        Problem Report #{problem._id.toString().slice(-4)}
                        <Badge variant="outline" className={`${statusColor} capitalize border-0`}>
                            {(problem.status || "open").replace("_", " ")}
                        </Badge>
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Reported {formatDistanceToNow(new Date(problem.createdAt), { addSuffix: true })}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge className={`${priorityColor} text-white capitalize`}>
                                            {problem.priority} Priority
                                        </Badge>
                                        <Badge variant="secondary" className="capitalize">
                                            {problem.category}
                                        </Badge>
                                    </div>
                                    <h2 className="text-xl font-semibold">Description</h2>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="prose dark:prose-invert max-w-none">
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                {problem.description}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Comments Section */}
                    <div className="space-y-4">
                        <h3 className="tex-lg font-semibold flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Discussion
                        </h3>

                        <div className="space-y-4">
                            {problem.comments?.map((comment: any, idx: number) => (
                                <Card key={idx} className="bg-muted/30">
                                    <CardContent className="p-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={comment.userImage} />
                                                    <AvatarFallback>{comment.userName[0]}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm font-semibold">{comment.userName}</span>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className="text-sm pl-8 whitespace-pre-wrap">{comment.text}</p>
                                        {comment.files && comment.files.length > 0 && (
                                            <div className="pl-8 mt-2 flex flex-wrap gap-2">
                                                {comment.files.map((file: string, fIdx: number) => (
                                                    <Link key={fIdx} href={file} target="_blank" rel="noopener noreferrer">
                                                        <img
                                                            src={file}
                                                            alt="Attachment"
                                                            className="h-24 w-24 object-cover rounded-md border border-border hover:opacity-90 transition-opacity"
                                                        />
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <ProblemCommentForm problemId={problem._id} userId={currentUserId} />
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Reporter</CardTitle>
                        </CardHeader>
                        <CardContent className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={problem.reportedBy?.image} />
                                <AvatarFallback>{problem.reportedBy?.firstName?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold text-sm">{problem.reportedBy?.firstName || 'User'} {problem.reportedBy?.lastName || ''}</p>
                                <p className="text-xs text-muted-foreground">{problem.reportedBy?.email || 'No email'}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Metadata</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            {problem.storeId && (
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <span>Store: {problem.storeId.name}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="capitalize">To: {(problem.recipientRole || "admin").replace('_', ' ')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>{format(new Date(problem.createdAt), "PPP p")}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Resolution Action */}
                    {/* Resolution Action - Only Reporter can resolve */}
                    {isReporter && (
                        <ResolveProblemButton
                            problemId={problem._id}
                            currentStatus={problem.status}
                            userId={currentUserId}
                            isResolved={problem.status === 'resolved'}
                        />
                    )}

                    {problem.resolvedBy && (
                        <Card className="bg-green-500/5 border-green-500/20">
                            <CardContent className="p-4 space-y-2">
                                <div className="flex items-center gap-2 text-green-600 font-semibold">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Resolved
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    by {problem.resolvedBy.firstName} on {format(new Date(problem.resolvedAt), "PP")}
                                </div>
                                {problem.resolutionNotes && (
                                    <p className="text-xs italic mt-2">"{problem.resolutionNotes}"</p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                </div>
            </div>
            <ProblemRealtimeListener problemId={problem._id.toString()} />
        </div>
    );
}
