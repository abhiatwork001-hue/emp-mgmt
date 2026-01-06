"use client";

import { useState } from "react";
import { TaskCard } from "./task-card";
import { CreateTaskDialog } from "./create-task-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, CheckSquare, Download, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";


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
    const [searchTerm, setSearchTerm] = useState("");

    // Permission Check: Can create tasks?
    // Employee cannot create tasks (unless they are also something else)
    // We check if they have ANY management role
    const roles = (currentUser?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
    const canCreateTask = roles.some((r: string) =>
        ['owner', 'admin', 'super_user', 'hr', 'store_manager', 'department_head', 'store_department_head'].includes(r)
    );

    // Filter Logic
    const filteredTasks = tasks.filter(task => { // ... existing logic
        // Text Search
        if (searchTerm) {
            const lowerInfo = (task.title + (task.description || "")).toLowerCase();
            if (!lowerInfo.includes(searchTerm.toLowerCase())) return false;
        }

        if (filter === 'all') return task.status !== 'completed';
        if (filter === 'completed') return task.status === 'completed';
        if (filter === 'high_priority') return task.priority === 'high' && task.status !== 'completed';
        return true;
    });

    const completedCount = tasks.filter(t => t.status === 'completed').length;
    const pendingCount = tasks.filter(t => t.status !== 'completed').length;

    const handleExportCSV = () => {
        try {
            const headers = ["Title", "Status", "Priority", "Due Date", "Assignee", "Created By"];
            const rows = filteredTasks.map(t => [
                t.title,
                t.status,
                t.priority,
                t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "",
                t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : "Unassigned",
                t.createdBy ? `${t.createdBy.firstName} ${t.createdBy.lastName}` : ""
            ]);

            const csvContent = [
                headers.join(","),
                ...rows.map(row => row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(","))
            ].join("\n");

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", `tasks_export_${new Date().toISOString().slice(0, 10)}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
            toast.success("Tasks exported to CSV");
        } catch (e) {
            console.error("Export failed", e);
            toast.error("Failed to export tasks");
        }
    };

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
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={handleExportCSV} title="Export CSV">
                        <Download className="h-4 w-4" />
                    </Button>
                    {canCreateTask && (
                        <Button onClick={() => setIsCreateOpen(true)} size="sm" variant="outline" className="h-8 gap-1">
                            <Plus className="h-3.5 w-3.5" /> New
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
                <div className="px-4 py-2 border-b flex items-center gap-2 bg-muted/5">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search tasks..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-9 pl-8 text-sm bg-background/50 border-input/50 focus-visible:bg-background transition-colors"
                        />
                    </div>
                </div>

                <Tabs defaultValue="all" value={filter} onValueChange={setFilter} className="flex-1 flex flex-col">
                    <div className="px-4 pt-2 border-b w-full">
                        <TabsList className="w-max justify-start h-9 bg-transparent p-0">
                            <TabsTrigger value="all" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 text-xs">Active</TabsTrigger>
                            <TabsTrigger value="high_priority" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 text-xs">High Priority</TabsTrigger>
                            <TabsTrigger value="completed" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 text-xs">Completed</TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="flex flex-col gap-3 p-4">
                            {filteredTasks.length === 0 ? (
                                <div className="col-span-full text-center py-12 text-muted-foreground border rounded-lg border-dashed bg-muted/20">
                                    {searchTerm ? "No tasks matching your search." : "No tasks found in this view."}
                                </div>
                            ) : (
                                filteredTasks.map(task => (
                                    <TaskCard
                                        key={task._id}
                                        task={task}
                                        currentUserId={currentUserId}
                                        currentUserRoles={currentUser?.roles || []}
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
