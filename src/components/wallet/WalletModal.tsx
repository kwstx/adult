"use client";

import React from "react";
import { PurchaseCreditsModal } from "./PurchaseCreditsModal";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (creditsAdded: number, newBalance: number) => void;
}

export function WalletModal({ isOpen, onClose, onSuccess }: WalletModalProps) {
  return <PurchaseCreditsModal isOpen={isOpen} onClose={onClose} onSuccess={onSuccess} />;
}
