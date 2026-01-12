"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { NextIntlClientProvider, AbstractIntlMessages } from "next-intl";
import { NativeNotificationListener } from "@/components/native-notification-listener";

export function Providers({
    children,
    messages,
    locale,
    session
}: {
    children: React.ReactNode;
    messages: AbstractIntlMessages;
    locale: string;
    session: any;
}) {
    return (
        <NextIntlClientProvider messages={messages} locale={locale} timeZone="Europe/Lisbon">
            <SessionProvider session={session}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem={true}
                    disableTransitionOnChange
                >
                    <NativeNotificationListener />
                    {children}
                </ThemeProvider>
            </SessionProvider>
        </NextIntlClientProvider>
    );
}
