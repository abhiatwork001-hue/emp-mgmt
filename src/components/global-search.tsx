"use client";

import * as React from "react";
import { Search, User, Store as StoreIcon, Loader2, ScrollText } from "lucide-react";
import { useRouter } from "next/navigation";
import { globalSearch, SearchResult } from "@/lib/actions/search.actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
// import { useDebounce } from "@/hooks/use-debounce"; 

// If we don't have a debounce hook, I'll just useEffect with setTimeout.

export function GlobalSearch({ locale = "en" }: { locale?: string }) {
    const router = useRouter();
    const [query, setQuery] = React.useState("");
    const [open, setOpen] = React.useState(false);
    const [results, setResults] = React.useState<SearchResult[]>([]);
    const [loading, setLoading] = React.useState(false);
    const t = useTranslations("Common");

    // Debounce logic
    React.useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                setLoading(true);
                try {
                    const res = await globalSearch(query, locale);
                    setResults(res);
                    setOpen(true);
                } catch (error) {
                    console.error(error);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
                setOpen(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (result: SearchResult) => {
        router.push(result.url);
        setOpen(false);
        setQuery("");
    };

    return (
        <div className="relative w-full max-w-sm">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder={t("search")}
                    className="w-full bg-muted/50 pl-9 border-border text-foreground focus:bg-background transition-colors"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => { if (results.length > 0) setOpen(true); }}
                    onBlur={() => setTimeout(() => setOpen(false), 200)} // Delay to allow click
                />
                {loading && (
                    <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                )}
            </div>

            {open && results.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden">
                    <div className="py-1">
                        {results.map((result) => (
                            <button
                                key={`${result.type}-${result.id}`}
                                className="w-full text-left px-4 py-2 hover:bg-accent flex items-center gap-3 transition-colors text-sm"
                                onClick={() => handleSelect(result)}
                            >
                                <div className="bg-muted p-1.5 rounded-full shrink-0">
                                    {result.type === 'employee' ? (
                                        <User className="h-4 w-4 text-muted-foreground" />
                                    ) : result.type === 'store' ? (
                                        <StoreIcon className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <ScrollText className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="overflow-hidden">
                                    <div className="font-medium text-foreground truncate">{result.name}</div>
                                    <div className="text-xs text-muted-foreground truncate">{result.subtext}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {open && results.length === 0 && query.length >= 2 && !loading && (
                <div className="absolute top-full mt-2 w-full bg-popover border border-border rounded-md shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
                    {t("search")} - No results
                </div>
            )}
        </div>
    );
}
