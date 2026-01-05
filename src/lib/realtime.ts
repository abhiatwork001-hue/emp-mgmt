// src/lib/realtime.ts
// Simple wrapper for real‑time events using WebSocket (or SSE as fallback).
// The implementation uses the native WebSocket API to avoid extra dependencies.
// Export a singleton instance that can be used throughout the app.

export type RealtimeEvent = {
    type: string; // e.g., 'approval', 'schedule_update', 'reminder'
    payload: any;
};

class Realtime {
    private socket: WebSocket | null = null;
    private listeners: Map<string, ((payload: any) => void)[]> = new Map();

    constructor() {
        const url = process.env.NEXT_PUBLIC_REALTIME_URL || '';
        if (url) this.connect(url);
    }

    private connect(url: string) {
        this.socket = new WebSocket(url);
        this.socket.onmessage = (event) => {
            try {
                const data: RealtimeEvent = JSON.parse(event.data);
                const callbacks = this.listeners.get(data.type) ?? [];
                callbacks.forEach((cb) => cb(data.payload));
            } catch (e) {
                console.error('Realtime: failed to parse message', e);
            }
        };
        this.socket.onclose = () => {
            // Simple reconnection logic
            setTimeout(() => this.connect(url), 5000);
        };
    }

    public on(eventType: string, callback: (payload: any) => void) {
        const arr = this.listeners.get(eventType) ?? [];
        arr.push(callback);
        this.listeners.set(eventType, arr);
    }

    public off(eventType: string, callback: (payload: any) => void) {
        const arr = this.listeners.get(eventType) ?? [];
        this.listeners.set(eventType, arr.filter((cb) => cb !== callback));
    }

    public emit(event: RealtimeEvent) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(event));
        }
    }
}

export const realtime = new Realtime();
