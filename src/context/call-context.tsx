"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import Peer from "peerjs";
import { useSession } from "next-auth/react";
import { Phone, Video, PhoneOff, Mic, MicOff, VideoOff, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CallContextType {
    startCall: (recipientId: string, recipientName: string, recipientImage: string, isVideo: boolean) => void;
    activeCall: ActiveCall | null;
    endCall: () => void;
}

interface ActiveCall {
    peerId: string;
    isIncoming: boolean;
    stream?: MediaStream;
    remoteStream?: MediaStream;
    name: string;
    image: string;
    isVideo: boolean;
    status: 'ringing' | 'connected' | 'ended' | 'calling';
}

const CallContext = createContext<CallContextType | null>(null);

export function CallProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const [myPeer, setMyPeer] = useState<Peer | null>(null);
    const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isDebug, setIsDebug] = useState(false); // Enable for debugging
    const [isCameraOff, setIsCameraOff] = useState(false);

    // Refs for media elements
    const myVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const connectionRef = useRef<any>(null);
    const peerRef = useRef<Peer | null>(null);

    const LOG = (msg: string) => {
        if (isDebug) console.log(`[CallDebug] ${msg}`);
    };

    const [retryTrigger, setRetryTrigger] = useState(0);

    // Initialize PeerJS
    useEffect(() => {
        if (!session?.user) return;

        // Use user ID as Peer ID
        const peerId = (session.user as any).id;

        // Prevent double-init in Strict Mode or rapid updates (unless forcing retry)
        if (peerRef.current && peerRef.current.id === peerId && !peerRef.current.disconnected && !peerRef.current.destroyed) {
            LOG(`PeerJS already initialized with ID: ${peerId}. Skipping re-initialization.`);
            return;
        }

        // Cleanup function for previous instance if it exists
        if (peerRef.current) {
            LOG(`Destroying previous PeerJS instance with ID: ${peerRef.current.id}`);
            peerRef.current.destroy();
            peerRef.current = null;
        }

        LOG(`Initializing PeerJS with ID: ${peerId} (Attempt ${retryTrigger + 1})`);

        const peer = new Peer(peerId, {
            // Using PeerJS cloud server (free tier)
            debug: 1,
        });

        peer.on('open', (id) => {
            LOG(`My peer ID is: ${id}`);
            setMyPeer(peer); // Update state for components that depend on myPeer
            peerRef.current = peer; // Store in ref for lifecycle management
        });

        peer.on('call', async (incomingCall) => {
            LOG("Receiving incoming call...");

            // Extract metadata if available
            const metadata = incomingCall.metadata || {};
            const isVideoCall = metadata.type === 'video';
            const callerName = metadata.callerName || "Incoming Call";
            const callerImage = metadata.callerImage || "";

            setActiveCall({
                peerId: incomingCall.peer,
                isIncoming: true,
                name: callerName,
                image: callerImage,
                isVideo: isVideoCall,
                status: 'ringing',
                // @ts-ignore
                rawCall: incomingCall
            });
        });

        peer.on('error', (err: any) => {
            if (err.type === 'unavailable-id') {
                // ID is taken. This handles zombie connections (common in dev/refresh).
                const delay = Math.min(2000 * (retryTrigger + 1), 10000); // Exponential backoff capped at 10s
                console.warn(`Peer ID taken. Retrying in ${delay}ms (Attempt ${retryTrigger + 1})...`);

                setTimeout(() => {
                    setRetryTrigger(prev => prev + 1);
                }, delay);
            } else {
                console.error("PeerJS Error:", err);
            }
        });

        return () => {
            // Only destroy if we are unmounting or changing users
            if (peerRef.current) {
                LOG(`Cleaning up PeerJS instance with ID: ${peerRef.current.id}`);
                peerRef.current.destroy();
                peerRef.current = null;
                setMyPeer(null);
                setActiveCall(null);
            }
        };
    }, [(session?.user as any)?.id, retryTrigger]); // Dependency includes retryTrigger

    // Handle Active Call Stream Updates
    useEffect(() => {
        if (activeCall?.stream && myVideoRef.current) {
            myVideoRef.current.srcObject = activeCall.stream;
        }
        if (activeCall?.remoteStream && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = activeCall.remoteStream;
        }
    }, [activeCall?.stream, activeCall?.remoteStream]);

    const startCall = async (recipientId: string, recipientName: string, recipientImage: string, isVideo: boolean) => {
        if (!myPeer) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: isVideo,
                audio: true
            });

            // Pass metadata so receiver knows if it's video or voice
            const call = myPeer.call(recipientId, stream, {
                metadata: {
                    type: isVideo ? 'video' : 'voice',
                    callerName: (session?.user as any).name,
                    callerImage: (session?.user as any).image
                }
            });
            connectionRef.current = call;

            setActiveCall({
                peerId: recipientId,
                isIncoming: false,
                name: recipientName,
                image: recipientImage,
                isVideo: isVideo,
                stream: stream,
                status: 'calling'
            });

            call.on('stream', (remoteStream) => {
                setActiveCall(prev => prev ? ({ ...prev, remoteStream, status: 'connected' }) : null);
            });

            call.on('close', () => {
                endCall();
            });

            call.on('error', (err) => {
                console.error("Call error:", err);
                endCall();
            });

        } catch (err) {
            console.error("Failed to get local stream", err);
            alert("Could not access camera/microphone");
        }
    };

    const answerCall = async () => {
        if (!activeCall || !(activeCall as any).rawCall) return;

        const isVideoCall = activeCall.isVideo;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: isVideoCall, // Respect the call type!
                audio: true
            });

            (activeCall as any).rawCall.answer(stream);
            connectionRef.current = (activeCall as any).rawCall;

            const call = (activeCall as any).rawCall;

            call.on('stream', (remoteStream: MediaStream) => {
                setActiveCall(prev => prev ? ({ ...prev, remoteStream, status: 'connected', stream }) : null);
            });

            call.on('close', () => endCall());

            call.on('error', (err: any) => {
                console.error("Call error:", err);
                endCall();
            });

            setActiveCall(prev => prev ? ({ ...prev, status: 'connected', stream }) : null);

        } catch (err) {
            console.error("Failed to answer", err);
            alert("Call connection failed. The caller may have disconnected.");
            setActiveCall(null);
            endCall();
        }
    };

    const endCall = () => {
        if (connectionRef.current) {
            connectionRef.current.close();
        }
        if (activeCall?.stream) {
            activeCall.stream.getTracks().forEach(track => track.stop());
        }
        setActiveCall(null);
        connectionRef.current = null;
    };

    const toggleMute = () => {
        if (activeCall?.stream) {
            activeCall.stream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
            setIsMuted(!isMuted);
        }
    };

    const toggleCamera = () => {
        if (activeCall?.stream) {
            activeCall.stream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
            setIsCameraOff(!isCameraOff);
        }
    };

    return (
        <CallContext.Provider value={{ startCall, activeCall, endCall }}>
            {children}

            {/* Call Overlay UI */}
            <AnimatePresence>
                {activeCall && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-[99999] bg-zinc-950 flex flex-col items-center justify-center overflow-hidden"
                    >
                        {/* Audio Element for Remote Stream (Always needed for audio) */}
                        {activeCall.remoteStream && (
                            <audio
                                ref={(el) => {
                                    if (el) el.srcObject = activeCall.remoteStream!;
                                }}
                                autoPlay
                            />
                        )}

                        {/* === VOICE CALL UI === */}
                        {(!activeCall.isVideo || !activeCall.remoteStream) && (
                            <div className="flex flex-col items-center justify-center flex-1 w-full space-y-8 animate-in fade-in zoom-in duration-300">
                                <div className="relative">
                                    {/* Pulsing rings for active status */}
                                    {activeCall.status === 'connected' && (
                                        <>
                                            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
                                            <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
                                        </>
                                    )}

                                    <Avatar className="h-40 w-40 border-4 border-white/5 relative z-10 shadow-2xl">
                                        <AvatarImage src={activeCall.image} className="object-cover" />
                                        <AvatarFallback className="text-5xl bg-zinc-800 text-zinc-400">
                                            {activeCall.name ? activeCall.name[0]?.toUpperCase() : '?'}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>

                                <div className="text-center space-y-2 z-10">
                                    <h2 className="text-3xl font-bold text-white tracking-tight">{activeCall.name}</h2>
                                    <p className="text-zinc-400 font-medium text-lg">
                                        {activeCall.status === 'ringing'
                                            ? (activeCall.isIncoming ? "Incoming Voice Call..." : "Calling...")
                                            : (activeCall.status === 'connected' ? "00:00" : "Connecting...") // Todo: Timer
                                        }
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* === VIDEO CALL UI === */}
                        {activeCall.isVideo && activeCall.remoteStream && (
                            <div className="flex-1 relative w-full h-full bg-black flex items-center justify-center">
                                {/* Remote Video */}
                                <video
                                    ref={remoteVideoRef}
                                    className="w-full h-full object-cover"
                                    autoPlay
                                    playsInline
                                />

                                {/* Local Video (PIP) */}
                                {activeCall.stream && (
                                    <motion.div
                                        drag
                                        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }} // Simplified constraints
                                        className="absolute top-4 right-4 w-32 h-48 md:w-48 md:h-72 bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
                                    >
                                        <video
                                            ref={myVideoRef}
                                            className={cn("w-full h-full object-cover mirror-mode", isCameraOff && "opacity-0")}
                                            autoPlay
                                            playsInline
                                            muted // Always mute own video
                                        />
                                        {isCameraOff && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                                                <VideoOff className="h-8 w-8 text-white/50" />
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </div>
                        )}

                        {/* === CONTROLS === */}
                        <div className="w-full pb-12 pt-6 flex items-center justify-center gap-6 z-50">
                            {activeCall.status === 'ringing' && activeCall.isIncoming ? (
                                <>
                                    <Button
                                        size="icon"
                                        className="h-20 w-20 rounded-full bg-green-500 hover:bg-green-600 shadow-xl shadow-green-500/20 animate-pulse"
                                        onClick={answerCall}
                                    >
                                        <Phone className="h-8 w-8 text-white" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        className="h-20 w-20 rounded-full bg-red-500 hover:bg-red-600 shadow-xl shadow-red-500/20"
                                        onClick={endCall}
                                    >
                                        <PhoneOff className="h-8 w-8 text-white" />
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className={cn("h-16 w-16 rounded-full border-none bg-white/10 hover:bg-white/20 text-white backdrop-blur", isMuted && "bg-white text-black hover:bg-white/90")}
                                        onClick={toggleMute}
                                    >
                                        {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                                    </Button>

                                    <Button
                                        size="icon"
                                        className="h-20 w-20 rounded-full bg-red-500 hover:bg-red-600 shadow-xl shadow-red-500/20 mx-4"
                                        onClick={endCall}
                                    >
                                        <PhoneOff className="h-8 w-8 text-white fill-current" />
                                    </Button>

                                    {activeCall.isVideo && (
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className={cn("h-16 w-16 rounded-full border-none bg-white/10 hover:bg-white/20 text-white backdrop-blur", isCameraOff && "bg-white text-black hover:bg-white/90")}
                                            onClick={toggleCamera}
                                        >
                                            {isCameraOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </CallContext.Provider>
    );
}

export const useCall = () => {
    const context = useContext(CallContext);
    if (!context) throw new Error("useCall must be used within a CallProvider");
    return context;
};
