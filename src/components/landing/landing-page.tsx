"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, MessageSquare, ShieldCheck, Users, Clock, Sparkles } from "lucide-react";

export function LandingPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 overflow-hidden relative">
            {/* Background Blobs */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-400/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[100px]" />

            {/* Navbar */}
            <nav className="flex items-center justify-between px-6 py-6 md:px-20 relative z-10 glass-card mx-4 mt-4 rounded-2xl border-white/20">
                <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-br from-primary to-purple-600 p-2 rounded-lg">
                        <Users className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                        Chick
                    </span>
                </div>
                <div className="flex gap-4">
                    <Link href="/login">
                        <Button variant="ghost" className="hidden md:flex">Sign In</Button>
                    </Link>
                    <Link href="/login">
                        <Button className="shadow-lg shadow-primary/20">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Button>
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="container mx-auto px-6 pt-20 pb-32 relative z-10">
                <div className="text-center max-w-4xl mx-auto space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <span className="px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium inline-block mb-6">
                            Next-Gen Workforce Management
                        </span>
                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1]">
                            Manage your team with <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-gradient-x">
                                style and precision
                            </span>
                        </h1>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-xl text-muted-foreground max-w-2xl mx-auto"
                    >
                        Everything you need to run your restaurant or retail business. Scheduling, Time Tracking, Real-time Chat, and HR Management in one beautiful dashboard.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
                    >
                        <Link href="/login">
                            <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
                                Launch Dashboard
                            </Button>
                        </Link>
                        <Link href="https://github.com/yourusername/chick" target="_blank">
                            <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-2 hover:bg-muted/50">
                                View on GitHub
                            </Button>
                        </Link>
                    </motion.div>

                    {/* Feature Grid */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.4 }}
                        className="grid md:grid-cols-3 gap-6 pt-20 text-left"
                    >
                        <Card icon={<Calendar className="h-6 w-6 text-blue-500" />} title="Smart Scheduling" description="Drag-and-drop shift planner with conflict detection and automated availability matching." />
                        <Card icon={<MessageSquare className="h-6 w-6 text-purple-500" />} title="Team Chat" description="Real-time messaging, group chats, and announcements to keep everyone aligned." />
                        <Card icon={<ShieldCheck className="h-6 w-6 text-emerald-500" />} title="Role-Based Security" description="Granular access controls for Owners, Managers, and Staff to protect sensitive data." />
                    </motion.div>
                </div>
            </main>

            {/* Visual Footer */}
            <div className="border-t border-border/40 bg-background/50 backdrop-blur-sm py-12">
                <div className="container mx-auto px-6 text-center text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} Chick App. Built with ❤️ for modern teams.</p>
                </div>
            </div>
        </div>
    );
}

function Card({ icon, title, description }: { icon: any, title: string, description: string }) {
    return (
        <div className="p-6 rounded-2xl bg-white/40 dark:bg-black/20 border border-white/20 backdrop-blur-md shadow-sm hover:shadow-md transition-all hover:bg-white/60 dark:hover:bg-white/5 group">
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-2 text-foreground">{title}</h3>
            <p className="text-muted-foreground leading-relaxed">{description}</p>
        </div>
    );
}
