// src/components/ui/toast.tsx
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ToastOptions {
    title?: string;
    description?: string;
    /** Variant: 'default' | 'success' | 'error' | 'warning' */
    variant?: 'default' | 'success' | 'error' | 'warning';
    /** Duration in ms */
    duration?: number;
}

export function showToast({ title, description, variant = 'default', duration = 3000 }: ToastOptions) {
    const className = cn(
        'bg-background text-foreground border border-border',
        variant === 'success' && 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700',
        variant === 'error' && 'bg-destructive/10 border-destructive/20 text-destructive-foreground',
        variant === 'warning' && 'bg-amber-500/10 border-amber-500/20 text-amber-600'
    );
    toast(
        <div className={className}>
            {title && <div className="font-semibold">{title}</div>}
            {description && <div className="text-sm opacity-90">{description}</div>}
        </div>,
        { duration }
    );
}

export { toast as ToastContainer };
