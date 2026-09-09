"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Flame,
  ShieldCheck,
  Radio,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Bell,
  User,
  Heart,
  Zap,
  Lock,
  Search,
  Eye,
  Gift,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Volume2,
} from "lucide-react";
import { useUser } from "@/lib/user-context";
import {
  FanOnboardingStepKey,
  InterestOption,
  FeaturedCreatorOption,
  ONBOARDING_INTERESTS,
  PRESET_FEATURED_CREATORS,
} from "@/modules/fan-onboarding/types";

interface FanOnboardingFlowProps {
  onCompleted?: (firstLiveCreatorId?: string) => void;
  isModal?: boolean;
  initialStep?: FanOnboardingStepKey;
}

const STEP_SEQUENCE: FanOnboardingStepKey[] = [
  "LANDING",
  "AGE_GATE",
  "ACCOUNT",
  "USERNAME",
  "INTERESTS",
  "CATEGORIES",
  "NOTIFICATIONS",
  "FINDING_LIVE",
];

export function FanOnboardingFlow({
  onCompleted,
  isModal = false,
  initialStep = "LANDING",
}: FanOnboardingFlowProps) {
  const router = useRouter();
  const { switchUser, setAgeVerified } = useUser();

  const [currentStep, setCurrentStep] = useState<FanOnboardingStepKey>(initialStep);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isAgeConfirmed, setIsAgeConfirmed] = useState(false);
  const [ageAssuranceMethod, setAgeAssuranceMethod] = useState<
    "SELF_ATTESTATION" | "CREDIT_CARD_ASSURANCE" | "ID_DOCUMENT_KYC"
  >("SELF_ATTESTATION");

  // Username validation & suggestions
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [suggestedUsernames, setSuggestedUsernames] = useState<string[]>([
    "NeonPatron88",
    "CyberVIP_99",
    "AuraWatcher7",
    "PrimeSeeker24",
  ]);

  // Interests & Categories
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    "interactive",
    "cosplay",
  ]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Interactive");

  // Featured Creators to follow
  const [featuredCreators, setFeaturedCreators] = useState<FeaturedCreatorOption[]>(
    PRESET_FEATURED_CREATORS
  );
  const [followedCreatorIds, setFollowedCreatorIds] = useState<string[]>([
    PRESET_FEATURED_CREATORS[0].id,
  ]);

  // Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationTier, setNotificationTier] = useState<"ALL" | "LIVE_ONLY">("LIVE_ONLY");
  const [pushPermissionStatus, setPushPermissionStatus] = useState<string>("default");

  // Live Match Result
  const [matchedCreatorId, setMatchedCreatorId] = useState<string>(
    PRESET_FEATURED_CREATORS[0].id
  );
  const [findingProgress, setFindingProgress] = useState(15);
  const [radarStatusText, setRadarStatusText] = useState("Calibrating stream quality...");

  // Generate random avatar presets
  const avatarPresets = [
    `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=NeonPatron`,
    `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=CyberStar`,
    `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=AuraVoyager`,
    `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=NightVIP`,
  ];

  // Set default initial avatar
  useEffect(() => {
    if (!avatarUrl) {
      setAvatarUrl(avatarPresets[0]);
    }
  }, [avatarUrl]);

  // Step Progress Index
  const currentStepIndex = STEP_SEQUENCE.indexOf(currentStep);
  const totalSteps = STEP_SEQUENCE.length - 1; // Exclude landing from numbered count

  // Fetch initial username suggestions & featured creators
  useEffect(() => {
    fetch(`/api/auth/check-username?username=guest_${Math.floor(100 + Math.random() * 899)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data?.suggestions?.length) {
          setSuggestedUsernames(data.data.suggestions);
          if (!username) {
            setUsername(data.data.suggestions[0]);
            setDisplayName(data.data.suggestions[0]);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Fetch featured creators matching selected interests
  useEffect(() => {
    if (selectedInterests.length > 0) {
      fetch(`/api/creators/featured?interests=${encodeURIComponent(selectedInterests.join(","))}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.data?.length) {
            setFeaturedCreators(data.data);
          }
        })
        .catch(() => {});
    }
  }, [selectedInterests]);

  // Debounced username checker
  const checkUsername = useCallback(async (val: string) => {
    if (!val || val.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    setUsernameChecking(true);
    try {
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(val)}`);
      if (res.ok) {
        const data = await res.json();
        setUsernameAvailable(data.data.isAvailable);
        if (data.data.suggestions?.length) {
          setSuggestedUsernames(data.data.suggestions);
        }
      }
    } catch {
      setUsernameAvailable(true);
    } finally {
      setUsernameChecking(false);
    }
  }, []);

  // Handle Interest Toggle
  const toggleInterest = (tag: string) => {
    setErrorMsg(null);
    setSelectedInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Handle Creator Follow Toggle
  const toggleFollowCreator = (creatorId: string) => {
    setFollowedCreatorIds((prev) =>
      prev.includes(creatorId) ? prev.filter((id) => id !== creatorId) : [...prev, creatorId]
    );
  };

  // Request browser web push notifications
  const handleRequestPushNotification = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const permission = await Notification.requestPermission();
        setPushPermissionStatus(permission);
        if (permission === "granted") {
          setNotificationsEnabled(true);
        }
      } catch {
        // Ignored
      }
    }
    handleNextStep("FINDING_LIVE");
  };

  // Step transition helper
  const handleNextStep = (next: FanOnboardingStepKey) => {
    setErrorMsg(null);
    setCurrentStep(next);
  };

  // 1-Click Guest to Fan Fast Start
  const handleQuickGuestStart = () => {
    const randomId = Math.floor(100 + Math.random() * 899);
    const generatedUsername = `fan_${randomId}`;
    setEmail(`fan${randomId}@auralive.app`);
    setPassword(`FanPass_${randomId}!`);
    setUsername(generatedUsername);
    setDisplayName(`Patron #${randomId} 💎`);
    setIsAgeConfirmed(true);
    setCurrentStep("INTERESTS");
  };

  // Submit complete onboarding to backend
  const handleCompleteOnboarding = async () => {
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const finalEmail = email || `fan_${username.toLowerCase()}@platform.local`;
      const finalUsername = username.trim().toLowerCase();
      const finalDisplayName = displayName.trim() || finalUsername;

      const res = await fetch("/api/auth/fan-onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: finalEmail,
          password: password || "SecureFanPass123!",
          username: finalUsername,
          displayName: finalDisplayName,
          avatarUrl: avatarUrl || avatarPresets[0],
          ageVerified: true,
          ageAssuranceMethod,
          selectedInterests,
          selectedCategory,
          followedCreatorProfileIds: followedCreatorIds,
          notificationsEnabled,
          notificationTier,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.userMessage || "Failed to complete onboarding.");
      }

      const session = data.data;

      // Update global user context immediately
      switchUser({
        id: session.user.id,
        username: session.user.username,
        displayName: session.user.displayName,
        role: session.user.role,
        kycStatus: session.user.kycStatus,
        avatarUrl: session.user.avatarUrl || avatarPresets[0],
        walletBalance: session.user.walletBalance || 0,
      });
      setAgeVerified(true);

      const targetCreatorId =
        session.firstLiveMatch?.creatorProfileId ||
        (followedCreatorIds.length > 0 ? followedCreatorIds[0] : PRESET_FEATURED_CREATORS[0].id);

      setMatchedCreatorId(targetCreatorId);

      // Transition to Finding Live Animation
      setCurrentStep("FINDING_LIVE");
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred. Please try again.");
      setSubmitting(false);
    }
  };

  // Radar finding live animation timer
  useEffect(() => {
    if (currentStep === "FINDING_LIVE") {
      const steps = [
        { progress: 30, text: "Matching live creators with your interests..." },
        { progress: 65, text: `Connecting to ${selectedInterests[0] || "interactive"} live stream...` },
        { progress: 90, text: "Configuring ultra-low latency live media..." },
        { progress: 100, text: "Entering live stream room! ✨" },
      ];

      let stepIdx = 0;
      const interval = setInterval(() => {
        if (stepIdx < steps.length) {
          setFindingProgress(steps[stepIdx].progress);
          setRadarStatusText(steps[stepIdx].text);
          stepIdx++;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            if (onCompleted) {
              onCompleted(matchedCreatorId);
            } else {
              router.push(matchedCreatorId ? `/live/${matchedCreatorId}` : "/");
            }
          }, 600);
        }
      }, 700);

      return () => clearInterval(interval);
    }
  }, [currentStep, matchedCreatorId, onCompleted, router, selectedInterests]);

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[85vh] p-4 select-none">
      <div className="w-full max-w-xl rounded-3xl bg-zinc-950 border border-zinc-800/80 shadow-[0_0_60px_rgba(0,0,0,0.8)] p-6 sm:p-8 backdrop-blur-2xl text-white relative overflow-hidden">
        
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-32 w-72 bg-gradient-to-b from-pink-600/20 via-rose-600/10 to-transparent blur-3xl pointer-events-none" />

        {/* ================================================================== */}
        {/* STEP HEADER & PROGRESS BAR (Visible on steps after LANDING)         */}
        {/* ================================================================== */}
        {currentStep !== "LANDING" && currentStep !== "FINDING_LIVE" && (
          <div className="mb-6 space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <button
                onClick={() => {
                  if (currentStepIndex > 0) {
                    setCurrentStep(STEP_SEQUENCE[currentStepIndex - 1]);
                  }
                }}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>

              <span className="font-mono text-[11px] font-bold text-pink-400">
                Step {currentStepIndex} of {totalSteps - 1}
              </span>

              <button
                onClick={handleQuickGuestStart}
                className="text-[11px] font-semibold text-zinc-400 hover:text-pink-300 transition-colors"
              >
                Quick Start ⚡
              </button>
            </div>

            {/* Visual Step Progress Bar */}
            <div className="h-1.5 w-full rounded-full bg-zinc-900 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 transition-all duration-300 rounded-full"
                style={{
                  width: `${(currentStepIndex / (totalSteps - 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Global Error Notice */}
        {errorMsg && (
          <div className="mb-5 rounded-2xl bg-rose-950/70 border border-rose-500/40 p-3.5 text-xs text-rose-300 flex items-center gap-2.5 animate-shake">
            <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ================================================================== */}
        {/* STEP 1: LANDING PAGE HERO                                          */}
        {/* ================================================================== */}
        {currentStep === "LANDING" && (
          <div className="space-y-6 text-center py-2 animate-fade-in">
            {/* Live Indicator Pill */}
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 border border-rose-500/30 px-3.5 py-1 text-xs font-bold text-rose-400 shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              <span>124 Creators Live Now</span>
            </div>

            {/* Main Headline */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                Direct Creator Attention.
                <br />
                <span className="bg-gradient-to-r from-pink-500 via-rose-400 to-amber-300 bg-clip-text text-transparent">
                  Interactive Live Streams.
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
                Connect with top performers, control haptic toys, send live gifts, and unlock exclusive 1-on-1 VIP shows.
              </p>
            </div>

            {/* Live Preview Stream Ticker Cards */}
            <div className="grid grid-cols-3 gap-2.5 pt-1 pb-2">
              {PRESET_FEATURED_CREATORS.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  className="relative group rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/80 p-2 text-left"
                >
                  <img
                    src={c.avatarUrl}
                    alt={c.displayName}
                    className="h-20 w-full object-cover rounded-xl group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-rose-600/90 px-1.5 py-0.5 text-[9px] font-black text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </div>
                  <div className="mt-1.5">
                    <p className="text-[11px] font-bold text-white truncate">{c.displayName}</p>
                    <p className="text-[9px] text-zinc-400">{c.viewerCount.toLocaleString()} watching</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Primary Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={() => handleNextStep("AGE_GATE")}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 py-3.5 px-6 text-sm font-black text-white shadow-xl shadow-pink-600/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span>Enter Live Streams (Join Free)</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={handleQuickGuestStart}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 border border-zinc-800 py-3 px-6 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-all"
              >
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span>1-Click Instant Guest Entry</span>
              </button>
            </div>

            {/* Zero-PII Compliance Badge */}
            <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500 pt-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>18+ Adult Platform • Zero-PII Privacy Vault • SOC2 Certified</span>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* STEP 2: AGE GATE & AGE-ASSURANCE                                   */}
        {/* ================================================================== */}
        {currentStep === "AGE_GATE" && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-400 ring-1 ring-pink-500/30">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Age Confirmation (18+)</h2>
                <p className="text-xs text-zinc-400">Adult content & live interactive streaming gate</p>
              </div>
            </div>

            <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-4 space-y-2 text-xs text-zinc-300">
              <p className="font-semibold text-white flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-pink-400" />
                Statutory Compliance Declaration
              </p>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                By proceeding, you confirm under penalty of perjury that you are at least 18 years of age (or legal age of majority in your jurisdiction) and consent to viewing adult creator broadcasts.
              </p>
            </div>

            {/* Method selection */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Verification Method
              </label>
              
              <button
                type="button"
                onClick={() => setAgeAssuranceMethod("SELF_ATTESTATION")}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  ageAssuranceMethod === "SELF_ATTESTATION"
                    ? "border-pink-500 bg-pink-500/10 ring-1 ring-pink-500"
                    : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-500/20 text-pink-400 font-black text-xs">
                    18+
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">1-Tap Age Declaration (Fast)</div>
                    <div className="text-[11px] text-zinc-400">Instant attestation for immediate live streaming</div>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                  Instant
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAgeAssuranceMethod("CREDIT_CARD_ASSURANCE")}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  ageAssuranceMethod === "CREDIT_CARD_ASSURANCE"
                    ? "border-pink-500 bg-pink-500/10 ring-1 ring-pink-500"
                    : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 font-bold text-xs">
                    AVS
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Payment Network Assurance</div>
                    <div className="text-[11px] text-zinc-400">Certified for strict state age verification laws</div>
                  </div>
                </div>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-mono">
                  Level 2
                </span>
              </button>
            </div>

            {/* Checkbox agreement */}
            <label className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 cursor-pointer">
              <input
                type="checkbox"
                checked={isAgeConfirmed}
                onChange={(e) => setIsAgeConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-pink-600 focus:ring-pink-500"
              />
              <span className="text-xs text-zinc-300 font-medium leading-relaxed">
                I am 18 years or older and accept the Platform Terms of Service and Adult Content Policy.
              </span>
            </label>

            <button
              onClick={() => {
                if (!isAgeConfirmed) {
                  setErrorMsg("Please confirm that you are at least 18 years of age to proceed.");
                  return;
                }
                handleNextStep("ACCOUNT");
              }}
              disabled={!isAgeConfirmed}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 py-3.5 px-6 font-bold text-white shadow-lg shadow-pink-600/30 disabled:opacity-40 hover:scale-[1.01] transition-all text-sm"
            >
              <span>Confirm & Continue</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ================================================================== */}
        {/* STEP 3: ACCOUNT CREATION                                           */}
        {/* ================================================================== */}
        {currentStep === "ACCOUNT" && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30">
                <User className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Create Your Account</h2>
                <p className="text-xs text-zinc-400">Save your favorite creators, wallet, and stream history</p>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-pink-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-pink-500 focus:outline-none"
                />
                <p className="text-[10px] text-zinc-500 mt-1">Minimum 6 characters</p>
              </div>
            </div>

            <button
              onClick={() => {
                if (!email || !email.includes("@")) {
                  setErrorMsg("Please enter a valid email address.");
                  return;
                }
                if (!password || password.length < 6) {
                  setErrorMsg("Password must be at least 6 characters.");
                  return;
                }
                handleNextStep("USERNAME");
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 py-3.5 px-6 font-bold text-white shadow-lg shadow-pink-600/30 hover:scale-[1.01] transition-all text-sm"
            >
              <span>Next: Choose Your Handle</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ================================================================== */}
        {/* STEP 4: USERNAME & AVATAR PICKER                                   */}
        {/* ================================================================== */}
        {currentStep === "USERNAME" && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Pick Your Fan Handle</h2>
                <p className="text-xs text-zinc-400">How you appear in live stream chat and interaction queues</p>
              </div>
            </div>

            {/* Custom Input & Live Status */}
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-bold">
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^a-zA-Z0-9_]/g, "");
                    setUsername(clean);
                    setDisplayName(clean);
                    checkUsername(clean);
                  }}
                  placeholder="your_handle"
                  className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 pl-8 pr-10 py-3 text-sm text-white placeholder-zinc-500 focus:border-pink-500 focus:outline-none font-medium"
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  {usernameChecking ? (
                    <RefreshCw className="h-4 w-4 text-zinc-400 animate-spin" />
                  ) : usernameAvailable === true ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : usernameAvailable === false ? (
                    <AlertCircle className="h-4 w-4 text-rose-400" />
                  ) : null}
                </div>
              </div>

              {usernameAvailable === false && (
                <p className="text-[11px] text-rose-400 mt-1">
                  Handle taken. Tap one of the suggestions below!
                </p>
              )}
            </div>

            {/* 1-Tap Suggested Handles */}
            <div>
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                ⚡ 1-Tap Quick Suggestions
              </label>
              <div className="flex flex-wrap gap-2">
                {suggestedUsernames.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => {
                      setUsername(sug);
                      setDisplayName(sug);
                      setUsernameAvailable(true);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      username === sug
                        ? "bg-pink-600/20 border-pink-500 text-pink-300 ring-1 ring-pink-500"
                        : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white"
                    }`}
                  >
                    @{sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Avatar Preset Selector */}
            <div>
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                Select Persona Avatar
              </label>
              <div className="flex items-center gap-3">
                {avatarPresets.map((av, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatarUrl(av)}
                    className={`h-12 w-12 rounded-2xl overflow-hidden border-2 transition-all p-0.5 ${
                      avatarUrl === av
                        ? "border-pink-500 ring-2 ring-pink-500/50 scale-105"
                        : "border-zinc-800 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={av} alt="Avatar" className="h-full w-full object-cover rounded-xl bg-zinc-900" />
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                if (!username || username.length < 3) {
                  setErrorMsg("Username must be at least 3 characters.");
                  return;
                }
                handleNextStep("INTERESTS");
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 py-3.5 px-6 font-bold text-white shadow-lg shadow-pink-600/30 hover:scale-[1.01] transition-all text-sm"
            >
              <span>Next: Choose Your Interests</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ================================================================== */}
        {/* STEP 5: VISUAL INTERESTS GRID                                      */}
        {/* ================================================================== */}
        {currentStep === "INTERESTS" && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/30">
                <Flame className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">What do you enjoy watching?</h2>
                <p className="text-xs text-zinc-400">Personalize your live feed recommendations (pick 2 or more)</p>
              </div>
            </div>

            {/* Interest Pills Grid */}
            <div className="grid grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {ONBOARDING_INTERESTS.map((interest) => {
                const isSelected = selectedInterests.includes(interest.tag);
                return (
                  <button
                    key={interest.id}
                    type="button"
                    onClick={() => toggleInterest(interest.tag)}
                    className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? "bg-gradient-to-br from-pink-600/20 via-rose-600/15 to-purple-600/15 border-pink-500 ring-1 ring-pink-500 text-white shadow-md shadow-pink-600/20"
                        : "bg-zinc-900/70 border-zinc-800/80 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-2xl">{interest.emoji}</span>
                      {isSelected ? (
                        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-white text-[10px]">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {interest.popularityScore}%
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">{interest.name}</p>
                      <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                        {interest.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-semibold text-zinc-400">
                {selectedInterests.length} selected
              </span>
              <button
                onClick={() => {
                  if (selectedInterests.length === 0) {
                    setErrorMsg("Please select at least 1 interest to tune your feed.");
                    return;
                  }
                  handleNextStep("CATEGORIES");
                }}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 py-3 px-6 font-bold text-white shadow-lg shadow-pink-600/30 hover:scale-[1.01] transition-all text-xs"
              >
                <span>Continue</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* STEP 6: OPTIONAL CREATOR CATEGORIES & FEATURED STARS                */}
        {/* ================================================================== */}
        {currentStep === "CATEGORIES" && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-400 ring-1 ring-pink-500/30">
                  <Radio className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Featured Live Creators</h2>
                  <p className="text-xs text-zinc-400">Follow stars matching your interests for instant alerts</p>
                </div>
              </div>
            </div>

            {/* Featured Creators List */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {featuredCreators.map((creator) => {
                const isFollowed = followedCreatorIds.includes(creator.id);
                return (
                  <div
                    key={creator.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                      isFollowed
                        ? "bg-zinc-900 border-pink-500/50 ring-1 ring-pink-500/30"
                        : "bg-zinc-900/60 border-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <img
                          src={creator.avatarUrl}
                          alt={creator.displayName}
                          className="h-11 w-11 rounded-full object-cover ring-1 ring-zinc-700"
                        />
                        {creator.isLive && (
                          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-600 ring-2 ring-black">
                            <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{creator.displayName}</p>
                        <p className="text-[10px] text-zinc-400 truncate">{creator.bio || `${creator.category} • Live`}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {creator.tags.slice(0, 2).map((t) => (
                            <span key={t} className="text-[9px] font-medium text-pink-400">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleFollowCreator(creator.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                        isFollowed
                          ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                          : "bg-zinc-800 text-zinc-300 hover:bg-pink-600 hover:text-white"
                      }`}
                    >
                      {isFollowed ? (
                        <>
                          <Check className="h-3 w-3" />
                          <span>Following</span>
                        </>
                      ) : (
                        <span>+ Follow</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => handleNextStep("NOTIFICATIONS")}
                className="text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Skip for now
              </button>
              <button
                onClick={() => handleNextStep("NOTIFICATIONS")}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 py-3 px-6 font-bold text-white shadow-lg shadow-pink-600/30 hover:scale-[1.01] transition-all text-xs"
              >
                <span>Continue</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* STEP 7: NOTIFICATION PERMISSION                                    */}
        {/* ================================================================== */}
        {currentStep === "NOTIFICATIONS" && (
          <div className="space-y-5 text-center animate-fade-in py-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-pink-600/20 to-amber-500/20 text-pink-400 ring-1 ring-pink-500/30 mx-auto">
              <Bell className="h-8 w-8 animate-bounce" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-black text-white">Never Miss When They Go Live</h2>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                Get real-time browser notifications when creators you follow start broadcasting or launch VIP toy sessions.
              </p>
            </div>

            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 text-left space-y-2">
              <label className="flex items-center justify-between text-xs text-white font-bold cursor-pointer">
                <span>Enable Live Alerts</span>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-pink-600 focus:ring-pink-500"
                />
              </label>
              <p className="text-[11px] text-zinc-400">
                You can change frequency or mute anytime in your notification settings.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={async () => {
                  await handleRequestPushNotification();
                  await handleCompleteOnboarding();
                }}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 py-3.5 px-6 font-bold text-white shadow-xl shadow-pink-600/30 hover:scale-[1.01] transition-all text-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Launching First Live...</span>
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4" />
                    <span>Enable Live Alerts & Enter</span>
                  </>
                )}
              </button>

              <button
                onClick={async () => {
                  setNotificationsEnabled(false);
                  await handleCompleteOnboarding();
                }}
                disabled={submitting}
                className="text-xs font-semibold text-zinc-400 hover:text-white py-1"
              >
                Maybe Later
              </button>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* STEP 8: IMMEDIATELY FIND YOUR FIRST LIVE                           */}
        {/* ================================================================== */}
        {currentStep === "FINDING_LIVE" && (
          <div className="space-y-6 text-center py-6 animate-fade-in">
            {/* Pulsing Radar Ring */}
            <div className="relative flex h-24 w-24 items-center justify-center mx-auto">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-500 opacity-30" />
              <span className="absolute inline-flex h-20 w-20 animate-pulse rounded-full bg-pink-600/40" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-500 text-white shadow-xl shadow-pink-600/50">
                <Radio className="h-7 w-7 animate-spin-slow" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">Finding Your First Live...</h2>
              <p className="text-xs text-pink-400 font-mono font-bold animate-pulse">
                {radarStatusText}
              </p>
            </div>

            {/* Progress Gauge */}
            <div className="w-full max-w-xs mx-auto space-y-1.5">
              <div className="h-2 w-full rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 transition-all duration-500 rounded-full"
                  style={{ width: `${findingProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>Connecting live</span>
                <span>{findingProgress}%</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500">
              Entering room with authenticated double-entry wallet & interactive permissions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
