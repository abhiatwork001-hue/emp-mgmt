"use client";

import * as React from "react";
import { Check, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter, usePathname } from "@/i18n/routing";
import { useLocale } from "next-intl";

const languages = [
    { label: "English", value: "en", flag: "🇬🇧" },
    { label: "Português", value: "pt", flag: "🇵🇹" },
    { label: "Deutsch", value: "de", flag: "🇩🇪" },
];

export function LanguageSwitcher() {
    const router = useRouter();
    const pathname = usePathname();
    const currentLocale = useLocale();

    const onSelect = (value: string) => {
        router.replace(pathname, { locale: value });
    };

    const currentLang = languages.find((lang) => lang.value === currentLocale);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 px-2 hover:bg-accent"
                >
                    <span className="text-xl">{currentLang?.flag}</span>
                    <span className="hidden sm:inline-block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {currentLocale}
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {languages.map((lang) => (
                    <DropdownMenuItem
                        key={lang.value}
                        onClick={() => onSelect(lang.value)}
                        className="flex items-center gap-2 cursor-pointer"
                    >
                        <span className="text-xl">{lang.flag}</span>
                        <span className="flex-1 text-sm">{lang.label}</span>
                        {currentLocale === lang.value && (
                            <Check className="h-4 w-4 ml-auto" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
