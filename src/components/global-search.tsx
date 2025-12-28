"use client";

import * as React from "react";
import { Search, User, Store as StoreIcon, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { globalSearch, SearchResult } from "@/lib/actions/search.actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
// import { useDebounce } from "@/hooks/use-debounce"; 

// If we don't have a debounce hook, I'll just useEffect with setTimeout.

export function GlobalSearch() {
    const router = useRouter();
    const [query, setQuery] = React.useState("");
    const [open, setOpen] = React.useState(false);
    const [results, setResults] = React.useState<SearchResult[]>([]);
    const [loading, setLoading] = React.useState(false);

    // Debounce logic
    React.useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                setLoading(true);
                try {
                    const res = await globalSearch(query);
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
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                <Input
                    type="search"
                    placeholder="Search employees, stores..."
                    className="w-full bg-[#1e293b] pl-9 border-zinc-700 text-white focus:bg-[#0f172a] transition-colors"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => { if (results.length > 0) setOpen(true); }}
                    onBlur={() => setTimeout(() => setOpen(false), 200)} // Delay to allow click
                />
                {loading && (
                    <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-zinc-500" />
                )}
            </div>

            {open && results.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-[#1e293b] border border-zinc-700 rounded-md shadow-lg z-50 overflow-hidden">
                    <div className="py-1">
                        {results.map((result) => (
                            <button
                                key={`${result.type}-${result.id}`}
                                className="w-full text-left px-4 py-2 hover:bg-[#0f172a] flex items-center gap-3 transition-colors text-sm"
                                onClick={() => handleSelect(result)}
                            >
                                <div className="bg-zinc-800 p-1.5 rounded-full shrink-0">
                                    {result.type === 'employee' ? (
                                        <User className="h-4 w-4 text-zinc-400" />
                                    ) : (
                                        <StoreIcon className="h-4 w-4 text-zinc-400" />
                                    )}
                                </div>
                                <div className="overflow-hidden">
                                    <div className="font-medium text-white truncate">{result.name}</div>
                                    <div className="text-xs text-zinc-500 truncate">{result.subtext}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {open && results.length === 0 && query.length >= 2 && !loading && (
                <div className="absolute top-full mt-2 w-full bg-[#1e293b] border border-zinc-700 rounded-md shadow-lg z-50 p-4 text-center text-sm text-zinc-500">
                    No results found.
                </div>
            )}
        </div>
    );
}
