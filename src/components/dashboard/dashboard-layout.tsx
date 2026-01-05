"use client";

import { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface DashboardLayoutProps {
    children?: ReactNode;
    widgets?: { [key: string]: ReactNode }; // Deprecated but kept for type safety if needed temporarily
    sidebar?: {
        activity?: ReactNode;
        todo?: ReactNode;
        notifications?: ReactNode;
    };
    defaultLayout?: any;
}

export default function DashboardLayout({ children, sidebar }: DashboardLayoutProps) {
    return (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4 p-1 md:p-1 bg-muted/5 min-h-screen">
            {/* Main Content Area */}
            <div className="min-w-0 flex flex-col gap-6">
                {children}
            </div>

            {/* Side panel */}
            <aside className="side-panel flex flex-col h-[calc(100vh-100px)] sticky top-6 bg-card rounded-xl border shadow-sm overflow-hidden print:hidden">
                <Tabs defaultValue="activity" className="flex flex-col h-full">
                    <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 m-1 mb-0 rounded-lg">
                        <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
                        <TabsTrigger value="todo" className="text-xs">Todo</TabsTrigger>
                        <TabsTrigger value="notifications" className="text-xs">Alerts</TabsTrigger>
                    </TabsList>
                    <TabsContent value="activity" className="flex-1 overflow-y-auto p-0 scrollbar-hide">
                        {sidebar?.activity || <div className="p-4 text-xs text-muted-foreground">Activity Log Unavailable</div>}
                    </TabsContent>
                    <TabsContent value="todo" className="flex-1 overflow-y-auto p-0 scrollbar-hide">
                        {sidebar?.todo || <div className="p-4 text-xs text-muted-foreground">Todo List Unavailable</div>}
                    </TabsContent>
                    <TabsContent value="notifications" className="flex-1 overflow-y-auto p-0 scrollbar-hide">
                        {sidebar?.notifications || <div className="p-4 text-xs text-muted-foreground">No Alerts</div>}
                    </TabsContent>
                </Tabs>
            </aside>
        </div>
    );
}
