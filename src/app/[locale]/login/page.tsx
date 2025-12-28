"use client";

import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
    return (
        <div className="relative flex min-h-svh w-full items-center justify-center p-6 md:p-10 overflow-hidden bg-background">
            {/* Premium Mesh Background */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
            </div>

            <div className="z-10 w-full max-w-sm">
                <LoginForm />
            </div>
        </div>
    );
}
