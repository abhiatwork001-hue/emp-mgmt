// src/components/ui/skeleton.tsx
import { cn } from '@/lib/utils';

interface SkeletonProps {
    /** Width e.g., 'w-full', 'w-32' */
    className?: string;
    /** Height e.g., 'h-4', 'h-8' */
    height?: string;
}

export function Skeleton({ className = '', height = 'h-4' }: SkeletonProps) {
    return (
        <div
            className={cn('animate-pulse bg-muted rounded', height, className)}
            role="status"
            aria-label="loading"
        />
    );
}
