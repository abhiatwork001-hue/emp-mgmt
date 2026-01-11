"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, PartyPopper, Heart, Gift } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

interface Holiday {
    name: string;
    message: string;
    icon: React.ReactNode;
    gradient: string;
    date: Date;
}

export function HolidayGreetingWidget() {
    const [currentHoliday, setCurrentHoliday] = useState<Holiday | null>(null);
    const t = useTranslations("Dashboard.widgets.holidays");

    useEffect(() => {
        const checkHoliday = () => {
            const now = new Date();
            const month = now.getMonth(); // 0-11
            const day = now.getDate();

            const holidays: Holiday[] = [
                // New Year's Eve
                {
                    name: t('newYearsEve.name'),
                    message: t('newYearsEve.message'),
                    icon: <PartyPopper className="h-6 w-6" />,
                    gradient: "from-purple-500 via-pink-500 to-yellow-500",
                    date: new Date(now.getFullYear(), 11, 31) // Dec 31
                },
                // New Year's Day
                {
                    name: t('newYearsDay.name'),
                    message: t('newYearsDay.message'),
                    icon: <Sparkles className="h-6 w-6" />,
                    gradient: "from-blue-500 via-purple-500 to-pink-500",
                    date: new Date(now.getFullYear(), 0, 1) // Jan 1
                },
                // Christmas Eve
                {
                    name: t('christmasEve.name'),
                    message: t('christmasEve.message'),
                    icon: <Gift className="h-6 w-6" />,
                    gradient: "from-red-500 via-green-500 to-red-600",
                    date: new Date(now.getFullYear(), 11, 24) // Dec 24
                },
                // Christmas Day
                {
                    name: t('christmasDay.name'),
                    message: t('christmasDay.message'),
                    icon: <Gift className="h-6 w-6" />,
                    gradient: "from-green-600 via-red-500 to-green-600",
                    date: new Date(now.getFullYear(), 11, 25) // Dec 25
                },
                // Valentine's Day
                {
                    name: t('valentinesDay.name'),
                    message: t('valentinesDay.message'),
                    icon: <Heart className="h-6 w-6" />,
                    gradient: "from-pink-400 via-red-400 to-pink-500",
                    date: new Date(now.getFullYear(), 1, 14) // Feb 14
                },
                // Easter (approximate - 2025: April 20)
                {
                    name: t('easter.name'),
                    message: t('easter.message'),
                    icon: <Sparkles className="h-6 w-6" />,
                    gradient: "from-yellow-400 via-pink-300 to-purple-400",
                    date: new Date(2025, 3, 20) // April 20, 2025
                },
                // Halloween
                {
                    name: t('halloween.name'),
                    message: t('halloween.message'),
                    icon: <PartyPopper className="h-6 w-6" />,
                    gradient: "from-orange-500 via-purple-600 to-black",
                    date: new Date(now.getFullYear(), 9, 31) // Oct 31
                },
            ];

            // Check if today matches any holiday
            const todayHoliday = holidays.find(h =>
                h.date.getMonth() === month && h.date.getDate() === day
            );

            setCurrentHoliday(todayHoliday || null);
        };

        checkHoliday();
        // Check every hour in case the day changes
        const interval = setInterval(checkHoliday, 3600000);
        return () => clearInterval(interval);
    }, []);

    if (!currentHoliday) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
            >
                <Card className={`relative overflow-hidden border-0 shadow-2xl`}>
                    {/* Animated gradient background */}
                    <div className={`absolute inset-0 bg-gradient-to-r ${currentHoliday.gradient} opacity-90`} />

                    {/* Sparkle effects */}
                    <div className="absolute inset-0 overflow-hidden">
                        {[...Array(20)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-1 h-1 bg-white rounded-full"
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    top: `${Math.random() * 100}%`,
                                }}
                                animate={{
                                    opacity: [0, 1, 0],
                                    scale: [0, 1.5, 0],
                                }}
                                transition={{
                                    duration: 2 + Math.random() * 2,
                                    repeat: Infinity,
                                    delay: Math.random() * 2,
                                }}
                            />
                        ))}
                    </div>

                    <CardContent className="relative z-10 p-6">
                        <div className="flex items-center gap-4">
                            <motion.div
                                animate={{
                                    rotate: [0, 10, -10, 10, 0],
                                    scale: [1, 1.1, 1, 1.1, 1],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                                className="text-white"
                            >
                                {currentHoliday.icon}
                            </motion.div>
                            <div className="flex-1">
                                <h3 className="text-lg font-black text-white mb-1 tracking-tight">
                                    {currentHoliday.name}
                                </h3>
                                <p className="text-sm text-white/95 font-medium leading-relaxed">
                                    {currentHoliday.message}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </AnimatePresence>
    );
}
