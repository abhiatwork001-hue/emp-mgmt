// src/components/ui/breadcrumbs.tsx
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
    /** Optional className for container */
    className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
    return (
        <nav aria-label="breadcrumb" className={cn('flex items-center space-x-1 text-sm', className)}>
            {items.map((item, idx) => (
                <span key={idx} className="flex items-center">
                    {item.href ? (
                        <Link href={item.href} className="text-primary hover:underline">
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-muted-foreground">{item.label}</span>
                    )}
                    {idx < items.length - 1 && <span className="mx-1 text-muted-foreground">/</span>}
                </span>
            ))}
        </nav>
    );
}
