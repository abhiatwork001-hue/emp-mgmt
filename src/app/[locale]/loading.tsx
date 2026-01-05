import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-primary/10 animate-pulse">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                <p className="text-muted-foreground font-medium animate-pulse">Loading...</p>
            </div>
        </div>
    );
}
