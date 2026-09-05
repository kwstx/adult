"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface CurrentUser {
  id: string;
  username: string;
  displayName: string;
  role: "FAN" | "CREATOR" | "MODERATOR" | "ADMIN";
  kycStatus: "UNVERIFIED" | "AGE_VERIFIED" | "COMPLIANCE_2257_APPROVED";
  avatarUrl: string;
  walletBalance: number;
}

export const PRESET_USERS: CurrentUser[] = [
  {
    id: "fan_alex",
    username: "alex_patron",
    displayName: "Alex Patron 💎",
    role: "FAN",
    kycStatus: "AGE_VERIFIED",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    walletBalance: 2500,
  },
  {
    id: "creator_maya",
    username: "mayavelvet",
    displayName: "Maya Velvet ✨",
    role: "CREATOR",
    kycStatus: "COMPLIANCE_2257_APPROVED",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    walletBalance: 4520,
  },
  {
    id: "admin_sarah",
    username: "compliance_officer",
    displayName: "Sarah (Compliance Lead) 🛡️",
    role: "ADMIN",
    kycStatus: "COMPLIANCE_2257_APPROVED",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    walletBalance: 10000,
  },
];

interface UserContextType {
  currentUser: CurrentUser;
  switchUser: (user: CurrentUser) => void;
  updateBalance: (newBalance: number) => void;
  refreshWallet: () => Promise<void>;
  isAgeVerified: boolean;
  setAgeVerified: (val: boolean) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser>(PRESET_USERS[0]);
  const [isAgeVerified, setIsAgeVerified] = useState<boolean>(true);

  // Sync balance from server if user has DB record
  const refreshWallet = async () => {
    try {
      const res = await fetch(`/api/economic/wallet?userId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.wallet) {
          setCurrentUser((prev) => ({
            ...prev,
            walletBalance: data.wallet.balance,
          }));
        }
      }
    } catch {
      // Fallback
    }
  };

  const updateBalance = (newBalance: number) => {
    setCurrentUser((prev) => ({
      ...prev,
      walletBalance: newBalance,
    }));
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        switchUser: setCurrentUser,
        updateBalance,
        refreshWallet,
        isAgeVerified,
        setAgeVerified: setIsAgeVerified,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within a UserProvider");
  return context;
}
