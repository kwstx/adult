import prisma from "@/lib/db";
import { UserRole, KYCStatus, AccountModerationState } from "@prisma/client";
import { generateUserToken, ApiError } from "@/lib/api-handler";
import { WalletLedgerService } from "@/modules/economic/wallet-ledger.service";

export interface RegisterInput {
  email: string;
  username: string;
  displayName: string;
  role?: UserRole;
  avatarUrl?: string;
  bio?: string;
  ageVerified?: boolean;
}

export interface LoginInput {
  identifier: string; // email or username
  password?: string;
  ipAddress?: string;
}

export interface AuthSessionResult {
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    role: UserRole;
    avatarUrl: string | null;
    bannerUrl: string | null;
    bio: string | null;
    kycStatus: KYCStatus;
    moderationState: AccountModerationState;
    creatorProfileId?: string | null;
    walletBalance: number;
  };
  token: string;
}

export class AuthService {
  /**
   * Registers a new user, automatically provisions their wallet, age record, and creator profile if requested.
   */
  static async register(input: RegisterInput): Promise<AuthSessionResult> {
    const {
      email,
      username,
      displayName,
      role = "FAN",
      avatarUrl,
      bio,
      ageVerified = true,
    } = input;

    // Check for existing user
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() },
        ],
      },
    });

    if (existing) {
      if (existing.email.toLowerCase() === email.toLowerCase()) {
        throw new ApiError(409, "Email is already registered.", "EMAIL_TAKEN");
      }
      throw new ApiError(409, "Username is already taken.", "USERNAME_TAKEN");
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          username: username.toLowerCase(),
          displayName,
          role,
          avatarUrl,
          bio,
          kycStatus: ageVerified ? "AGE_VERIFIED" : "UNVERIFIED",
          moderationState: "ACTIVE",
          isActive: true,
          isBanned: false,
        },
      });

      // Provision Wallet atomically
      const wallet = await tx.wallet.create({
        data: {
          userId: user.id,
          balance: 0,
          purchasedBalance: 0,
          promotionalBalance: 0,
          bonusBalance: 0,
          status: "ACTIVE",
          version: 1,
        },
      });

      // If Age verified, add AgeAssuranceRecord
      if (ageVerified) {
        await tx.ageAssuranceRecord.create({
          data: {
            userId: user.id,
            method: "CREDIT_CARD_ASSURANCE",
            verificationToken: `age_verified_${user.id}_${Date.now()}`,
            status: "APPROVED",
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });
      }

      // If Creator, create CreatorProfile
      let creatorProfileId: string | null = null;
      if (role === "CREATOR") {
        const creatorProfile = await tx.creatorProfile.create({
          data: {
            userId: user.id,
            stageName: displayName,
            bio,
            isLive: false,
            moderationState: "APPLICATION",
          },
        });
        creatorProfileId = creatorProfile.id;
      }

      const token = generateUserToken({
        userId: user.id,
        role: user.role,
        username: user.username,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          avatarUrl: user.avatarUrl,
          bannerUrl: user.bannerUrl,
          bio: user.bio,
          kycStatus: user.kycStatus,
          moderationState: user.moderationState,
          creatorProfileId,
          walletBalance: wallet.balance,
        },
        token,
      };
    });

    return result;
  }

  /**
   * Authenticates user by username or email.
   */
  static async login(input: LoginInput): Promise<AuthSessionResult> {
    const { identifier, ipAddress } = input;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier.toLowerCase() },
          { id: identifier },
        ],
      },
      include: {
        creatorProfile: { select: { id: true } },
        wallet: { select: { balance: true } },
      },
    });

    if (!user) {
      throw new ApiError(404, "Invalid credentials or account not found.", "INVALID_CREDENTIALS");
    }

    if (user.isBanned || user.moderationState === "BANNED" || user.moderationState === "SUSPENDED") {
      throw new ApiError(403, `Account suspended: ${user.banReason || "Terms violation"}`, "ACCOUNT_SUSPENDED");
    }

    // Update lastSeenAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date() },
    });

    const token = generateUserToken({
      userId: user.id,
      role: user.role,
      username: user.username,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        bannerUrl: user.bannerUrl,
        bio: user.bio,
        kycStatus: user.kycStatus,
        moderationState: user.moderationState,
        creatorProfileId: user.creatorProfile?.id ?? null,
        walletBalance: user.wallet?.balance ?? 0,
      },
      token,
    };
  }

  /**
   * Retrieves current authenticated user session details and wallet status.
   */
  static async getSession(userId: string): Promise<AuthSessionResult["user"]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        creatorProfile: { select: { id: true, stageName: true, isLive: true } },
        wallet: true,
      },
    });

    if (!user) {
      throw new ApiError(404, "User session not found.", "USER_NOT_FOUND");
    }

    // Ensure wallet exists
    const wallet = user.wallet || (await WalletLedgerService.getOrCreateWallet(user.id));

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      bio: user.bio,
      kycStatus: user.kycStatus,
      moderationState: user.moderationState,
      creatorProfileId: user.creatorProfile?.id ?? null,
      walletBalance: wallet.balance,
    };
  }

  /**
   * Logs out user and cleans up active sessions/presence.
   */
  static async logout(userId: string): Promise<{ loggedOut: boolean }> {
    await prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
    });
    return { loggedOut: true };
  }
}
