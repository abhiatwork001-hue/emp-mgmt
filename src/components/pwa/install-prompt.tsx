"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function PwaInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSPrompt, setShowIOSPrompt] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Check if already installed
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
            if (isStandalone) {
                setIsInstalled(true);
                return;
            }

            // Detect iOS
            const userAgent = window.navigator.userAgent.toLowerCase();
            const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
            setIsIOS(isIosDevice);

            if (isIosDevice && !isStandalone) {
                // Show prompt after a small delay for iOS users
                // logic: check if we have shown it recently to avoid annoyance? 
                // For now, show it once per session or use a simple dismissal state
                const hasDimissed = sessionStorage.getItem('pwa-ios-dismissed');
                if (!hasDimissed) {
                    setTimeout(() => setShowIOSPrompt(true), 3000);
                }
            }

            const handler = (e: any) => {
                e.preventDefault();
                setDeferredPrompt(e);
            };

            window.addEventListener('beforeinstallprompt', handler);
            window.addEventListener('appinstalled', () => {
                setIsInstalled(true);
                setDeferredPrompt(null);
                setShowIOSPrompt(false);
                toast.success("App installed successfully!");
            });

            return () => {
                window.removeEventListener('beforeinstallprompt', handler);
            };
        }
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    const dismissIOS = () => {
        setShowIOSPrompt(false);
        sessionStorage.setItem('pwa-ios-dismissed', 'true');
    };

    if (isInstalled) return null;

    // iOS Prompt
    if (showIOSPrompt && isIOS) {
        return (
            <div className="fixed bottom-0 left-0 right-0 z-[100] md:hidden p-4 animate-in slide-in-from-bottom-full duration-500">
                <div className="bg-background/95 backdrop-blur-md border border-border p-4 rounded-xl shadow-2xl flex flex-col gap-4 relative">
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={dismissIOS}>
                        <X className="h-4 w-4" />
                    </Button>
                    <div className="flex items-start gap-4">
                        <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                            <Share className="h-6 w-6 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-sm">Install for better experience</h3>
                            <p className="text-xs text-muted-foreground">
                                To install this app on your iPhone, tap the <span className="font-bold">Share</span> button below and select <span className="font-bold">"Add to Home Screen"</span>.
                            </p>
                        </div>
                    </div>
                    {/* Visual Arrow pointing down for Safari control bar hint */}
                    <div className="w-full flex justify-center pb-2">
                        <div className="animate-bounce">
                            <Share className="h-5 w-5 text-muted-foreground rotate-180" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Android/Desktop Prompt
    if (!deferredPrompt) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-50 md:hidden animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-primary text-primary-foreground p-4 rounded-xl shadow-lg flex items-center justify-between">
                <div className="text-sm font-medium">
                    <p className="font-bold">Install App</p>
                    <p className="opacity-90 text-xs">Add to Home Screen for best experience</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 px-2"
                        onClick={() => setDeferredPrompt(null)}
                    >
                        Later
                    </Button>
                    <Button
                        size="sm"
                        variant="secondary"
                        className="font-bold text-xs h-8"
                        onClick={handleInstall}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Install
                    </Button>
                </div>
            </div>
        </div>
    );
}
