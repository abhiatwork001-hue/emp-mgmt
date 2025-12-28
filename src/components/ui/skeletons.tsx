import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function StatsSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
                <Card key={i} glass className="relative overflow-hidden">
                    <CardHeader className="pb-2">
                        <Skeleton className="h-3 w-24" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-10 w-16 mb-2" />
                        <Skeleton className="h-1.5 w-full" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export function CardSkeleton() {
    return (
        <Card glass>
            <CardHeader>
                <Skeleton className="h-5 w-1/3" />
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
            </CardContent>
        </Card>
    );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="w-full space-y-4">
            <div className="flex justify-between items-center mb-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-32 rounded-xl" />
            </div>
            <div className="border border-border/40 rounded-2xl overflow-hidden bg-background/50 backdrop-blur-sm">
                <div className="p-4 border-b border-border/40 bg-muted/30">
                    <div className="grid grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <Skeleton key={i} className="h-4 w-24" />
                        ))}
                    </div>
                </div>
                {[...Array(rows)].map((_, i) => (
                    <div key={i} className="p-4 border-b border-border/40 last:border-0">
                        <div className="grid grid-cols-4 gap-4 items-center">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                            </div>
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-8 w-24 rounded-lg ml-auto" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function DashboardSkeleton() {
    return (
        <div className="space-y-10 p-6 max-w-[1600px] mx-auto">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-32 rounded-2xl" />
                    <Skeleton className="h-12 w-32 rounded-2xl" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-10">
                    <StatsSkeleton />
                    <CardSkeleton />
                    <CardSkeleton />
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <CardSkeleton />
                    <CardSkeleton />
                </div>
            </div>
        </div>
    );
}

export function FormSkeleton() {
    return (
        <div className="max-w-4xl mx-auto space-y-8 p-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
            </div>
            <Card glass>
                <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-10 w-full rounded-xl" />
                            </div>
                        ))}
                    </div>
                    <Skeleton className="h-32 w-full rounded-xl" />
                    <div className="flex justify-end gap-3 pt-4">
                        <Skeleton className="h-10 w-24 rounded-xl" />
                        <Skeleton className="h-10 w-32 rounded-xl" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
