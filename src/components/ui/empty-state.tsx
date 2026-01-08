"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

interface EmptyStateProps {
    title: string;
    description: string;
    icon: LucideIcon;
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
    className?: string;
}

export function EmptyState({
    title,
    description,
    icon: Icon,
    actionLabel,
    actionHref,
    onAction,
    className
}: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-border/50 bg-muted/50", className)}>
            <div className="p-4 rounded-full bg-background mb-4 shadow-sm">
                <Icon className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-[300px] mb-6">{description}</p>

            {actionLabel && (
                actionHref ? (
                    <Link href={actionHref}>
                        <Button>
                            {actionLabel}
                        </Button>
                    </Link>
                ) : (
                    <Button onClick={onAction}>
                        {actionLabel}
                    </Button>
                )
            )}
        </div>
    );
}
