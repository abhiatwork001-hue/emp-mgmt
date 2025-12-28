"use client";

import { motion, AnimatePresence } from "framer-motion";
import React from "react";

interface AnimationProps {
    children: React.ReactNode;
    delay?: number;
    duration?: number;
    y?: number;
    x?: number;
    scale?: number;
    className?: string;
}

export const FadeIn = ({ children, delay = 0, duration = 0.5, y = 20, className }: AnimationProps) => (
    <motion.div
        initial={{ opacity: 0, y }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration, ease: "easeOut" }}
        className={className}
    >
        {children}
    </motion.div>
);

export const FadeInRight = ({ children, delay = 0, duration = 0.5, x = 20, className }: AnimationProps) => (
    <motion.div
        initial={{ opacity: 0, x }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay, duration, ease: "easeOut" }}
        className={className}
    >
        {children}
    </motion.div>
);

export const ScaleIn = ({ children, delay = 0, duration = 0.4, scale = 0.98, className }: AnimationProps) => (
    <motion.div
        initial={{ opacity: 0, scale }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay, duration, ease: "easeOut" }}
        className={className}
    >
        {children}
    </motion.div>
);

export { AnimatePresence };
