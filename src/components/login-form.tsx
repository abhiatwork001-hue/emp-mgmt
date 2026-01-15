"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter as useNextRouter } from "next/navigation";
import { useRouter } from "@/i18n/routing"; // Locale-aware router
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Mail, Lock, ArrowRight, ChevronLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { requestPasswordReset } from "@/lib/actions/employee.actions";
import { useParams } from "next/navigation";
import { cn, DASHBOARD_URL } from "@/lib/utils";
import { useTranslations } from 'next-intl';

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
    const t = useTranslations('Login');
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [view, setView] = useState<"login" | "forgot">("login");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter(); // Locale-aware router
    const params = useParams();
    const locale = params?.locale as string || "en";

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const result = await signIn("credentials", {
                redirect: false,
                email,
                password,
            });

            if (result?.error) {
                setError(t('invalidCredentials'));
                toast.error(t('loginFailed'));
            } else {
                toast.success(t('welcome'));

                // Construct explicit localized path for maximum reliability
                const targetPath = `/${locale}${DASHBOARD_URL}`;

                // Use a short delay to allow the toast to be seen and session to settle
                setTimeout(() => {
                    window.location.href = targetPath;
                }, 500);
            }
        } catch (err) {
            setError("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgot = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return toast.error(t('enterEmail'));

        setIsLoading(true);
        try {
            await requestPasswordReset(email);
            toast.success(t('resetSent'));
            setView("login");
        } catch (err: any) {
            toast.error(err.message || "Failed to request reset");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card className="glass-card premium-shadow-2xl border-white/5 overflow-hidden backdrop-blur-[40px] bg-background/20 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]">
                <div className="pt-12 flex flex-col items-center">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="relative w-72 h-32 mb-4 group"
                    >
                        <div className="absolute inset-0 bg-primary/10 rounded-3xl blur-2xl group-hover:bg-primary/20 transition-colors duration-500" />
                        <div className="relative w-full h-full p-2 transition-transform duration-500 hover:scale-105">
                            <Image
                                src="/logo_chickinho.png"
                                alt="Chickinho Logo"
                                fill
                                className="object-contain drop-shadow-2xl"
                                priority
                            />
                        </div>
                    </motion.div>
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="text-center"
                    >
                        <h1 className="text-4xl font-black tracking-tighter text-foreground mb-1">
                            CHICKINHO<span className="font-light opacity-60">GLOBAL</span>
                        </h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/60">INTELLIGENT OPERATIONS CENTER</p>
                    </motion.div>
                </div>

                <CardHeader className="text-center pt-10 pb-6">
                    <CardTitle className="text-lg font-black tracking-tight uppercase">
                        {view === "login" ? t('title') : t('titleRecovery')}
                    </CardTitle>
                    <CardDescription className="text-xs font-medium px-4">
                        {view === "login"
                            ? t('subtitle')
                            : t('subtitleRecovery')
                        }
                    </CardDescription>
                </CardHeader>

                <AnimatePresence mode="wait">
                    {view === "login" ? (
                        <motion.div
                            key="login"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                        >
                            <form onSubmit={handleLogin}>
                                <CardContent className="space-y-6 px-8">
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t('emailLabel')}</Label>
                                        <div className="relative group flex items-center">
                                            <Mail className="absolute left-5 h-4 w-4 text-muted-foreground group-focus-within:text-primary group-focus-within:opacity-0 transition-opacity z-20 pointer-events-none" />
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder={t('emailPlaceholder')}
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="pl-14 focus:pl-6 bg-white/5 border-white/5 text-foreground focus:ring-primary/20 focus:border-primary/40 h-14 rounded-2xl transition-all relative z-10"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between ml-1">
                                            <Label htmlFor="password" title="Password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('credentials')}</Label>
                                            <button
                                                type="button"
                                                onClick={() => setView("forgot")}
                                                className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
                                            >
                                                {t('recover')}
                                            </button>
                                        </div>
                                        <div className="relative group flex items-center">
                                            <Lock className="absolute left-5 h-4 w-4 text-muted-foreground group-focus-within:text-primary group-focus-within:opacity-0 transition-all z-20 pointer-events-none" />
                                            <Input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="pl-14 pr-12 focus:pl-6 bg-white/5 border-white/5 text-foreground focus:ring-primary/20 focus:border-primary/40 h-14 rounded-2xl transition-all relative z-10"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-5 z-20 text-muted-foreground hover:text-foreground transition-colors"
                                                tabIndex={-1}
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-3 ml-1">
                                        <Checkbox id="remember" className="border-white/20 data-[state=checked]:bg-primary rounded-md h-5 w-5" />
                                        <label htmlFor="remember" className="text-[11px] font-bold text-muted-foreground/80 cursor-pointer select-none">
                                            {t('remember')}
                                        </label>
                                    </div>

                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="text-destructive text-[10px] font-black uppercase tracking-wider bg-destructive/10 p-3 rounded-xl border border-destructive/20 text-center"
                                        >
                                            {error}
                                        </motion.div>
                                    )}
                                </CardContent>
                                <CardFooter className="pb-12 pt-6 px-8">
                                    <Button
                                        type="submit"
                                        className="w-full h-14 text-xs font-black uppercase tracking-[0.2em] bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-xl hover:shadow-primary/20 rounded-2xl"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                            <span className="flex items-center gap-3">{t('authorize')} <ArrowRight className="h-4 w-4" /></span>
                                        )}
                                    </Button>
                                </CardFooter>
                            </form>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="forgot"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                        >
                            <form onSubmit={handleForgot}>
                                <CardContent className="space-y-6 px-8">
                                    <div className="space-y-2">
                                        <Label htmlFor="forgot-email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t('recoveryTarget')}</Label>
                                        <div className="relative group flex items-center">
                                            <Mail className="absolute left-5 h-4 w-4 text-muted-foreground group-focus-within:text-primary group-focus-within:opacity-0 transition-all z-20 pointer-events-none" />
                                            <Input
                                                id="forgot-email"
                                                type="email"
                                                placeholder={t('enterRegistered')}
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="pl-14 focus:pl-6 bg-white/5 border-white/5 text-foreground h-14 rounded-2xl transition-all relative z-10"
                                                required
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex flex-col gap-4 pb-12 pt-6 px-8">
                                    <Button type="submit" className="w-full h-14 bg-foreground text-background hover:bg-foreground/90 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl" disabled={isLoading}>
                                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : t('signalHR')}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground hover:bg-transparent"
                                        onClick={() => setView("login")}
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-2" /> {t('dismiss')}
                                    </Button>
                                </CardFooter>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>

            {/* System Stats / Subtle Footer */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-center"
            >
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground/30">{t('version')}</p>
            </motion.div>
        </div>
    );
}
