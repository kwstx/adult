"use client";

import React, { useState } from "react";
import {
  Link as LinkIcon,
  Copy,
  Check,
  TrendingUp,
  Users,
  MousePointerClick,
  DollarSign,
  ShieldCheck,
  QrCode,
  Sparkles,
  Plus,
  ExternalLink,
  ChevronRight,
  Filter,
  AlertCircle,
} from "lucide-react";

export interface ReferralLinkData {
  id: string;
  code: string;
  campaignName: string | null;
  vanityUrl: string;
  commissionRatePercent: number;
  cookieWindowDays: number;
  spendWindowDays: number;
  isActive: boolean;
  totalClicks: number;
  totalSignups: number;
  totalEarningsCredits: number;
  conversionRatePercent: number;
  createdAt: string;
}

export interface CommissionLedgerItem {
  id: string;
  referredUser: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  sourceType: string;
  grossAmountCredits: number;
  commissionCredits: number;
  commissionRatePercent: number;
  status: string;
  createdAt: string;
}

export interface ReferralDashboardProps {
  stats: {
    totalClicks: number;
    totalSignups: number;
    conversionRatePercent: number;
    activeSpendersCount: number;
    totalCommissionEarnedCredits: number;
    totalCommissionEarnedFiat: number;
    currency: string;
    activeLinksCount: number;
    fraudBlockedAttempts: number;
  };
  links: ReferralLinkData[];
  recentTransactions?: CommissionLedgerItem[];
  onCreateLink?: (input: { vanityCode: string; campaignName?: string }) => Promise<void>;
}

export function CreatorReferralDashboard({
  stats,
  links: initialLinks,
  recentTransactions = [],
  onCreateLink,
}: ReferralDashboardProps) {
  const [links, setLinks] = useState<ReferralLinkData[]>(initialLinks);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [vanityInput, setVanityInput] = useState("");
  const [campaignInput, setCampaignInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeQrCode, setActiveQrCode] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<string>("ALL");

  const handleCopy = (code: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!vanityInput.trim()) {
      setErrorMessage("Please enter a vanity code.");
      return;
    }

    try {
      if (onCreateLink) {
        await onCreateLink({
          vanityCode: vanityInput.trim().toUpperCase(),
          campaignName: campaignInput.trim() || undefined,
        });
      } else {
        // Optimistic / mock fallback
        const newCode = vanityInput.trim().toUpperCase();
        const newLink: ReferralLinkData = {
          id: `link_${Date.now()}`,
          code: newCode,
          campaignName: campaignInput.trim() || null,
          vanityUrl: `https://platform.local/r/${newCode}`,
          commissionRatePercent: 10.0,
          cookieWindowDays: 30,
          spendWindowDays: 30,
          isActive: true,
          totalClicks: 0,
          totalSignups: 0,
          totalEarningsCredits: 0,
          conversionRatePercent: 0,
          createdAt: new Date().toISOString(),
        };
        setLinks([newLink, ...links]);
      }
      setVanityInput("");
      setCampaignInput("");
      setIsCreatingLink(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create referral link.");
    }
  };

  const filteredTransactions = recentTransactions.filter((tx) => {
    if (filterSource === "ALL") return true;
    return tx.sourceType === filterSource;
  });

  return (
    <div className="flex flex-col space-y-8 max-w-7xl mx-auto px-4 py-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Affiliate & Referral Engine
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">
              10% Recurring Rev-Share
            </span>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Generate vanity referral links, track 30-day touchpoint conversions, and earn recurring commissions on referred fans.
          </p>
        </div>

        <button
          onClick={() => setIsCreatingLink(true)}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition shadow-lg shadow-purple-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Create Referral Link</span>
        </button>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Earnings */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 relative overflow-hidden group hover:border-neutral-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Total Commissions</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">
              {stats.totalCommissionEarnedCredits.toLocaleString()}{" "}
              <span className="text-xs font-bold text-purple-400">CR</span>
            </div>
            <div className="text-xs text-neutral-400 mt-1">
              ≈ ${stats.totalCommissionEarnedFiat.toFixed(2)} USD earned
            </div>
          </div>
        </div>

        {/* Link Clicks */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 relative overflow-hidden group hover:border-neutral-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Total Clicks</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <MousePointerClick className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">
              {stats.totalClicks.toLocaleString()}
            </div>
            <div className="text-xs text-neutral-400 mt-1">
              Across {stats.activeLinksCount} active vanity links
            </div>
          </div>
        </div>

        {/* Registered Fans & Conversion Rate */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 relative overflow-hidden group hover:border-neutral-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Attributed Signups</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">
              {stats.totalSignups.toLocaleString()}
            </div>
            <div className="text-xs text-emerald-400 font-medium mt-1 flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{stats.conversionRatePercent}% Conversion Rate</span>
            </div>
          </div>
        </div>

        {/* Active Spenders in 30d Window */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 relative overflow-hidden group hover:border-neutral-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Active Spenders (30d)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">
              {stats.activeSpendersCount.toLocaleString()}
            </div>
            <div className="text-xs text-neutral-400 mt-1">
              Generating recurring spend share
            </div>
          </div>
        </div>
      </div>

      {/* Anti-Fraud & Attribution Transparency Notice */}
      <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">
              Anti-Fraud & First-Party Attribution Active
            </h4>
            <p className="text-xs text-neutral-400 mt-0.5">
              30-day last-touch attribution window. Protected by hardware device fingerprinting, card hash deduplication, and IP velocity guards.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono px-3 py-1.5 rounded-lg bg-neutral-800/80 border border-neutral-700/50 text-neutral-300 self-start md:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{stats.fraudBlockedAttempts} Abuse Attempts Defended</span>
        </div>
      </div>

      {/* Create Link Modal / Drawer */}
      {isCreatingLink && (
        <div className="bg-neutral-900 border border-purple-500/30 rounded-2xl p-6 shadow-2xl relative animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <LinkIcon className="w-4 h-4 text-purple-400" />
              <span>Generate New Vanity Referral Link</span>
            </h3>
            <button
              onClick={() => setIsCreatingLink(false)}
              className="text-neutral-400 hover:text-white text-xs"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Vanity Code / Slug *
                </label>
                <div className="flex rounded-xl bg-neutral-950 border border-neutral-800 focus-within:border-purple-500 transition overflow-hidden">
                  <span className="px-3 py-2.5 text-xs text-neutral-500 bg-neutral-900 border-r border-neutral-800 select-none">
                    /r/
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. VIP_LOLA or SUMMER26"
                    value={vanityInput}
                    onChange={(e) => setVanityInput(e.target.value.toUpperCase())}
                    className="w-full bg-transparent px-3 py-2.5 text-xs text-white uppercase focus:outline-none placeholder-neutral-600 font-mono"
                    maxLength={32}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Campaign Tag (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Twitter Bio, Instagram Story"
                  value={campaignInput}
                  onChange={(e) => setCampaignInput(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 transition placeholder-neutral-600"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-center space-x-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3.5 py-2 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreatingLink(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition shadow-lg shadow-purple-600/20"
              >
                Create Link
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Referral Links Section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Your Vanity Referral Links</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Share these links on social media or external channels to earn 10% recurring revenue.
            </p>
          </div>
          <span className="text-xs text-neutral-500 font-mono">
            {links.length} Active Link{links.length === 1 ? "" : "s"}
          </span>
        </div>

        {links.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center text-neutral-500">
              <LinkIcon className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-neutral-300">No referral links created yet</div>
            <p className="text-xs text-neutral-500 max-w-sm">
              Create your first custom vanity link to start tracking fan signups and earning revenue share.
            </p>
            <button
              onClick={() => setIsCreatingLink(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-medium hover:bg-purple-500 transition"
            >
              Generate First Link
            </button>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800/60 overflow-x-auto">
            {links.map((link) => (
              <div
                key={link.id}
                className="p-4 hover:bg-neutral-800/30 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-white font-mono">
                        /r/{link.code}
                      </span>
                      {link.campaignName && (
                        <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-[10px] text-neutral-300 border border-neutral-700">
                          {link.campaignName}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20 font-medium">
                        {link.commissionRatePercent}% Comm.
                      </span>
                    </div>
                    <div className="text-xs text-neutral-400 mt-1 font-mono break-all flex items-center space-x-2">
                      <span>{link.vanityUrl}</span>
                    </div>
                  </div>
                </div>

                {/* Link Analytics & Actions */}
                <div className="flex items-center justify-between lg:justify-end space-x-6 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-neutral-800/50">
                  <div className="flex items-center space-x-4 text-xs">
                    <div className="text-center">
                      <div className="font-bold text-white">{link.totalClicks}</div>
                      <div className="text-[10px] text-neutral-500 uppercase">Clicks</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-white">{link.totalSignups}</div>
                      <div className="text-[10px] text-neutral-500 uppercase">Signups</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-emerald-400">{link.conversionRatePercent}%</div>
                      <div className="text-[10px] text-neutral-500 uppercase">Conv.</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-purple-400">{link.totalEarningsCredits} CR</div>
                      <div className="text-[10px] text-neutral-500 uppercase">Earned</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCopy(link.code, link.vanityUrl)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition border border-neutral-700"
                    >
                      {copiedCode === link.code ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy URL</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setActiveQrCode(activeQrCode === link.code ? null : link.code)}
                      className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition border border-neutral-700"
                      title="View QR Code"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {activeQrCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-white">Referral QR Code</h4>
              <button
                onClick={() => setActiveQrCode(null)}
                className="text-neutral-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <div className="bg-white p-6 rounded-2xl inline-block shadow-inner">
              <div className="w-48 h-48 bg-neutral-950 flex flex-col items-center justify-center text-white rounded-xl p-4 text-center">
                <QrCode className="w-20 h-20 text-purple-400 mb-2" />
                <span className="text-[10px] font-mono text-neutral-400 break-all">
                  /r/{activeQrCode}
                </span>
              </div>
            </div>
            <p className="text-xs text-neutral-400">
              Fans scanning this code receive a 30-day attribution cookie linking their deposits and spend to your creator account.
            </p>
            <button
              onClick={() => setActiveQrCode(null)}
              className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Chronological Commission Ledger History */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white">Commission Earnings Ledger</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Live double-entry audit of all recurring revenue share credited to your creator wallet.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-1.5 bg-neutral-950 p-1 rounded-xl border border-neutral-800 self-start sm:self-auto text-xs">
            {["ALL", "FAN_DEPOSIT", "SUBSCRIPTION_PURCHASE", "PPV_PURCHASE", "LIVE_TIP"].map(
              (f) => (
                <button
                  key={f}
                  onClick={() => setFilterSource(f)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    filterSource === f
                      ? "bg-purple-600 text-white shadow"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {f === "ALL"
                    ? "All"
                    : f === "FAN_DEPOSIT"
                    ? "Deposits"
                    : f === "SUBSCRIPTION_PURCHASE"
                    ? "Subs"
                    : f === "PPV_PURCHASE"
                    ? "PPV"
                    : "Tips"}
                </button>
              )
            )}
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-2">
            <DollarSign className="w-8 h-8 text-neutral-600" />
            <div className="text-xs font-medium text-neutral-400">
              No commission transactions recorded in this view.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-neutral-950/60 text-neutral-500 uppercase font-mono text-[10px] border-b border-neutral-800">
                <tr>
                  <th className="py-3 px-4">Referred Fan</th>
                  <th className="py-3 px-4">Transaction Type</th>
                  <th className="py-3 px-4">Fan Spend</th>
                  <th className="py-3 px-4">Your Commission (10%)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/40 font-mono">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-neutral-800/20 transition">
                    <td className="py-3.5 px-4 font-sans flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-xs">
                        {tx.referredUser.displayName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-white font-medium">{tx.referredUser.displayName}</div>
                        <div className="text-[10px] text-neutral-500">@{tx.referredUser.username}</div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-300 font-sans">
                      <span className="px-2 py-0.5 rounded bg-neutral-800 text-[11px] border border-neutral-700">
                        {tx.sourceType.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-400">
                      {tx.grossAmountCredits} CR
                    </td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">
                      +{tx.commissionCredits} CR
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20">
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-500 text-[11px]">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
