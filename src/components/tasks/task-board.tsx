"use client";

import { useState } from "react";
import { TaskCard } from "./task-card";
import { CreateTaskDialog } from "./create-task-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, CheckSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";


// ... imports

interface TaskBoardProps {
    tasks: any[];
    currentUserId: string;
    currentUser: any; // Full employee object or meaningful subset
    stores: any[];
    storeDepartments: any[];
    managers: any[];
}

export function TaskBoard({
    tasks,
    currentUserId,
    currentUser,
    stores,
    storeDepartments,
    managers
}: TaskBoardProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const router = useRouter();
    const [filter, setFilter] = useState("all");

    // Permission Check: Can create tasks?
    // Employee cannot create tasks (unless they are also something else)
    // We check if they have ANY management role
    const roles = (currentUser?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
    const canCreateTask = roles.some((r: string) =>
        ['owner', 'admin', 'super_user', 'hr', 'store_manager', 'department_head', 'store_department_head'].includes(r)
    );

    // Filter Logic
    const filteredTasks = tasks.filter(task => { // ... existing logic
        if (filter === 'all') return task.status !== 'completed';
        if (filter === 'completed') return task.status === 'completed';
        if (filter === 'high_priority') return task.priority === 'high' && task.status !== 'completed';
        return true;
    });

    const completedCount = tasks.filter(t => t.status === 'completed').length;
    const pendingCount = tasks.filter(t => t.status !== 'completed').length;

    return (
        <Card className="h-full flex flex-col shadow-sm border-l-4 border-l-primary/50 relative">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between bg-muted/5 min-h-[60px]">
                <div className="space-y-1">
                    <CardTitle className="text-md font-semibold flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-primary" />
                        Team Tasks
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                        {pendingCount} pending items
                    </p>
                </div>
                {canCreateTask && (
                    <Button onClick={() => setIsCreateOpen(true)} size="sm" variant="outline" className="h-8 gap-1">
                        <Plus className="h-3.5 w-3.5" /> New
                    </Button>
                )}
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
                <Tabs defaultValue="all" value={filter} onValueChange={setFilter} className="flex-1 flex flex-col">
                    <div className="px-4 pt-2 border-b w-full">
                        <TabsList className="w-max justify-start h-9 bg-transparent p-0">
                            <TabsTrigger value="all" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 text-xs">Active</TabsTrigger>
                            <TabsTrigger value="high_priority" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 text-xs">High Priority</TabsTrigger>
                            <TabsTrigger value="completed" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 text-xs">Completed</TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                            {filteredTasks.length === 0 ? (
                                <div className="col-span-full text-center py-12 text-muted-foreground border rounded-lg border-dashed bg-muted/20">
                                    No tasks found in this view.
                                </div>
                            ) : (
                                filteredTasks.map(task => (
                                    <TaskCard
                                        key={task._id}
                                        task={task}
                                        currentUserId={currentUserId}
                                        onClick={() => router.push(`/dashboard/tasks/${task.slug || task._id}`)}
                                    />
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </Tabs>

                {canCreateTask && (
                    <CreateTaskDialog
                        open={isCreateOpen}
                        onOpenChange={setIsCreateOpen}
                        currentUserId={currentUserId}
                        currentUser={currentUser}
                        stores={stores}
                        storeDepartments={storeDepartments}
                        managers={managers}
                    />
                )}
            </CardContent>
        </Card>
    );
}
