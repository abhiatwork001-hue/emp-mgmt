import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTaskById, getTaskBySlug } from "@/lib/actions/task.actions";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Circle, Clock, MessageSquare, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskCommentsSection } from "@/components/tasks/task-comments-section";
import { TaskActionButtons } from "@/components/tasks/task-action-buttons";
import { TaskChecklist } from "@/components/tasks/task-checklist";

import { Employee } from "@/lib/models";
import connectToDB from "@/lib/db";
import { cn } from "@/lib/utils";

export default async function TaskAnalyticsPage(props: { params: Promise<{ slug: string }> }) {
    const { slug } = await props.params;

    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    await connectToDB();
    const task = await getTaskBySlug(slug);
    if (!task) notFound();

    // Fetch User for Roles
    const user = await Employee.findById(session.user.id);

    // Stats Calculation
    const totalAssigned = task.assignedTo?.length || 0;
    const completedCount = task.completedBy?.length || 0;
    const pendingCount = totalAssigned - completedCount;
    const completionPercentage = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;

    // Split users
    const completedUserIds = new Set(
        task.completedBy?.map((cb: any) => (cb.userId?._id || cb.userId)?.toString()).filter(Boolean) || []
    );
    const pendingUsers = task.assignedTo?.filter((a: any) => {
        const aId = (a.id?._id || a.id)?.toString();
        return aId && !completedUserIds.has(aId);
    }) || [];
    const completedUsers = task.completedBy || [];

    // Current User Status
    const isCompletedByMe = completedUserIds.has(session.user.id);

    // Permissions
    const isCreator = (task.createdBy?._id || task.createdBy)?.toString() === session.user.id;
    const isManager = user?.roles?.some((r: string) =>
        ['store_manager', 'admin', 'owner', 'hr', 'department_head'].includes(r)
    );
    const isAssigned = completedUserIds.has(session.user.id) || pendingUsers.some((u: any) => {
        const uId = (u.id?._id || u.id)?.toString();
        return uId === session.user.id;
    });
    const canEditChecklist = isCreator || isManager || isAssigned;
    // Show stats if Creator, Manager, or if it's a "Group" task (many people) AND user has some authority?
    // User said: "show the stats for the creator and hr and owner... if there involved many people"
    // We will show stats to Creator and Managers regardless of count, for simplicity.
    const showStats = isCreator || isManager;

    // Priorities
    const priorities: Record<string, string> = {
        low: "bg-slate-100 text-slate-700",
        medium: "bg-blue-100 text-blue-700",
        high: "bg-orange-100 text-orange-700",
        critical: "bg-red-100 text-red-700",
    };

    // ... logic remains same ...

    return (
        <div className="flex-1 space-y-8 animate-in fade-in duration-500">
            {/* Minimal Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b pb-8">
                <div className="space-y-4 max-w-2xl">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className={cn("uppercase text-[10px] font-bold tracking-widest px-2 py-1 border-0", priorities[task.priority])}>
                                {task.priority} Priority
                            </Badge>
                            {task.deadline && (
                                <Badge variant="secondary" className="bg-muted text-muted-foreground text-[10px] uppercase font-bold tracking-widest px-2 py-1">
                                    Due {format(new Date(task.deadline), "MMM d, yyyy")}
                                </Badge>
                            )}
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">{task.title}</h1>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={task.createdBy?.image} />
                            <AvatarFallback>{task.createdBy?.firstName?.[0]}</AvatarFallback>
                        </Avatar>
                        <span>
                            Created by <span className="font-medium text-foreground">{task.createdBy?.firstName} {task.createdBy?.lastName}</span>
                        </span>
                    </div>

                    {task.description && (
                        <p className="text-base text-muted-foreground leading-relaxed max-w-prose">
                            {task.description}
                        </p>
                    )}
                </div>

                <div className="flex items-start">
                    <TaskActionButtons
                        taskId={task._id}
                        currentUserId={session.user.id}
                        isCompleted={isCompletedByMe}
                        task={task}
                        canEdit={isCreator || isManager}
                        isAssigned={isAssigned}
                    />
                </div>
            </div>

            {/* Main Dashboard Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column: Stats & Checklist (8 cols) */}
                <div className="lg:col-span-8 space-y-8">

                    {/* Key Metrics - Only for Privileged/Relevant Users */}
                    {showStats && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="bg-white border-blue-100 shadow-sm">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Completion</span>
                                            <div className="text-4xl font-black text-blue-600">{completionPercentage}%</div>
                                        </div>
                                        <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                            <CheckCircle2 className="h-6 w-6" />
                                        </div>
                                    </div>
                                    <Progress value={completionPercentage} className="h-1.5 mt-4 bg-slate-100 [&>div]:bg-blue-600" />
                                </CardContent>
                            </Card>

                            <Card className="bg-white border-orange-100 shadow-sm">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending</span>
                                            <div className="text-4xl font-black text-orange-600">{pendingCount}</div>
                                        </div>
                                        <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                                            <Circle className="h-6 w-6 stroke-2" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-4 font-medium">Assignees Remaining</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white border-slate-100 shadow-sm">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Team</span>
                                            <div className="text-4xl font-black text-slate-700">{totalAssigned}</div>
                                        </div>
                                        <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600">
                                            <User className="h-6 w-6" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-4 font-medium">Total People Involved</p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Integrated Checklist */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold tracking-tight">Action Items</h3>
                        </div>
                        <TaskChecklist
                            taskId={task._id}
                            todos={task.todos || []}
                            currentUserId={session.user.id}
                            canEdit={canEditChecklist}
                        />
                    </div>

                    {/* Comments Section - Prominent for Discourse */}
                    <div className="pt-4">
                        <h3 className="text-xl font-bold tracking-tight mb-4">Discussion</h3>
                        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                            <TaskCommentsSection
                                taskId={task._id}
                                currentUserId={session.user.id}
                                comments={task.comments || []}
                            />
                        </div>
                    </div>
                </div>


                {/* Right Column: Meta & Assignments (4 cols) */}
                <div className="lg:col-span-4 space-y-6">

                    {/* Assignment Tracker - Visible to Managers/Creator */}
                    {showStats && (
                        <Card className="border-0 shadow-sm bg-muted/40">
                            <CardHeader className="bg-transparent pb-2">
                                <CardTitle className="text-base font-semibold">Team Progress</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Tabs defaultValue="pending" className="w-full">
                                    <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-12">
                                        <TabsTrigger
                                            value="pending"
                                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 font-medium"
                                        >
                                            Pending ({pendingCount})
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="completed"
                                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 font-medium"
                                        >
                                            Done ({completedCount})
                                        </TabsTrigger>
                                    </TabsList>

                                    <div className="max-h-[500px] overflow-y-auto p-4 space-y-1">
                                        <TabsContent value="pending" className="m-0 space-y-1">
                                            {pendingUsers.length === 0 ? (
                                                <div className="py-8 text-center text-muted-foreground text-sm">All clear! 🎉</div>
                                            ) : (
                                                pendingUsers.map((assignee: any, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-background transition-colors">
                                                        <Avatar className="h-8 w-8 border">
                                                            <AvatarImage src={assignee.id.image} />
                                                            <AvatarFallback>{assignee.id.firstName?.[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">
                                                                {assignee.id?.firstName} {assignee.id?.lastName}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground truncate">
                                                                {assignee.id?.contract?.positionId || "Employee"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </TabsContent>
                                        <TabsContent value="completed" className="m-0 space-y-1">
                                            {completedUsers.length === 0 ? (
                                                <div className="py-8 text-center text-muted-foreground text-sm">No completions yet.</div>
                                            ) : (
                                                completedUsers.map((cb: any, idx: number) => {
                                                    const uId = cb.userId?._id?.toString() || cb.userId?.toString();
                                                    const userSubmissions = task.submissions?.filter((s: any) =>
                                                        (s.userId?._id || s.userId)?.toString() === uId
                                                    ) || [];

                                                    return (
                                                        <div key={idx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-background transition-colors opacity-75 border-b last:border-0 border-dashed">
                                                            <Avatar className="h-8 w-8 border mt-1">
                                                                <AvatarImage src={cb.userId.image} />
                                                                <AvatarFallback>{cb.userId.firstName?.[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between">
                                                                    <p className="text-sm font-medium truncate">
                                                                        {cb.userId?.firstName} {cb.userId?.lastName}
                                                                    </p>
                                                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                                                </div>
                                                                <p className="text-xs text-muted-foreground truncate">
                                                                    {format(new Date(cb.completedAt), "MMM d, h:mm a")}
                                                                </p>

                                                                {/* Subtask Progress */}
                                                                {task.todos && task.todos.length > 0 && (() => {
                                                                    const completedSubtasks = task.todos.filter((t: any) =>
                                                                        t.completedBy?.includes(uId)
                                                                    ).length;
                                                                    const totalSubtasks = task.todos.length;
                                                                    const percentage = Math.round((completedSubtasks / totalSubtasks) * 100);

                                                                    return (
                                                                        <div className="mt-2 space-y-1.5">
                                                                            <div className="flex items-center justify-between text-xs">
                                                                                <span className="text-muted-foreground">Subtasks</span>
                                                                                <span className={completedSubtasks === totalSubtasks ? "text-green-600 font-medium" : "text-orange-600 font-medium"}>
                                                                                    {completedSubtasks}/{totalSubtasks}
                                                                                </span>
                                                                            </div>
                                                                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                                                                <div
                                                                                    className={completedSubtasks === totalSubtasks ? "h-full bg-green-500" : "h-full bg-orange-500"}
                                                                                    style={{ width: `${percentage}%` }}
                                                                                />
                                                                            </div>
                                                                            {completedSubtasks < totalSubtasks && (
                                                                                <div className="mt-2 space-y-0.5">
                                                                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Incomplete:</p>
                                                                                    {task.todos
                                                                                        .filter((t: any) => !t.completedBy?.includes(uId))
                                                                                        .slice(0, 3)
                                                                                        .map((t: any, i: number) => (
                                                                                            <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                                                                                <span className="text-orange-500 mt-0.5">○</span>
                                                                                                <span className="line-clamp-1">{t.text}</span>
                                                                                            </div>
                                                                                        ))
                                                                                    }
                                                                                    {task.todos.filter((t: any) => !t.completedBy?.includes(uId)).length > 3 && (
                                                                                        <p className="text-[10px] text-muted-foreground italic pl-4">+{task.todos.filter((t: any) => !t.completedBy?.includes(uId)).length - 3} more</p>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })()}
                                                                {/* Submitted Files List */}
                                                                {userSubmissions.length > 0 && (
                                                                    <div className="mt-2 space-y-1">
                                                                        {userSubmissions.map((sub: any, sIdx: number) => (
                                                                            <div key={sIdx} className="flex items-center gap-2 text-xs">
                                                                                <span className="font-semibold text-muted-foreground">{sub.requirementName || "File"}:</span>
                                                                                <a
                                                                                    href={sub.fileUrl}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="text-blue-600 hover:underline flex items-center gap-1 font-medium truncate max-w-[150px]"
                                                                                    title={sub.fileName}
                                                                                >
                                                                                    {sub.fileName || "View"}
                                                                                </a>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </TabsContent>
                                    </div>
                                </Tabs>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
