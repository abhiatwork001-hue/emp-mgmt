"use client";

import { Bell, Monitor, Globe, User, LogOut } from "lucide-react";
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
import { Link } from "@/i18n/routing";

import { ModeToggle } from "@/components/ui/mode-toggle";
import { GlobalSearch } from "@/components/global-search";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Breadcrumbs } from "./breadcrumbs";
import { ReportProblemDialog } from "@/components/dashboard/report-problem-dialog";
import { PushPermissionButton } from "@/components/pwa/push-permission-button";

export function Header({
    userRoles = ["employee"],
    departmentName = "",
    employee = null,
    translations = {},
    storeSlug = "",
    deptSlug = "",
    hasRecipes = true,
    hasCoverage = false
}: {
    userRoles?: string[],
    departmentName?: string,
    employee?: any,
    translations?: { [key: string]: string },
    storeSlug?: string,
    deptSlug?: string,
    hasRecipes?: boolean,
    hasCoverage?: boolean
}) {
    const { data: session } = useSession();
    const t = useTranslations("Common");
    const locale = useLocale();

    // Use employee image if available (source of truth from DB), fallback to session image
    const userImage = employee?.image || session?.user?.image || "";
    const userName = employee?.firstName ? `${employee.firstName} ${employee.lastName}` : session?.user?.name;
    const userEmail = employee?.email || session?.user?.email;

    return (
        <div className="flex items-center justify-between p-4 px-4 md:px-8 border-b border-border/40 bg-background/60 backdrop-blur-md sticky top-0 z-40">
            <div className="flex items-center gap-4">
                <div className="md:hidden">
                    <MobileSidebar
                        userRoles={userRoles}
                        departmentName={departmentName}
                        translations={translations}
                        storeSlug={storeSlug}
                        deptSlug={deptSlug}
                        hasRecipes={hasRecipes}
                        hasCoverage={hasCoverage}
                    />
                </div>
                <div className="hidden md:block">
                    <Breadcrumbs userRoles={userRoles} departmentName={departmentName} />
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

                {/* Push Notifications (All Users) */}
                <PushPermissionButton />

                {/* Notifications */}
                <NotificationBell userId={(session?.user as any)?.id} />

                {/* User Profile */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                            <Avatar className="h-8 w-8 ring-2 ring-primary/10 transition-all hover:ring-primary/30">
                                <AvatarImage src={userImage} alt="User" />
                                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                                    {userName?.[0]?.toUpperCase() || "U"}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 p-2 rounded-2xl shadow-xl border-border/40" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal p-3">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-bold leading-none">{userName}</p>
                                <p className="text-[10px] leading-none text-muted-foreground font-medium uppercase tracking-widest mt-1">
                                    {userEmail}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="opacity-50" />

                        <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5">
                            <Link href="/dashboard/profile" className="flex items-center w-full">
                                <User className="mr-3 h-4 w-4 text-primary" />
                                <span className="font-medium text-sm">{t("profile")}</span>
                            </Link>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="opacity-50" />

                        <DropdownMenuItem
                            onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
                            className="rounded-xl cursor-pointer py-2.5 text-destructive focus:text-destructive focus:bg-destructive/5"
                        >
                            <LogOut className="mr-3 h-4 w-4" />
                            <span className="font-medium text-sm">{t("logout")}</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
