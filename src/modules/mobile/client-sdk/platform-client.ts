import {
  AppVersionPolicy,
  BiometricChallengePayload,
  ClientPlatform,
  MobileAuthSession,
  MobileAuthTokens,
  MobileBroadcasterAuthRequest,
  MobileBroadcasterAuthResult,
  MobileDeviceContext,
  MobileDeviceSessionRecord,
  MobileIapVerificationResult,
  MobileSequencedEvent,
  MobileSpendCreditsInput,
  MobileSpendResult,
  MobileStorefrontPackage,
  MobileStreamAuthRequest,
  MobileStreamAuthResult,
  VerifyIapReceiptInput,
} from "../types";

export interface MobileClientConfig {
  baseUrl: string;
  platform: ClientPlatform;
  appVersion: string;
  buildNumber: number;
  deviceId: string;
  deviceModel?: string;
  osVersion?: string;
  onTokensUpdated?: (tokens: MobileAuthTokens) => void;
  onSessionExpired?: () => void;
  onUpdateRequired?: (policy: AppVersionPolicy) => void;
}

export class MobilePlatformClient {
  private config: MobileClientConfig;
  private tokens: MobileAuthTokens | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<MobileAuthTokens> | null = null;

  constructor(config: MobileClientConfig) {
    this.config = config;
  }

  /**
   * Sets active authentication tokens in memory.
   */
  public setTokens(tokens: MobileAuthTokens | null): void {
    this.tokens = tokens;
    if (tokens && this.config.onTokensUpdated) {
      this.config.onTokensUpdated(tokens);
    }
  }

  /**
   * Retrieves active tokens.
   */
  public getTokens(): MobileAuthTokens | null {
    return this.tokens;
  }

  // ============================================================================
  // 1. AUTHENTICATION & DEVICE MANAGEMENT
  // ============================================================================

  public readonly auth = {
    login: async (identifier: string, password?: string): Promise<MobileAuthSession> => {
      const res = await this.request<MobileAuthSession>("/api/v1/auth/token", {
        method: "POST",
        body: JSON.stringify({ grantType: "password", identifier, password }),
      });
      this.setTokens(res.tokens);
      return res;
    },

    refreshToken: async (): Promise<MobileAuthTokens> => {
      if (!this.tokens?.refreshToken) {
        throw new Error("No refresh token available.");
      }

      if (this.isRefreshing && this.refreshPromise) {
        return this.refreshPromise;
      }

      this.isRefreshing = true;
      this.refreshPromise = (async () => {
        try {
          const res = await this.request<{ tokens: MobileAuthTokens }>("/api/v1/auth/token", {
            method: "POST",
            body: JSON.stringify({
              grantType: "refresh_token",
              refreshToken: this.tokens!.refreshToken,
            }),
          });
          this.setTokens(res.tokens);
          return res.tokens;
        } finally {
          this.isRefreshing = false;
          this.refreshPromise = null;
        }
      })();

      return this.refreshPromise;
    },

    registerDevice: async (params: {
      pushToken?: string;
      pushProvider?: "APNS" | "FCM";
    }): Promise<{ registered: boolean }> => {
      return this.request<{ registered: boolean }>("/api/v1/auth/device/register", {
        method: "POST",
        body: JSON.stringify({
          pushToken: params.pushToken,
          pushProvider: params.pushProvider,
          deviceModel: this.config.deviceModel,
          osVersion: this.config.osVersion,
        }),
      });
    },

    requestBiometricChallenge: async (): Promise<BiometricChallengePayload> => {
      return this.request<BiometricChallengePayload>("/api/v1/auth/biometric", {
        method: "GET",
      });
    },

    unlockWithBiometrics: async (challengeId: string, signature: string): Promise<MobileAuthTokens> => {
      const res = await this.request<MobileAuthTokens>("/api/v1/auth/biometric", {
        method: "POST",
        body: JSON.stringify({ challengeId, signature }),
      });
      this.setTokens(res);
      return res;
    },

    listSessions: async (): Promise<MobileDeviceSessionRecord[]> => {
      return this.request<MobileDeviceSessionRecord[]>("/api/v1/auth/sessions", {
        method: "GET",
      });
    },

    revokeSession: async (deviceId: string): Promise<{ revoked: boolean }> => {
      return this.request<{ revoked: boolean }>("/api/v1/auth/device/revoke", {
        method: "POST",
        body: JSON.stringify({ deviceId }),
      });
    },

    logout: async (): Promise<void> => {
      try {
        await this.request("/api/v1/auth/device/revoke", {
          method: "POST",
          body: JSON.stringify({ deviceId: this.config.deviceId }),
        });
      } finally {
        this.setTokens(null);
      }
    },
  };

  // ============================================================================
  // 2. WALLET & IN-APP PURCHASES (IAP)
  // ============================================================================

  public readonly wallet = {
    getBalance: async (): Promise<{ balance: number; purchased: number; bonus: number; promo: number }> => {
      return this.request("/api/v1/wallet/balance", { method: "GET" });
    },

    getPackages: async (): Promise<MobileStorefrontPackage[]> => {
      return this.request<MobileStorefrontPackage[]>("/api/v1/wallet/packages", { method: "GET" });
    },

    verifyAppleIap: async (params: {
      packageId: string;
      productId: string;
      transactionId: string;
      signedTransactionInfo: string;
    }): Promise<MobileIapVerificationResult> => {
      return this.request<MobileIapVerificationResult>("/api/v1/wallet/iap/verify", {
        method: "POST",
        body: JSON.stringify({
          store: "APPLE_APP_STORE",
          packageId: params.packageId,
          productId: params.productId,
          transactionId: params.transactionId,
          receiptOrToken: params.signedTransactionInfo,
        }),
      });
    },

    verifyGooglePlayIap: async (params: {
      packageId: string;
      productId: string;
      orderId: string;
      purchaseToken: string;
    }): Promise<MobileIapVerificationResult> => {
      return this.request<MobileIapVerificationResult>("/api/v1/wallet/iap/verify", {
        method: "POST",
        body: JSON.stringify({
          store: "GOOGLE_PLAY_STORE",
          packageId: params.packageId,
          productId: params.productId,
          transactionId: params.orderId,
          receiptOrToken: params.purchaseToken,
        }),
      });
    },

    spendCredits: async (input: Omit<MobileSpendCreditsInput, "userId">): Promise<MobileSpendResult> => {
      return this.request<MobileSpendResult>("/api/v1/wallet/spend", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
  };

  // ============================================================================
  // 3. LIVESTREAM & MEDIA AUTHORIZATION
  // ============================================================================

  public readonly live = {
    authorizePlayback: async (
      params: Omit<MobileStreamAuthRequest, "userId">
    ): Promise<MobileStreamAuthResult> => {
      return this.request<MobileStreamAuthResult>("/api/v1/live/authorize", {
        method: "POST",
        body: JSON.stringify(params),
      });
    },

    authorizeBroadcaster: async (
      params: Omit<MobileBroadcasterAuthRequest, "creatorUserId">
    ): Promise<MobileBroadcasterAuthResult> => {
      return this.request<MobileBroadcasterAuthResult>("/api/v1/live/broadcast", {
        method: "POST",
        body: JSON.stringify(params),
      });
    },
  };

  // ============================================================================
  // 4. REAL-TIME EVENT STREAMING & RECONNECT RESUMPTION
  // ============================================================================

  public readonly realtime = {
    syncMissedEvents: async (
      channel: string,
      lastKnownSeq: number
    ): Promise<MobileSequencedEvent[]> => {
      const res = await this.request<{ missedEvents: MobileSequencedEvent[] }>("/api/v1/realtime/sync", {
        method: "POST",
        body: JSON.stringify({ channel, lastKnownSeq }),
      });
      return res.missedEvents;
    },

    createStreamUrl: (creatorId: string, lastSeq: number = 0): string => {
      const token = this.tokens?.accessToken || "";
      const base = `${this.config.baseUrl}/api/v1/realtime/stream`;
      return `${base}?creatorId=${encodeURIComponent(creatorId)}&lastSeq=${lastSeq}&token=${encodeURIComponent(token)}`;
    },
  };

  // ============================================================================
  // INTERNAL HTTP PIPELINE & AUTOMATIC RETRY / TOKEN REFRESH
  // ============================================================================

  private async request<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers = new Headers(init.headers || {});

    // Inject Platform & Device Context Headers
    headers.set("Content-Type", "application/json");
    headers.set("x-client-platform", this.config.platform);
    headers.set("x-client-version", this.config.appVersion);
    headers.set("x-app-build", String(this.config.buildNumber));
    headers.set("x-device-id", this.config.deviceId);
    if (this.config.deviceModel) headers.set("x-device-model", this.config.deviceModel);
    if (this.config.osVersion) headers.set("x-os-version", this.config.osVersion);

    // Inject Bearer token if present
    if (this.tokens?.accessToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${this.tokens.accessToken}`);
    }

    let response = await fetch(url, { ...init, headers });

    // Handle 401 Unauthorized -> Attempt single automatic refresh token rotation
    if (response.status === 401 && this.tokens?.refreshToken && !endpoint.includes("/auth/token")) {
      try {
        const newTokens = await this.auth.refreshToken();
        headers.set("Authorization", `Bearer ${newTokens.accessToken}`);
        response = await fetch(url, { ...init, headers });
      } catch (refreshErr) {
        this.setTokens(null);
        if (this.config.onSessionExpired) {
          this.config.onSessionExpired();
        }
        throw refreshErr;
      }
    }

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.error || data?.userMessage || "Network request failed";
      const err = new Error(errorMsg) as any;
      err.statusCode = response.status;
      err.code = data?.code || "API_ERROR";
      err.response = data;
      throw err;
    }

    return data?.data !== undefined ? data.data : data;
  }
}
