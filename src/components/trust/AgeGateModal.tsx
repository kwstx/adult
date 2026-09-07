"use client";

import React from "react";
import { AgeVerificationModal } from "./AgeVerificationModal";

interface AgeGateModalProps {
  isOpen: boolean;
  onVerified: () => void;
  onClose?: () => void;
}

export function AgeGateModal({ isOpen, onVerified, onClose }: AgeGateModalProps) {
  return (
    <AgeVerificationModal
      isOpen={isOpen}
      onClose={onClose || onVerified}
      onVerified={onVerified}
      requiredEntitlementName="Adult Live Streaming & Interactive Performances"
    />
  );
}
