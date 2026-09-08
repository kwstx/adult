"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  ShieldCheck,
  Camera,
  Sparkles,
  CreditCard,
  FileText,
  CheckCircle2,
  AlertCircle,
  Radio,
  ArrowRight,
  ArrowLeft,
  Upload,
  Lock,
  Building,
  DollarSign,
  Info,
  Key,
  Flame,
  Check,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useUser } from "@/lib/user-context";

export interface CreatorOnboardingFlowProps {
  onCompleted?: () => void;
  isModal?: boolean;
}

const ONBOARDING_STEPS = [
  { id: 1, key: "ACCOUNT", title: "Account", short: "Account", icon: User },
  { id: 2, key: "IDENTITY", title: "Age/Identity verification", short: "Age & ID (18+)", icon: ShieldCheck },
  { id: 3, key: "PROFILE", title: "Creator profile", short: "Profile", icon: Sparkles },
  { id: 4, key: "PAYOUT", title: "Payout setup", short: "Payouts & Tax", icon: CreditCard },
  { id: 5, key: "POLICY", title: "Content and policy requirements", short: "Policy & 2257", icon: FileText },
  { id: 6, key: "REVIEW", title: "Review", short: "Review", icon: Info },
  { id: 7, key: "APPROVED", title: "Approved", short: "Approved", icon: CheckCircle2 },
];

export function CreatorOnboardingFlow({ onCompleted, isModal = false }: CreatorOnboardingFlowProps) {
  const router = useRouter();
  const { currentUser, switchUser } = useUser();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [creatorProfileId, setCreatorProfileId] = useState<string>("");

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Account
    legalFirstName: "Alex",
    legalLastName: "Patron",
    contactEmail: currentUser.username ? `${currentUser.username}@platform.local` : "alex@platform.local",
    contactPhone: "+1 (555) 234-5678",
    countryOfResidence: "United States",
    residentialAddress: "742 Evergreen Terrace",
    city: "Springfield",
    postalCode: "97477",

    // Step 2: Age & Identity
    dateOfBirth: "1998-05-14",
    idType: "PASSPORT",
    idNumber: "P88920194A",
    idDocumentFrontUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600",
    idDocumentBackUrl: "",
    selfieWithIdUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600",
    isSelfieCaptured: true,

    // Step 3: Creator Profile
    stageName: currentUser.displayName ? currentUser.displayName.replace(/[^\w\s]/gi, "").trim() : "Alex Live",
    category: "Interactive",
    tags: "interactive,live,gaming,vip",
    bio: "Welcome to my official interactive stream! Let's connect and build a community.",
    subscriptionTier1Price: 200,

    // Step 4: Payout Setup
    payoutMethod: "SEPA_BANK",
    beneficiaryName: "Alex Patron",
    currency: "USD",
    ibanOrAccount: "US98BOFA000192837465",
    routingOrSwift: "BOFAUS3N",
    taxFormType: "W9",
    taxIdOrSSN: "987-65-4321",
    taxSignatureName: "Alex Patron",

    // Step 5: Content and Policy Requirements
    statutory2257Acknowledged: true,
    performerConsentSigned: true,
    soleCopyrightHolder: true,
    allPerformers18Plus: true,
    primaryCustodianName: "AuraLive Compliance Custodian Ltd.",
    primaryCustodianAddress: "100 Compliance Way, Suite 400, Wilmington, DE 19801",
    legalPolicySignature: "Alex Patron",

    // Step 6 & 7: Review & Approved
    complianceDecision: "APPROVED",
  });

  // Calculate age from DOB
  const calculateAge = (dobString: string) => {
    if (!dobString) return 0;
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return 0;
    const diffMs = Date.now() - dob.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
  };

  const applicantAge = calculateAge(formData.dateOfBirth);
  const isAdult = applicantAge >= 18;

  // Load current onboarding status on mount or user switch
  useEffect(() => {
    async function loadStatus() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/creators/onboarding/flow?userId=${encodeURIComponent(currentUser.id)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.progress) {
            setCreatorProfileId(data.progress.creatorProfileId || "");
            if (data.progress.isMonetizationEnabled) {
              setCurrentStep(7);
            } else if (data.progress.currentStepIndex) {
              setCurrentStep(Math.min(data.progress.currentStepIndex, 6));
            }
          }
        }
      } catch (err: any) {
        console.error("Failed to load onboarding progress:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
  }, [currentUser.id]);

  // Handle Step Advancement
  const handleNextStep = async () => {
    setErrorMsg(null);
    setSubmitting(true);

    try {
      let stepPayload: any = {};

      if (currentStep === 1) {
        // Validation Step 1
        if (!formData.legalFirstName || !formData.legalLastName || !formData.contactEmail) {
          throw new Error("Please complete all required account and legal contact fields.");
        }
        stepPayload = {
          legalFirstName: formData.legalFirstName,
          legalLastName: formData.legalLastName,
          contactEmail: formData.contactEmail,
          contactPhone: formData.contactPhone,
          countryOfResidence: formData.countryOfResidence,
          residentialAddress: formData.residentialAddress,
          city: formData.city,
          postalCode: formData.postalCode,
          stageName: formData.stageName,
        };
      } else if (currentStep === 2) {
        // Validation Step 2: Age >= 18
        if (!isAdult) {
          throw new Error(`Age verification failed: Applicant is ${applicantAge} years old. Platform regulations strictly require creators to be at least 18 years of age.`);
        }
        if (!formData.idNumber || !formData.idDocumentFrontUrl || !formData.selfieWithIdUrl) {
          throw new Error("Please provide government ID documents and complete biometric selfie verification.");
        }
        stepPayload = {
          idType: formData.idType,
          idNumber: formData.idNumber,
          idDocumentFrontUrl: formData.idDocumentFrontUrl,
          idDocumentBackUrl: formData.idDocumentBackUrl,
          selfieWithIdUrl: formData.selfieWithIdUrl,
          dateOfBirth: formData.dateOfBirth,
          issuingCountry: formData.countryOfResidence,
        };
      } else if (currentStep === 3) {
        // Validation Step 3
        if (!formData.stageName || !formData.category) {
          throw new Error("Please specify a stage name and broadcast category.");
        }
        stepPayload = {
          stageName: formData.stageName,
          category: formData.category,
          tags: formData.tags.split(",").map((t) => t.trim()),
          bio: formData.bio,
          subscriptionTier1Price: formData.subscriptionTier1Price,
        };
      } else if (currentStep === 4) {
        // Validation Step 4
        if (!formData.beneficiaryName || !formData.ibanOrAccount || !formData.taxIdOrSSN || !formData.taxSignatureName) {
          throw new Error("Please complete beneficiary banking details and certified tax information.");
        }
        stepPayload = {
          payoutMethod: formData.payoutMethod,
          beneficiaryName: formData.beneficiaryName,
          currency: formData.currency,
          beneficiaryAccountData: {
            ibanOrAccountNumber: formData.ibanOrAccount,
            routingOrSwiftCode: formData.routingOrSwift,
          },
          taxFormType: formData.taxFormType,
          taxIdNumberOrSSN: formData.taxIdOrSSN,
          taxSignatureName: formData.taxSignatureName,
          taxSignatureDate: new Date().toISOString(),
        };
      } else if (currentStep === 5) {
        // Validation Step 5
        if (!formData.statutory2257Acknowledged || !formData.performerConsentSigned || !formData.legalPolicySignature) {
          throw new Error("You must acknowledge the 18 U.S.C. § 2257 statement and sign the performer consent release.");
        }
        stepPayload = {
          statutory2257Acknowledged: formData.statutory2257Acknowledged,
          legalFullNameSignature: formData.legalPolicySignature,
          primaryCustodianName: formData.primaryCustodianName,
          primaryCustodianAddress: formData.primaryCustodianAddress,
          allowsThirdPartyCollaborators: false,
        };
      } else if (currentStep === 6) {
        // Step 6: Trigger Review & Instant Automated Clearance
        stepPayload = {
          autoApprove: true,
        };
      }

      // Submit step payload to server
      const res = await fetch("/api/creators/onboarding/flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          creatorProfileId: creatorProfileId || undefined,
          step: currentStep,
          payload: stepPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit step.");
      }

      if (data.progress?.creatorProfileId) {
        setCreatorProfileId(data.progress.creatorProfileId);
      }

      // If Step 6 passed, immediately trigger Step 7 Approval activation
      if (currentStep === 6) {
        const approveRes = await fetch("/api/creators/onboarding/flow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            creatorProfileId: creatorProfileId || data.progress?.creatorProfileId,
            step: 7,
            payload: { agreedToTermsVersion: "v2.5" },
          }),
        });
        const approveData = await approveRes.json();
        if (!approveRes.ok) {
          throw new Error(approveData.error || "Failed to activate monetization.");
        }

        // Update local user role to CREATOR in context
        switchUser({
          ...currentUser,
          role: "CREATOR",
          kycStatus: "COMPLIANCE_2257_APPROVED",
        });

        setCurrentStep(7);
        setSuccessMsg("🎉 Congratulations! Your creator application has been approved!");
      } else {
        setCurrentStep((prev) => Math.min(prev + 1, 7));
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during step submission.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleGoLive = () => {
    if (onCompleted) {
      onCompleted();
    }
    router.push("/creator/studio");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-rose-500 mb-4" />
        <p className="text-sm font-semibold text-zinc-400">Loading creator verification dossier...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-zinc-950/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl text-white">
      {/* ------------------------------------------------------------- */}
      {/* HEADER & RISK MANAGEMENT BADGE                                */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Flame className="h-4 w-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Creator Verification & Onboarding
            </h1>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Authoritative 7-step trust & compliance verification for broadcast monetization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-zinc-900 border border-zinc-800 px-3 py-1 text-[11px] font-bold text-zinc-300">
            <Lock className="h-3 w-3 text-rose-400" />
            <span>Step {currentStep} of 7</span>
          </span>
          {currentStep === 7 ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-[11px] font-extrabold text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approved
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-[11px] font-extrabold text-amber-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Under Verification
            </span>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 7-STEP PROGRESS INDICATOR                                     */}
      {/* ------------------------------------------------------------- */}
      <div className="mb-8">
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {ONBOARDING_STEPS.map((step) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id || currentStep === 7;
            const isCurrent = currentStep === step.id;

            return (
              <button
                key={step.id}
                disabled={step.id > currentStep && currentStep !== 7}
                onClick={() => {
                  if (step.id <= currentStep || currentStep === 7) {
                    setCurrentStep(step.id);
                  }
                }}
                className={`group flex flex-col items-center p-2 rounded-2xl transition-all ${
                  isCurrent
                    ? "bg-rose-500/20 border border-rose-500/50 text-rose-300 shadow-md shadow-rose-500/10"
                    : isCompleted
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                    : "bg-zinc-900/50 border border-zinc-800/60 text-zinc-600 opacity-60 cursor-not-allowed"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl mb-1.5 transition-colors ${
                    isCurrent
                      ? "bg-rose-500 text-white"
                      : isCompleted
                      ? "bg-emerald-500 text-white"
                      : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className="text-[10px] font-bold text-center truncate max-w-full hidden sm:block">
                  {step.short}
                </span>
                <span className="text-[9px] font-semibold text-zinc-400 sm:hidden">
                  #{step.id}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ERROR & ALERT MESSAGES                                        */}
      {/* ------------------------------------------------------------- */}
      {errorMsg && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 p-4 text-xs font-semibold text-rose-300 animate-fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Verification Error:</p>
            <p className="mt-0.5 text-zinc-300">{errorMsg}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-4 text-xs font-semibold text-emerald-300 animate-fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
          <p className="mt-0.5">{successMsg}</p>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 1: ACCOUNT                                               */}
      {/* ------------------------------------------------------------- */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-fade-in">
          <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <User className="h-4 w-4 text-pink-400" />
              Step One: Account & Legal Contact Information
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Verify your applicant account details and statutory residence for tax and payout eligibility.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">Legal First Name *</label>
              <input
                type="text"
                value={formData.legalFirstName}
                onChange={(e) => setFormData({ ...formData, legalFirstName: e.target.value })}
                placeholder="e.g. Alex"
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">Legal Last Name *</label>
              <input
                type="text"
                value={formData.legalLastName}
                onChange={(e) => setFormData({ ...formData, legalLastName: e.target.value })}
                placeholder="e.g. Patron"
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">Primary Contact Email *</label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">Contact Phone</label>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">Residential Street Address *</label>
              <input
                type="text"
                value={formData.residentialAddress}
                onChange={(e) => setFormData({ ...formData, residentialAddress: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">City *</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">Country of Residence *</label>
              <select
                value={formData.countryOfResidence}
                onChange={(e) => setFormData({ ...formData, countryOfResidence: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
              >
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Canada">Canada</option>
                <option value="Germany">Germany</option>
                <option value="France">France</option>
                <option value="Australia">Australia</option>
                <option value="Netherlands">Netherlands</option>
                <option value="Spain">Spain</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 2: AGE & IDENTITY VERIFICATION (18+)                    */}
      {/* ------------------------------------------------------------- */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-fade-in">
          <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-rose-400" />
              Step Two: Age & Identity Verification (Statutory 18+ Gate)
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Federal law strictly mandates that all creators must be verified legal adults (Age 18+) before monetization.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-zinc-300">Date of Birth *</label>
                <span
                  className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                    isAdult ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                  }`}
                >
                  Age: {applicantAge} • {isAdult ? "Adult (18+)" : "Underage Rejection"}
                </span>
              </div>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">Government ID Type *</label>
              <select
                value={formData.idType}
                onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
              >
                <option value="PASSPORT">Passport</option>
                <option value="DRIVERS_LICENSE">Driver's License</option>
                <option value="NATIONAL_ID">National Identity Card</option>
                <option value="RESIDENCE_PERMIT">Residence Permit</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">ID Document Number (Encrypted) *</label>
              <input
                type="text"
                value={formData.idNumber}
                onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                placeholder="e.g. Passport or License ID Number"
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Document Upload Previews */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 mb-2">
                <FileText className="h-3.5 w-3.5 text-rose-400" />
                Government ID (Front Photo)
              </span>
              <div className="relative aspect-[3/2] w-full rounded-xl overflow-hidden border border-zinc-800 bg-black/60 flex items-center justify-center group">
                <img
                  src={formData.idDocumentFrontUrl}
                  alt="Government ID"
                  className="w-full h-full object-cover group-hover:scale-105 transition-all"
                />
                <div className="absolute top-2 right-2 rounded-full bg-emerald-500/90 text-black px-2 py-0.5 text-[10px] font-black uppercase">
                  Verified Scan
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 mb-2">
                <Camera className="h-3.5 w-3.5 text-pink-400" />
                Biometric Selfie with ID Check
              </span>
              <div className="relative aspect-[3/2] w-full rounded-xl overflow-hidden border border-zinc-800 bg-black/60 flex items-center justify-center group">
                <img
                  src={formData.selfieWithIdUrl}
                  alt="Biometric Selfie"
                  className="w-full h-full object-cover group-hover:scale-105 transition-all"
                />
                <div className="absolute bottom-2 left-2 rounded-xl bg-black/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  ✓ Liveness 99.4% Match
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 3: CREATOR PROFILE                                       */}
      {/* ------------------------------------------------------------- */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-fade-in">
          <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-pink-400" />
              Step Three: Creator Profile & Channel Branding
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Configure your public stage name, broadcast specialization, bio, and subscription pricing.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">Public Stage Name *</label>
              <input
                type="text"
                value={formData.stageName}
                onChange={(e) => setFormData({ ...formData, stageName: e.target.value })}
                placeholder="e.g. Maya Velvet ✨"
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">Primary Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
              >
                <option value="Interactive">Interactive Gaming & Live Show</option>
                <option value="Entertainment">Entertainment & Talk</option>
                <option value="Glamour">Glamour & VIP Experience</option>
                <option value="Music">Music & Performance</option>
                <option value="Fitness">Fitness & Lifestyle</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">Channel Tags (comma separated)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g. interactive, chat, vip, live"
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">Creator Bio</label>
              <textarea
                rows={3}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2 text-xs text-white focus:border-rose-500 focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Default Monthly VIP Tier Price (Credits)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={50}
                  step={50}
                  value={formData.subscriptionTier1Price}
                  onChange={(e) => setFormData({ ...formData, subscriptionTier1Price: Number(e.target.value) })}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-amber-400">🪙 Credits</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 4: PAYOUT SETUP & TAX COMPLIANCE                          */}
      {/* ------------------------------------------------------------- */}
      {currentStep === 4 && (
        <div className="space-y-6 animate-fade-in">
          <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-400" />
              Step Four: Payout Destination & Certified Tax Form
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Configure your earnings withdrawal destination and certify statutory tax forms (W-9 / W-8BEN).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">Payout Method *</label>
              <select
                value={formData.payoutMethod}
                onChange={(e) => setFormData({ ...formData, payoutMethod: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
              >
                <option value="SEPA_BANK">SEPA / Direct Bank Wire</option>
                <option value="ACH_DIRECT">ACH Direct Deposit (US Banks)</option>
                <option value="PAXUM">Paxum Wallet</option>
                <option value="COSMO_PAY">CosmoPay</option>
                <option value="CRYPTO_USDT">USDT (TRC-20 / ERC-20)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">Beneficiary Legal Name *</label>
              <input
                type="text"
                value={formData.beneficiaryName}
                onChange={(e) => setFormData({ ...formData, beneficiaryName: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                IBAN / Account Number / Wallet Address *
              </label>
              <input
                type="text"
                value={formData.ibanOrAccount}
                onChange={(e) => setFormData({ ...formData, ibanOrAccount: e.target.value })}
                placeholder="e.g. US98BOFA000192837465"
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none font-mono"
              />
            </div>

            {/* Tax Certification */}
            <div className="sm:col-span-2 rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Electronic Tax Certification (IRS W-9 / W-8BEN)</span>
                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                  Required
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">Tax ID / SSN / EIN (Encrypted) *</label>
                  <input
                    type="password"
                    value={formData.taxIdOrSSN}
                    onChange={(e) => setFormData({ ...formData, taxIdOrSSN: e.target.value })}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">Electronic Signature *</label>
                  <input
                    type="text"
                    value={formData.taxSignatureName}
                    onChange={(e) => setFormData({ ...formData, taxSignatureName: e.target.value })}
                    placeholder="Type legal full name to sign"
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none font-serif italic"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 5: CONTENT AND POLICY REQUIREMENTS (2257)                */}
      {/* ------------------------------------------------------------- */}
      {currentStep === 5 && (
        <div className="space-y-6 animate-fade-in">
          <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-400" />
              Step Five: Content & 18 U.S.C. § 2257 Compliance Requirements
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Statutory performer consent statements, recordkeeping custodian declarations, and content provenance rules.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 rounded-2xl bg-zinc-900 border border-zinc-800 p-4 cursor-pointer hover:border-zinc-700 transition-colors">
              <input
                type="checkbox"
                checked={formData.statutory2257Acknowledged}
                onChange={(e) => setFormData({ ...formData, statutory2257Acknowledged: e.target.checked })}
                className="h-4 w-4 mt-0.5 rounded text-rose-600 focus:ring-rose-500 bg-zinc-950 border-zinc-700"
              />
              <div className="text-xs">
                <p className="font-bold text-white">18 U.S.C. § 2257 Record-Keeping Compliance Statement</p>
                <p className="text-zinc-400 mt-0.5">
                  I certify under penalty of perjury that all records required by 18 U.S.C. § 2257 and 28 C.F.R. Part 75 are maintained by the designated custodian of records.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-2xl bg-zinc-900 border border-zinc-800 p-4 cursor-pointer hover:border-zinc-700 transition-colors">
              <input
                type="checkbox"
                checked={formData.performerConsentSigned}
                onChange={(e) => setFormData({ ...formData, performerConsentSigned: e.target.checked })}
                className="h-4 w-4 mt-0.5 rounded text-rose-600 focus:ring-rose-500 bg-zinc-950 border-zinc-700"
              />
              <div className="text-xs">
                <p className="font-bold text-white">Performer Consent & Media Release Agreement</p>
                <p className="text-zinc-400 mt-0.5">
                  I represent and warrant that I am the sole performer or possess verified, written 2257 consent agreements for any collaborating performer appearing on channel streams or content.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-2xl bg-zinc-900 border border-zinc-800 p-4 cursor-pointer hover:border-zinc-700 transition-colors">
              <input
                type="checkbox"
                checked={formData.soleCopyrightHolder}
                onChange={(e) => setFormData({ ...formData, soleCopyrightHolder: e.target.checked })}
                className="h-4 w-4 mt-0.5 rounded text-rose-600 focus:ring-rose-500 bg-zinc-950 border-zinc-700"
              />
              <div className="text-xs">
                <p className="font-bold text-white">Content Provenance & Platform Safety Guidelines</p>
                <p className="text-zinc-400 mt-0.5">
                  All broadcast audio, video, and digital content is 100% original, consensual, and complies with platform anti-harassment and community guidelines.
                </p>
              </div>
            </label>

            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4">
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Statutory Electronic Policy Signature *
              </label>
              <input
                type="text"
                value={formData.legalPolicySignature}
                onChange={(e) => setFormData({ ...formData, legalPolicySignature: e.target.value })}
                placeholder="Type legal name to execute 2257 declaration"
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none font-serif italic"
              />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 6: REVIEW                                                */}
      {/* ------------------------------------------------------------- */}
      {currentStep === 6 && (
        <div className="space-y-6 animate-fade-in">
          <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-400" />
              Step Six: Final Review & Compliance Evaluation
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Review your completed creator dossier before submitting for automated compliance review and approval.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 space-y-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Account & Identity</span>
              <p className="text-sm font-extrabold text-white">{formData.legalFirstName} {formData.legalLastName}</p>
              <p className="text-xs text-zinc-400">{formData.contactEmail} • {formData.countryOfResidence}</p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                <Check className="h-3.5 w-3.5" /> ID Verified (Age: {applicantAge} yrs)
              </div>
            </div>

            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 space-y-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Channel & Payout</span>
              <p className="text-sm font-extrabold text-rose-400">{formData.stageName}</p>
              <p className="text-xs text-zinc-400">Category: {formData.category} • Method: {formData.payoutMethod}</p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                <Check className="h-3.5 w-3.5" /> W-9 Tax Certified & 2257 Executed
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
              <div>
                <p className="text-xs font-extrabold text-emerald-300">Trust & Safety Automated Risk Score: 2 / 100 (Pass)</p>
                <p className="text-[11px] text-zinc-400">Identity biometric check passed • Sanctions screening cleared</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-500 text-black text-[10px] font-black uppercase px-2.5 py-1">
              Ready
            </span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 7: APPROVED (GO LIVE UNLOCKED)                           */}
      {/* ------------------------------------------------------------- */}
      {currentStep === 7 && (
        <div className="space-y-6 animate-fade-in text-center py-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-black shadow-2xl shadow-emerald-500/30 ring-4 ring-emerald-500/20">
            <CheckCircle2 className="h-10 w-10 stroke-[2.5]" />
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              You're Officially an Approved Creator!
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
              Your 18 U.S.C. § 2257 compliance vault is active, identity verified, and monetization permissions are enabled.
            </p>
          </div>

          {/* Stream Key Credentials */}
          <div className="max-w-md mx-auto rounded-2xl bg-zinc-900 border border-zinc-800 p-4 text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                <Key className="h-3.5 w-3.5 text-rose-400" />
                Live Broadcast Ingest Credentials
              </span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <div className="font-mono text-xs text-zinc-300 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 truncate">
              rtmp://live.auralive.local/app/live_{currentUser.id}
            </div>
          </div>

          {/* MASTER 'GO LIVE' BUTTON */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleGoLive}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 hover:from-rose-500 hover:to-pink-500 text-white font-black text-sm px-8 py-3.5 shadow-xl shadow-rose-600/30 ring-2 ring-rose-500/40 hover:scale-[1.02] transition-all"
            >
              <Radio className="h-5 w-5 animate-pulse" />
              <span>Go Live</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* FOOTER ACTIONS & NAVIGATION BUTTONS                          */}
      {/* ------------------------------------------------------------- */}
      {currentStep < 7 && (
        <div className="mt-8 pt-6 border-t border-zinc-800 flex items-center justify-between gap-4">
          <button
            type="button"
            disabled={currentStep === 1 || submitting}
            onClick={handlePrevStep}
            className={`flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-2.5 text-xs font-bold text-zinc-300 hover:bg-zinc-800 transition-all ${
              currentStep === 1 ? "opacity-0 pointer-events-none" : ""
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          <button
            type="button"
            disabled={submitting || (currentStep === 2 && !isAdult)}
            onClick={handleNextStep}
            className="flex items-center gap-2 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white px-6 py-2.5 text-xs font-black shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : currentStep === 6 ? (
              <>
                <span>Submit & Complete Review</span>
                <CheckCircle2 className="h-4 w-4" />
              </>
            ) : (
              <>
                <span>Continue to Step {currentStep + 1}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
