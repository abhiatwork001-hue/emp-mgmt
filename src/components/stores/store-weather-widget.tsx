"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, CloudRain, Sun, CloudSnow, Wind, Droplets } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface WeatherWidgetProps {
    weather?: {
        temp: number;
        feelsLike: number;
        condition: string;
        description?: string;
        icon: string;
        humidity?: number;
        windSpeed?: number;
        lastUpdated: Date;
    };
    storeName?: string;
    compact?: boolean;
}

export function StoreWeatherWidget({ weather, storeName, compact = false }: WeatherWidgetProps) {
    const t = useTranslations("Weather");

    if (!weather) {
        return null;
    }

    const getWeatherIcon = (condition: string) => {
        const iconClass = "h-8 w-8";
        switch (condition.toLowerCase()) {
            case 'clear':
                return <Sun className={cn(iconClass, "text-yellow-500")} />;
            case 'clouds':
                return <Cloud className={cn(iconClass, "text-gray-400")} />;
            case 'rain':
            case 'drizzle':
                return <CloudRain className={cn(iconClass, "text-blue-500")} />;
            case 'snow':
                return <CloudSnow className={cn(iconClass, "text-blue-200")} />;
            default:
                return <Cloud className={cn(iconClass, "text-gray-400")} />;
        }
    };

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                {getWeatherIcon(weather.condition)}
                <div>
                    <p className="text-lg font-bold">{weather.temp}°C</p>
                    <p className="text-xs text-muted-foreground">{t(weather.condition.toLowerCase())}</p>
                </div>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">{t("title")}</CardTitle>
                {storeName && (
                    <p className="text-xs text-muted-foreground">{storeName}</p>
                )}
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {getWeatherIcon(weather.condition)}
                        <div>
                            <p className="text-3xl font-bold">{weather.temp}°C</p>
                            <p className="text-sm text-muted-foreground capitalize">{t(weather.condition.toLowerCase())}</p>
                        </div>
                    </div>
                    <div className="text-right space-y-1">
                        <p className="text-xs text-muted-foreground">
                            {t("feelsLike")} {weather.feelsLike}°C
                        </p>
                        {weather.humidity && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground" title={t("humidity")}>
                                <Droplets className="h-3 w-3" />
                                {weather.humidity}%
                            </div>
                        )}
                        {weather.windSpeed && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground" title={t("wind")}>
                                <Wind className="h-3 w-3" />
                                {weather.windSpeed} km/h
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
