/**
 * ============================================================================
 * AGE VERIFICATION PROVIDER FACTORY
 * ============================================================================
 * 
 * Factory resolving the active provider adapter based on runtime configuration,
 * target jurisdiction, and environment variables.
 */

import { AgeVerificationProviderName } from "./types";
import { IAgeVerificationProvider } from "./provider.interface";
import { MockAgeVerificationAdapter } from "./providers/mock-adapter";
import { PersonaAgeVerificationAdapter } from "./providers/persona-adapter";
import { VeriffAgeVerificationAdapter } from "./providers/veriff-adapter";

export class AgeVerificationProviderFactory {
  private static adapters: Map<AgeVerificationProviderName, IAgeVerificationProvider> = new Map();

  /**
   * Get provider instance by name.
   */
  static getProvider(name?: AgeVerificationProviderName): IAgeVerificationProvider {
    const configuredName =
      name ||
      (process.env.KYC_PROVIDER?.toUpperCase().replace("_MOCK", "") as AgeVerificationProviderName) ||
      "SANDBOX_MOCK";

    const normalizedName: AgeVerificationProviderName =
      configuredName === "PERSONA"
        ? "PERSONA"
        : configuredName === "VERIFF"
        ? "VERIFF"
        : "SANDBOX_MOCK";

    if (!this.adapters.has(normalizedName)) {
      switch (normalizedName) {
        case "PERSONA":
          this.adapters.set(normalizedName, new PersonaAgeVerificationAdapter());
          break;
        case "VERIFF":
          this.adapters.set(normalizedName, new VeriffAgeVerificationAdapter());
          break;
        case "SANDBOX_MOCK":
        default:
          this.adapters.set("SANDBOX_MOCK", new MockAgeVerificationAdapter());
          break;
      }
    }

    return this.adapters.get(normalizedName)!;
  }

  /**
   * Register custom provider adapter.
   */
  static registerProvider(provider: IAgeVerificationProvider) {
    this.adapters.set(provider.name, provider);
  }
}
