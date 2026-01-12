import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function WidgetSkeleton() {
    return (
        <Card className="h-full flex flex-col shadow-sm">
            <CardHeader className="py-3 px-4 min-h-[60px]">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-4 space-y-4">
                <div className="flex gap-2">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 w-24" />
                </div>
                <div className="space-y-3 pt-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-lg" />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
