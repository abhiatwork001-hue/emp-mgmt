"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { NextIntlClientProvider, AbstractIntlMessages } from "next-intl";

export function Providers({
    children,
    messages,
    locale
}: {
    children: React.ReactNode;
    messages: AbstractIntlMessages;
    locale: string;
}) {
    return (
        <NextIntlClientProvider messages={messages} locale={locale} timeZone="Europe/Lisbon">
            <SessionProvider>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem={true}
                    disableTransitionOnChange
                >
                    {children}
                </ThemeProvider>
            </SessionProvider>
        </NextIntlClientProvider>
    );
}
