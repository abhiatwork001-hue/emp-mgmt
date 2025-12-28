import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
    className?: string;
    text?: string;
}

export function LoadingSpinner({ className, text = "Loading..." }: LoadingSpinnerProps) {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#020817]">
            <div className={cn("animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white", className)}></div>
            <p className="mt-4 text-zinc-400 text-lg animate-pulse">{text}</p>
        </div>
    );
}
