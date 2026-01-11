"use client";

import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { toast } from "sonner";
import { saveNativePushToken } from "@/lib/actions/notification.actions";

export function NativeNotificationListener() {
    useEffect(() => {
        // Only run on native platforms
        if (!Capacitor.isNativePlatform()) return;

        const registerNotifications = async () => {
            let permStatus = await PushNotifications.checkPermissions();

            if (permStatus.receive === 'prompt') {
                permStatus = await PushNotifications.requestPermissions();
            }

            if (permStatus.receive !== 'granted') {
                console.warn("Push notification permission denied");
                return;
            }

            await PushNotifications.register();
        };

        const addListeners = async () => {
            await PushNotifications.removeAllListeners();

            // Registration successful -> Send token to backend
            await PushNotifications.addListener('registration', async token => {
                // Send native token to backend
                try {
                    await saveNativePushToken(token.value);
                    console.log('Push registration success, token saved');
                } catch (err) {
                    console.error("Failed to save native token", err);
                }
            });

            // Registration error
            await PushNotifications.addListener('registrationError', err => {
                console.error('Push registration failed: ', err.error);
            });

            // Incoming notification while app is open
            await PushNotifications.addListener('pushNotificationReceived', notification => {
                console.log('Push received: ', notification);
                toast.info(notification.title || "New Notification", {
                    description: notification.body
                });
            });

            // User tapped notification
            await PushNotifications.addListener('pushNotificationActionPerformed', notification => {
                console.log('Push action performed: ', notification);
                // Navigate to specific page if needed
                // const data = notification.notification.data;
                // if (data.url) router.push(data.url); 
            });
        };

        registerNotifications();
        addListeners();

    }, []);

    return null; // Logic only component
}


