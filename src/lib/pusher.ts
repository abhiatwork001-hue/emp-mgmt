import PusherServer from "pusher";
import PusherClient from "pusher-js";

export const pusherServer = new PusherServer({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    useTLS: true,
});

// Enhanced Pusher Client with error handling
export const pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    enabledTransports: ['ws', 'wss'], // WebSocket only for better reliability
    forceTLS: true,
});

// Connection state monitoring
if (typeof window !== 'undefined') {
    pusherClient.connection.bind('connected', () => {
        console.log('✅ Pusher connected');
    });

    pusherClient.connection.bind('disconnected', () => {
        console.warn('⚠️ Pusher disconnected');
    });

    pusherClient.connection.bind('failed', () => {
        console.error('❌ Pusher connection failed');
    });

    pusherClient.connection.bind('unavailable', () => {
        console.error('❌ Pusher unavailable');
    });

    pusherClient.connection.bind('error', (err: any) => {
        console.error('❌ Pusher error:', err);
    });
}

// Helper to check if Pusher is connected
export const isPusherConnected = () => {
    return pusherClient.connection.state === 'connected';
};

// Helper to get connection state
export const getPusherState = () => {
    return pusherClient.connection.state;
};
