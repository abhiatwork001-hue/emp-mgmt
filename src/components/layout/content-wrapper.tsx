"use client";

import { usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { BottomNavSpacer } from "./bottom-nav";

interface ContentWrapperProps {
    children: React.ReactNode;
}

export function ContentWrapper({ children }: ContentWrapperProps) {
    const pathname = usePathname();
    const isMessagePage = pathname.includes("/dashboard/messages/");

    return (
        <div className={cn(
            "flex-1 min-w-0 overflow-hidden relative",
            isMessagePage ? "px-0 pb-0" : "flex-1 overflow-y-auto px-4 md:px-8 pb-8"
        )}>
            {children}
            {!isMessagePage && <BottomNavSpacer />}
        </div>
    );
}
