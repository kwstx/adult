/**
 * ============================================================================
 * AGE VERIFICATION PROVIDER ADAPTER INTERFACE
 * ============================================================================
 * 
 * Standardized SPI (Service Provider Interface) for third-party identity
 * and age assurance providers (Persona, Veriff, Yoti, Stripe Identity, etc.).
 */

import {
  AgeAssuranceLevel,
  AgeVerificationMethod,
  AgeVerificationProviderName,
  CanonicalVerificationUpdate,
  ProviderSessionResponse,
} from "./types";

export interface CreateSessionParams {
  userId: string;
  email?: string;
  method: AgeVerificationMethod;
  assuranceLevel: AgeAssuranceLevel;
  jurisdictionCode: string;
  redirectUrl: string;
  webhookUrl: string;
  clientIpHash?: string;
  metadata?: Record<string, string>;
}

export interface IAgeVerificationProvider {
  /**
   * The identifier of the provider.
   */
  readonly name: AgeVerificationProviderName;

  /**
   * Initialize a new age verification session with the third-party provider.
   * Returns hosted launch URL or SDK client token.
   */
  createSession(params: CreateSessionParams): Promise<ProviderSessionResponse>;

  /**
   * Fetch live verification inquiry/session status directly from the provider API.
   */
  fetchVerificationStatus(providerReference: string): Promise<CanonicalVerificationUpdate>;

  /**
   * Cryptographically verify an incoming webhook from the provider.
   */
  verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string
  ): Promise<boolean>;

  /**
   * Parse vendor-specific webhook payload into the canonical platform update format.
   */
  parseWebhookPayload(payload: any): Promise<CanonicalVerificationUpdate>;
}
