"use client";

import React, { useEffect, useRef, useState, ReactNode } from "react";
import { Responsive } from "react-grid-layout";

interface DashboardGridWrapperProps {
    children: ReactNode;
    [key: string]: any;
}

export default function DashboardGridWrapper({ children, ...props }: DashboardGridWrapperProps) {
    const [width, setWidth] = useState(1200);
    const containerRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setWidth(containerRef.current.offsetWidth);
                setMounted(true);
            }
        };

        // Initial measure
        updateWidth();

        // Use ResizeObserver for more robust resizing
        const resizeObserver = new ResizeObserver(() => {
            updateWidth();
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    // Avoid hydration mismatch by rendering simpler structure or null initially if needed,
    // but since we are lazy loading this whole component with ssr: false, it shouldn't matter.
    // We pass width to Responsive component

    return (
        <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
            {mounted && (
                <Responsive {...props} width={width}>
                    {children}
                </Responsive>
            )}
        </div>
    );
}
