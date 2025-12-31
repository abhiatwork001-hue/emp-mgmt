"use client";

import { Bell, Monitor, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MobileSidebar } from "./sidebar";
import { NotificationBell } from "./notification-bell";
import { signOut, useSession } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";

import { ModeToggle } from "@/components/ui/mode-toggle";
import { GlobalSearch } from "@/components/global-search";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Breadcrumbs } from "./breadcrumbs";
import { ReportProblemDialog } from "@/components/dashboard/report-problem-dialog";

export function Header({
    userRole = "employee",
    departmentName = ""
}: {
    userRole?: string,
    departmentName?: string
}) {
    const { data: session } = useSession();
    const t = useTranslations("Common");
    const locale = useLocale();

    return (
        <div className="flex items-center justify-between p-4 px-8 border-b border-border/40 bg-background/60 backdrop-blur-md sticky top-0 z-40">
            <div className="flex items-center gap-4">
                <div className="md:hidden">
                    <MobileSidebar />
                </div>
                <div className="hidden md:block">
                    <Breadcrumbs userRole={userRole} departmentName={departmentName} />
                </div>
            </div>

            <div className="hidden md:flex flex-1 justify-center px-4 max-w-xl">
                <GlobalSearch locale={locale} />
            </div>

            <div className="flex justify-end items-center gap-x-4">
                <ModeToggle />
                <LanguageSwitcher />

                {/* Report Problem */}
                <ReportProblemDialog reporterId={(session?.user as any)?.id} />

                {/* Notifications */}
                <NotificationBell userId={(session?.user as any)?.id} />

                {/* User Profile */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={session?.user?.image || ""} alt="User" />
                                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                                    {session?.user?.name?.[0]?.toUpperCase() || "U"}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{session?.user?.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {session?.user?.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => signOut()}>
                            {t("logout")}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
