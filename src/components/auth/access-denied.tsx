"use client";

import { ShieldAlert, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/routing";

export function AccessDenied() {
    const router = useRouter();

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-in fade-in zoom-in duration-500">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-destructive/10 blur-3xl rounded-full scale-150" />
                <div className="relative bg-background border-2 border-destructive/20 p-6 rounded-3xl shadow-2xl">
                    <ShieldAlert className="h-16 w-16 text-destructive animate-pulse" />
                </div>
            </div>

            <h1 className="text-4xl font-black tracking-tight mb-4 bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent">
                Access Restricted
            </h1>

            <p className="text-muted-foreground max-w-md mb-10 text-lg leading-relaxed">
                Your current role does not have the necessary permissions to view this secure area.
                If you believe this is an error, please contact your system administrator.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
                <Button
                    variant="outline"
                    size="lg"
                    className="rounded-full px-8 border-primary/20 hover:bg-primary/5 group"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Go Back
                </Button>

                <Button
                    variant="default"
                    size="lg"
                    className="rounded-full px-8 shadow-lg shadow-primary/20"
                    onClick={() => router.push("/dashboard")}
                >
                    <Home className="mr-2 h-4 w-4" />
                    Return Home
                </Button>
            </div>

            <div className="mt-16 pt-8 border-t border-dashed w-full max-w-xs">
                <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground/30 font-bold">
                    <div className="h-1 w-1 rounded-full bg-destructive/30" />
                    Security Enforced by Chickinho OS
                    <div className="h-1 w-1 rounded-full bg-destructive/30" />
                </div>
            </div>
        </div>
    );
}
