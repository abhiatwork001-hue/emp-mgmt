"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function TipsStoreSelector({ stores, initialStoreId }: { stores: any[], initialStoreId?: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const handleChange = (val: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("storeId", val);
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="flex flex-col gap-2 w-full max-w-xs">
            <label className="text-xs font-bold uppercase text-muted-foreground/60 tracking-wider">Select Store View</label>
            <Select onValueChange={handleChange} defaultValue={initialStoreId}>
                <SelectTrigger className="bg-background border-border/40 h-10 rounded-xl">
                    <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent>
                    {stores.map((s) => (
                        <SelectItem key={s._id} value={s._id}>
                            {s.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
