"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function YearSelector({ currentYear }: { currentYear: number }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const years = [];
    const startYear = 2024;
    const endYear = new Date().getFullYear() + 1;

    for (let y = endYear; y >= startYear; y--) {
        years.push(y);
    }

    const handleChange = (year: string) => {
        const params = new URLSearchParams(searchParams);
        params.set("year", year);
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-tighter text-muted-foreground/60 italic">
                Year:
            </span>
            <Select value={String(currentYear)} onValueChange={handleChange}>
                <SelectTrigger className="w-[100px] h-8 text-xs bg-muted/20 border-border/50">
                    <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                    {years.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                            {y}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
