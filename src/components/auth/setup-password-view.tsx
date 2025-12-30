"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { changePassword } from "@/lib/actions/employee.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, ShieldCheck, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export function SetupPasswordView() {
    const { data: session, update } = useSession();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 6) {
            return toast.error("Password must be at least 6 characters long");
        }

        if (password !== confirmPassword) {
            return toast.error("Passwords do not match");
        }

        setIsLoading(true);
        try {
            const userId = (session?.user as any)?.id;
            if (!userId) throw new Error("User ID not found");

            await changePassword(userId, password);

            // Update session
            await update({
                ...session,
                user: {
                    ...session?.user,
                    isPasswordChanged: true
                }
            });

            toast.success("Password secured successfully!");
            // Force hard redirect to ensure Layout re-evaluates server-side session/cookies
            // and clears any stale Router cache.
            window.location.href = "/dashboard";
        } catch (error) {
            console.error(error);
            toast.error("Failed to update password.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh] w-full">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <Card className="glass-card border-primary/20 shadow-2xl overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-primary via-blue-500 to-primary" />
                    <CardHeader className="space-y-1 pt-8">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
                                <ShieldCheck className="h-8 w-8 text-primary" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold text-center tracking-tight">Secure Your Account</CardTitle>
                        <CardDescription className="text-center text-muted-foreground">
                            Please set a permanent password for your access to the dashboard.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 pb-8">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="password">New Password</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Min 6 characters"
                                        className="pl-10 bg-background/50 border-input transition-all focus:ring-2 focus:ring-primary/20"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="Repeat your password"
                                        className="pl-10 bg-background/50 border-input transition-all focus:ring-2 focus:ring-primary/20"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <Button
                                type="submit"
                                className="w-full h-11 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                                disabled={isLoading}
                            >
                                {isLoading ? "Updating..." : (
                                    <span className="flex items-center gap-2">
                                        Secure Account <ArrowRight className="h-4 w-4" />
                                    </span>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
