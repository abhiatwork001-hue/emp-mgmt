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

import { ModeToggle } from "@/components/ui/mode-toggle";
import { GlobalSearch } from "@/components/global-search";

export function Header() {
    const { data: session } = useSession();

    return (
        <div className="flex items-center p-4">
            <MobileSidebar />

            <div className="flex-1 flex justify-center px-4">
                <GlobalSearch />
            </div>

            <div className="flex justify-end items-center gap-x-4">
                <ModeToggle />
                {/* Language Switcher Mock */}
                <Button variant="ghost" size="icon">
                    <span className="text-xl">🇬🇧</span>
                </Button>

                {/* Notifications */}
                <NotificationBell userId={(session?.user as any)?.id} />

                {/* User Profile */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={session?.user?.image || ""} alt="User" />
                                <AvatarFallback className="bg-amber-600 text-white font-bold">
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
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
