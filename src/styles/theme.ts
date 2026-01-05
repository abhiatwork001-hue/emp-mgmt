// src/styles/theme.ts
// Centralized design tokens for colors, spacing, and other UI variables
// These values are referenced throughout the UI components via Tailwind utility classes or CSS variables.

export const colors = {
    primary: "#10b981", // emerald-500
    primaryHover: "#06b46c",
    warning: "#f59e0b", // amber-500
    warningHover: "#d97706",
    critical: "#ef4444", // red-500 (destructive)
    criticalHover: "#dc2626",
    background: "#f8fafc", // neutral background
    foreground: "#1f2937", // neutral foreground
    muted: "#e5e7eb",
    border: "#d1d5db",
};

export const spacing = {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
};

export const radii = {
    sm: "0.25rem",
    md: "0.5rem",
    lg: "0.75rem",
    full: "9999px",
};
