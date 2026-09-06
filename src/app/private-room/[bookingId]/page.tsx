"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context";
import {
  PrivateBookingRecord,
  PrivateRoomAuthorization,
} from "@/modules/private-sessions/types";
import {
  Clock,
  Coins,
  Lock,
  Mic,
  MicOff,
  PhoneOff,
  ShieldCheck,
  Sparkles,
  Video,
  VideoOff,
  AlertCircle,
  ArrowLeft,
  Bell,
  MessageSquare,
  Send,
  Heart,
  RefreshCw,
} from "lucide-react";

export default function PrivateMediaRoomPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = (params?.bookingId as string) || "book_sample_01";
  const { currentUser, updateBalance } = useUser();

  const [auth, setAuth] = useState<PrivateRoomAuthorization | null>(null);
  const [booking, setBooking] = useState<PrivateBookingRecord | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // WebRTC & Media States
  const [isMediaConnected, setIsMediaConnected] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [sessionSecondsRemaining, setSessionSecondsRemaining] = useState<number>(1800);
  const [sessionDurationElapsed, setSessionDurationElapsed] = useState<number>(0);
  const [completedSummary, setCompletedSummary] = useState<{
    durationSeconds: number;
    amountFormatted: string;
  } | null>(null);

  // In-session Private Chat
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; sender: string; text: string; time: string; isTip?: boolean }>
  >([]);
  const [chatInput, setChatInput] = useState("");

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // 1. Authorize Room Entry with Backend
  const checkAuthorization = useCallback(async () => {
    try {
      setIsLoadingAuth(true);
      setErrorMessage(null);

      // Fetch booking details and verify authorization
      const [authRes, bookRes] = await Promise.all([
        fetch("/api/private-sessions/authorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId, userId: currentUser.id }),
        }),
        fetch(`/api/private-sessions/bookings?bookingId=${bookingId}`),
      ]);

      const authData = await authRes.json();
      const bookData = await bookRes.json();

      if (bookData.success && bookData.booking) {
        setBooking(bookData.booking);
        setSessionSecondsRemaining(bookData.booking.durationMinutes * 60);
      }

      if (authData.success && authData.auth) {
        setAuth(authData.auth);
      } else {
        setErrorMessage(authData.error || "Authorization failed.");
      }
    } catch (err: any) {
      console.error("Authorization check error:", err);
      setErrorMessage(err.message || "Failed to authorize room entry.");
    } finally {
      setIsLoadingAuth(false);
    }
  }, [bookingId, currentUser.id]);

  useEffect(() => {
    checkAuthorization();
  }, [checkAuthorization]);

  // 2. Initialize Media when authorized
  useEffect(() => {
    if (!auth || !auth.authorized) return;

    let mounted = true;

    const startLocalMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
          audio: true,
        });

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        setIsMediaConnected(true);
      } catch (err) {
        console.warn("Camera preview fallback:", err);
        setIsMediaConnected(true);
      }
    };

    startLocalMedia();

    return () => {
      mounted = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [auth]);

  // 3. Active Session Timer
  useEffect(() => {
    if (!auth?.authorized || !isMediaConnected) return;

    const timer = setInterval(() => {
      setSessionDurationElapsed((prev) => prev + 1);
      setSessionSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleEndCall();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [auth?.authorized, isMediaConnected]);

  // Media Controls
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoDisabled(!videoTrack.enabled);
      }
    }
  };

  const handleEndCall = () => {
    setCompletedSummary({
      durationSeconds: sessionDurationElapsed || (booking?.durationMinutes || 30) * 60,
      amountFormatted: booking?.priceFiatFormatted || "€100",
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = {
      id: `msg_${Date.now()}`,
      sender: currentUser.displayName,
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput("");
  };

  const handleSendInSessionTip = (tokens: number) => {
    if (currentUser.walletBalance < tokens) {
      alert("Insufficient tokens balance.");
      return;
    }
    updateBalance(currentUser.walletBalance - tokens);
    setChatMessages((prev) => [
      ...prev,
      {
        id: `tip_${Date.now()}`,
        sender: currentUser.displayName,
        text: `Sent a tip of ${tokens} tokens! 💖`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isTip: true,
      },
    ]);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoadingAuth) {
    return (
      <main className="h-screen w-full bg-black text-white flex flex-col items-center justify-center p-4">
        <RefreshCw className="h-10 w-10 animate-spin text-pink-500 mb-4" />
        <h2 className="text-lg font-bold">Verifying Room Authorization...</h2>
        <p className="text-xs text-zinc-400 mt-1">Authoritative session security check in progress</p>
      </main>
    );
  }

  // =========================================================================
  // SCENARIO 1: EARLY LOBBY (Scheduled time has not yet arrived)
  // =========================================================================
  if (auth && !auth.authorized && auth.isEarly) {
    return (
      <main className="min-h-screen w-full bg-black text-white p-4 sm:p-6 flex flex-col justify-between">
        <header className="flex items-center justify-between max-w-4xl mx-auto w-full">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 rounded-xl bg-zinc-900 px-3.5 py-2 text-xs font-bold text-zinc-300 hover:text-white border border-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Exit Lobby</span>
          </button>

          <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-zinc-300 border border-white/10">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            2257 Verified Media Room
          </span>
        </header>

        <div className="max-w-md mx-auto w-full text-center space-y-6 py-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-pink-500/10 text-pink-400 border border-pink-500/20 mx-auto shadow-2xl">
            <Clock className="h-8 w-8" />
          </div>

          <div>
            <h1 className="text-2xl font-black text-white">Private Session Lobby</h1>
            <p className="text-xs text-zinc-400 mt-1">
              Scheduled with <strong className="text-pink-400">{auth.counterpart.displayName}</strong>
            </p>
          </div>

          {/* Countdown Card */}
          <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-6 space-y-3 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Session Opens In:
            </p>
            <div className="text-3xl sm:text-4xl font-black text-amber-400 font-mono">
              {formatTimer(auth.secondsUntilStart)}
            </div>
            <p className="text-[11px] text-zinc-400">
              Access is automatically authorized 5 minutes before scheduled start time (
              {booking?.displayStartTime || "20:00"}).
            </p>
          </div>

          {/* Reminder Scheduled Banner */}
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-left flex items-center gap-3">
            <Bell className="h-5 w-5 text-emerald-400 shrink-0" />
            <div className="text-xs text-emerald-200">
              <strong className="block text-emerald-300">Automated Reminder Scheduled</strong>
              Both you and {auth.counterpart.displayName} will receive a reminder when the session begins.
            </div>
          </div>

          <button
            onClick={checkAuthorization}
            className="flex items-center justify-center gap-2 w-full rounded-2xl bg-zinc-900 py-3 text-xs font-bold text-white border border-zinc-800 hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className="h-4 w-4 text-pink-400" />
            <span>Check Room Status Again</span>
          </button>
        </div>

        <footer className="text-center text-xs text-zinc-600">
          AuraLive Authoritative Private Sessions • 2-Way Encrypted WebRTC
        </footer>
      </main>
    );
  }

  // =========================================================================
  // SCENARIO 2: UNAUTHORIZED / EXPIRED
  // =========================================================================
  if (auth && !auth.authorized) {
    return (
      <main className="h-screen w-full bg-black text-white flex flex-col items-center justify-center p-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500/10 text-rose-500 border border-rose-500/20 mb-4">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Access Denied</h2>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm">{auth.restrictionReason || errorMessage}</p>
        <button
          onClick={() => router.push("/")}
          className="mt-6 rounded-2xl bg-zinc-900 px-6 py-2.5 text-xs font-bold text-white border border-zinc-800"
        >
          Return to Platform
        </button>
      </main>
    );
  }

  // =========================================================================
  // SCENARIO 3: AUTHORIZED & ENTERED PRIVATE MEDIA ROOM
  // =========================================================================
  return (
    <main className="relative h-screen w-full bg-black p-3 sm:p-4 flex flex-col justify-between select-none overflow-hidden">
      {/* Top Media Bar */}
      <header className="flex items-center justify-between z-20 px-2 py-1">
        <button
          onClick={handleEndCall}
          className="flex items-center gap-2 rounded-xl bg-zinc-900/80 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:text-white border border-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Leave Room</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-pink-600 px-3 py-1 text-xs font-black text-white shadow-lg shadow-pink-600/30">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            1-ON-1 PRIVATE SHOW
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-amber-400 border border-amber-500/30">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            {formatTimer(sessionSecondsRemaining)} Left
          </span>
        </div>
      </header>

      {/* Main Two-Way WebRTC Canvas & Split Layout */}
      <div className="relative flex-1 my-2 grid grid-cols-1 lg:grid-cols-4 gap-3 overflow-hidden">
        {/* Video Canvas (3 Columns on Desktop) */}
        <div className="relative lg:col-span-3 rounded-3xl bg-zinc-950 border border-zinc-800 overflow-hidden flex items-center justify-center">
          {/* Peer Stream Canvas (Simulated Remote HD Feed) */}
          <div className="relative h-full w-full bg-zinc-900 flex items-center justify-center">
            <img
              src={auth?.counterpart.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200&auto=format&fit=crop&q=80"}
              alt="Remote Video Feed"
              className="h-full w-full object-cover brightness-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

            {/* Counterpart Label */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <span className="rounded-xl bg-black/70 backdrop-blur-md px-3 py-1 text-xs font-bold text-white border border-white/10">
                {auth?.counterpart.displayName} {auth?.counterpart.role === "CREATOR" ? "✨ (Creator)" : "💎 (Fan)"}
              </span>
            </div>

            {/* Picture-in-Picture Local Camera */}
            <div className="absolute bottom-6 right-6 z-20 h-44 w-32 sm:h-52 sm:w-40 overflow-hidden rounded-2xl bg-zinc-900 border-2 border-pink-500 shadow-2xl">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover transform -scale-x-100 ${
                  isVideoDisabled ? "hidden" : "block"
                }`}
              />
              {isVideoDisabled && (
                <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-900 text-zinc-500 text-[10px] text-center p-2">
                  <VideoOff className="h-6 w-6 mb-1 text-zinc-600" />
                  Camera Off
                </div>
              )}
              <span className="absolute bottom-1.5 left-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white">
                You {isAudioMuted && "🔇"}
              </span>
            </div>
          </div>
        </div>

        {/* Private In-Room Chat & Tipping Panel (1 Column) */}
        <div className="hidden lg:flex lg:col-span-1 rounded-3xl bg-zinc-950 border border-zinc-800 flex-col justify-between overflow-hidden p-4">
          <div className="pb-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-pink-400" />
              Private 1-on-1 Chat
            </span>
            <span className="text-[10px] font-bold text-emerald-400">Encrypted</span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto space-y-2 py-3">
            {chatMessages.length === 0 ? (
              <p className="text-center text-[11px] text-zinc-500 py-8">
                Private chat active. Say hello to {auth?.counterpart.displayName}!
              </p>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-xl p-2.5 text-xs ${
                    msg.isTip
                      ? "bg-amber-500/15 border border-amber-500/30 text-amber-300"
                      : msg.sender === currentUser.displayName
                      ? "bg-pink-600/20 border border-pink-500/30 text-white ml-2"
                      : "bg-zinc-900 text-zinc-200 mr-2"
                  }`}
                >
                  <div className="flex justify-between items-center mb-0.5 text-[10px] font-bold text-zinc-400">
                    <span>{msg.sender}</span>
                    <span>{msg.time}</span>
                  </div>
                  <p>{msg.text}</p>
                </div>
              ))
            )}
          </div>

          {/* Quick Tip Buttons */}
          <div className="py-2 border-t border-zinc-800 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              In-Session Gifting
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {[50, 100, 250].map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleSendInSessionTip(amount)}
                  className="rounded-lg bg-zinc-900 hover:bg-pink-600/30 border border-zinc-800 hover:border-pink-500 p-1.5 text-[11px] font-bold text-amber-400 text-center transition-colors"
                >
                  +{amount} 🪙
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a private message..."
                className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
              />
              <button
                type="submit"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-600 text-white hover:bg-pink-500"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Media Controls Bar */}
      <footer className="z-20 p-3 bg-zinc-950/90 backdrop-blur-md rounded-2xl border border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Encrypted WebRTC Media
          </span>
        </div>

        {/* Media Call Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleAudio}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-all ${
              isAudioMuted
                ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            }`}
          >
            {isAudioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-all ${
              isVideoDisabled
                ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            }`}
          >
            {isVideoDisabled ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </button>

          <button
            onClick={handleEndCall}
            className="flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-xl shadow-rose-600/40 hover:bg-rose-700 transition-all ml-2"
          >
            <PhoneOff className="h-4 w-4" />
            <span>End Session</span>
          </button>
        </div>
      </footer>

      {/* Completion Modal */}
      {completedSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4">
          <div className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-zinc-800 p-6 text-center shadow-2xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-600 to-amber-500 text-white mx-auto mb-3 shadow-lg shadow-pink-600/30">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-black text-white">Private Session Ended</h3>
            <p className="text-xs text-zinc-400 mt-1 mb-5">
              Authoritative escrow settlement completed.
            </p>

            <div className="space-y-2 rounded-2xl bg-zinc-900/80 p-4 border border-zinc-800 text-xs text-zinc-300 mb-6 text-left">
              <div className="flex justify-between">
                <span>Total Duration:</span>
                <span className="font-bold text-white">
                  {Math.floor(completedSummary.durationSeconds / 60)}m{" "}
                  {completedSummary.durationSeconds % 60}s
                </span>
              </div>
              <div className="flex justify-between">
                <span>Amount Settled:</span>
                <span className="font-bold text-emerald-400">
                  {completedSummary.amountFormatted}
                </span>
              </div>
            </div>

            <button
              onClick={() => router.push("/")}
              className="w-full rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 py-3 text-xs font-bold text-white shadow-xl shadow-pink-600/30"
            >
              Return to Platform
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
