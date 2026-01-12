"use server";

import dbConnect from "@/lib/db";
import { Store } from "@/lib/models";
import { checkApiLimit, trackApiUsage } from "@/lib/actions/api-usage.actions";

/**
 * Get weather data for a store using its address
 * Uses OpenWeatherMap API
 */
export async function getStoreWeather(storeId: string) {
    try {
        await dbConnect();

        const store = await Store.findById(storeId).select('address name weatherCache');
        if (!store || !store.address) {
            return { success: false, message: "Store or address not found" };
        }

        const apiKey = process.env.OPENWEATHER_API_KEY;
        if (!apiKey) {
            return { success: false, message: "OpenWeather API key not configured" };
        }

        // Check cache (refresh if older than 30 minutes)
        if (store.weatherCache && store.weatherCache.lastUpdated) {
            const cacheAge = Date.now() - new Date(store.weatherCache.lastUpdated).getTime();
            const thirtyMinutes = 30 * 60 * 1000;

            if (cacheAge < thirtyMinutes) {

                return JSON.parse(JSON.stringify({
                    success: true,
                    cached: true,
                    weather: store.weatherCache
                }));
            }
        }


        const limitCheck = await checkApiLimit("openweather", 1000);
        if (!limitCheck.allowed) {
            return { success: false, message: "Daily weather API limit reached" };
        }



        // Step 1: Geocode the address
        let geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(store.address)}&limit=1&appid=${apiKey}`;
        let geocodeResponse = await fetch(geocodeUrl);
        await trackApiUsage("openweather", 0); // Count geocoding call
        let geocodeData = await geocodeResponse.json();

        // Fallback: If full address fails, try simpler versions (e.g., City, Country)
        if (!Array.isArray(geocodeData) || geocodeData.length === 0) {


            const addressParts = store.address.split(',');
            if (addressParts.length >= 2) {
                // Try last two parts (e.g., "1600-302 Lisboa, Portugal")
                let fallbackAddress = addressParts.slice(-2).join(',').trim();

                // Further simplify: remove postal codes like 1600-302
                fallbackAddress = fallbackAddress.replace(/\d{4}-\d{3}\s+/g, '');


                geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(fallbackAddress)}&limit=1&appid=${apiKey}`;
                geocodeResponse = await fetch(geocodeUrl);
                await trackApiUsage("openweather", 0);
                geocodeData = await geocodeResponse.json();
            }
        }

        if (!Array.isArray(geocodeData) || geocodeData.length === 0) {

            return { success: false, message: "Could not geocode address" };
        }

        const { lat, lon } = geocodeData[0];

        // Step 2: Get weather data
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
        const weatherResponse = await fetch(weatherUrl, { next: { revalidate: 1800 } }); // Cache for 30 min
        const weatherData = await weatherResponse.json();

        if (weatherData.cod !== 200) {
            return { success: false, message: "Weather API error" };
        }

        // Process weather data
        const weather = {
            temp: Math.round(weatherData.main.temp),
            feelsLike: Math.round(weatherData.main.feels_like),
            condition: weatherData.weather[0].main,
            description: weatherData.weather[0].description,
            icon: weatherData.weather[0].icon,
            humidity: weatherData.main.humidity,
            windSpeed: Math.round(weatherData.wind.speed * 3.6), // Convert m/s to km/h
            lastUpdated: new Date()
        };

        // Update cache
        store.weatherCache = weather;
        await store.save();



        return JSON.parse(JSON.stringify({
            success: true,
            cached: false,
            weather
        }));

    } catch (error: any) {
        console.error("Get Store Weather Error:", error);
        return { success: false, message: error.message };
    }
}

/**
 * Get weather for all stores
 */
export async function getAllStoresWeather() {
    try {
        await dbConnect();
        const stores = await Store.find({ active: true, address: { $exists: true, $ne: null } });

        const results = [];
        for (const store of stores) {
            const result = await getStoreWeather(store._id.toString());
            results.push({
                storeId: store._id,
                storeName: store.name,
                ...result
            });
        }

        return { success: true, results };
    } catch (error: any) {
        console.error("Get All Stores Weather Error:", error);
        return { success: false, message: error.message };
    }
}
