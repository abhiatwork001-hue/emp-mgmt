import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function DashboardSkeleton() {
    return (
        <div className="flex flex-col gap-8 animate-pulse">
            <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-32 rounded-full" />
                <div className="h-[1px] flex-1 bg-border/50" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <Skeleton className="h-[400px] w-full rounded-xl" />
                    <Skeleton className="h-[200px] w-full rounded-xl" />
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-[300px] w-full rounded-xl" />
                    <Skeleton className="h-[300px] w-full rounded-xl" />
                </div>
            </div>
        </div>
    );
}
