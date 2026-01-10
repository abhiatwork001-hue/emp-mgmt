import PusherServer from "pusher";
import PusherClient from "pusher-js";

export const pusherServer = new PusherServer({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    useTLS: true,
});

// Enhanced Pusher Client
const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

console.log('[Pusher Init] Key:', pusherKey, 'Cluster:', pusherCluster);

export const pusherClient = new PusherClient(pusherKey!, {
    cluster: pusherCluster!,
    forceTLS: true,
});

// Connection state monitoring
if (typeof window !== 'undefined') {
    pusherClient.connection.bind('connected', () => {
        console.log('✅ Pusher: Connected');
    });

    pusherClient.connection.bind('disconnected', () => {
        console.log('❌ Pusher: Disconnected');
    });

    pusherClient.connection.bind('failed', () => {
        console.log('❌ Pusher: Connection Failed');
    });

    pusherClient.connection.bind('unavailable', () => {
        console.log('⚠️ Pusher: Connection Unavailable');
    });

    pusherClient.connection.bind('error', (err: any) => {
        console.error('❌ Pusher: Connection Error', err);
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
