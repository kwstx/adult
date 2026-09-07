import { NextRequest, NextResponse } from "next/server";
import { User, UserRole } from "@prisma/client";
import prisma from "@/lib/db";
import * as crypto from "crypto";
import {
  ProductError,
  PaymentFailedError,
  PaymentPendingError,
  InsufficientCreditsProductError,
  WalletSuspendedProductError,
  DuplicateTransactionProductError,
  SystemProductError,
} from "@/lib/errors/product-error";
import {
  ProductErrorCategory,
  ProductErrorCode,
  ProductErrorAction,
  ProductErrorResponse,
} from "@/lib/errors/error-codes";
import { Logger } from "@/lib/logger";

export interface AuthenticatedUser extends User {
  creatorProfileId?: string | null;
}

export interface ApiContext<TParams = any> {
  user?: AuthenticatedUser;
  params: TParams;
  ipAddress?: string;
  userAgent?: string;
}

export class ApiError extends Error {
  public readonly userTitle: string;
  public readonly userMessage: string;
  public readonly walletCharged: boolean;
  public readonly category: ProductErrorCategory;
  public readonly action: ProductErrorAction;
  public readonly isRetryable: boolean;

  constructor(
    public readonly statusCode: number = 400,
    message: string,
    public readonly code: string = "BAD_REQUEST",
    public readonly details?: any,
    options?: {
      userTitle?: string;
      userMessage?: string;
      walletCharged?: boolean;
      category?: ProductErrorCategory;
      action?: ProductErrorAction;
      isRetryable?: boolean;
    }
  ) {
    super(message);
    this.name = "ApiError";
    this.userTitle = options?.userTitle || (statusCode >= 500 ? "Something went wrong" : message);
    this.userMessage =
      options?.userMessage ||
      (statusCode >= 500
        ? "Your credits were not charged. Please try again."
        : message);
    this.walletCharged = options?.walletCharged ?? false;
    this.category = options?.category || (statusCode === 401 || statusCode === 403 ? "AUTHENTICATION" : "SYSTEM");
    this.action = options?.action || (this.walletCharged ? "CONTACT_SUPPORT" : "RETRY");
    this.isRetryable = options?.isRetryable ?? (statusCode >= 500);
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "platform_auth_jwt_token_secret_2026_secure";

export function generateUserToken(payload: { userId: string; role: UserRole; username: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  const body = Buffer.from(
    JSON.stringify({
      sub: payload.userId,
      role: payload.role,
      username: payload.username,
      exp: expiresAt,
      iat: new Date().toISOString(),
      nonce: crypto.randomBytes(8).toString("hex"),
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

export function verifyUserToken(token: string): { userId: string; role: UserRole; username: string } {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new ApiError(401, "Invalid authentication token format.", "INVALID_TOKEN", undefined, {
      userTitle: "Session invalid",
      userMessage: "Please log in again to continue.",
      action: "LOGIN",
      category: "AUTHENTICATION",
    });
  }

  const [header, body, signature] = parts;
  const expectedSig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");

  if (signature !== expectedSig) {
    throw new ApiError(401, "Token cryptographic signature failed verification.", "INVALID_TOKEN_SIGNATURE", undefined, {
      userTitle: "Authentication failed",
      userMessage: "Your login credentials could not be verified. Please log in again.",
      action: "LOGIN",
      category: "AUTHENTICATION",
    });
  }

  try {
    const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    if (new Date(decoded.exp).getTime() < Date.now()) {
      throw new ApiError(401, "Authentication session has expired.", "SESSION_EXPIRED", undefined, {
        userTitle: "Session expired",
        userMessage: "Your session has expired. Please log in again.",
        action: "LOGIN",
        category: "AUTHENTICATION",
      });
    }
    return {
      userId: decoded.sub,
      role: decoded.role,
      username: decoded.username,
    };
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, "Corrupted authentication token.", "CORRUPT_TOKEN", undefined, {
      userTitle: "Authentication error",
      userMessage: "Please log in again.",
      action: "LOGIN",
      category: "AUTHENTICATION",
    });
  }
}

/**
 * Authoritatively extracts and authenticates the user from the incoming request.
 */
export async function authenticateUser(
  req: NextRequest,
  options: { requiredRoles?: UserRole[]; optional?: boolean } = {}
): Promise<AuthenticatedUser | undefined> {
  const authHeader = req.headers.get("authorization");
  const userIdHeader = req.headers.get("x-user-id");
  let userId: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    try {
      const decoded = verifyUserToken(token);
      userId = decoded.userId;
    } catch (err) {
      if (!options.optional) throw err;
    }
  } else if (userIdHeader) {
    userId = userIdHeader.trim();
  }

  if (!userId) {
    if (options.optional) return undefined;
    throw new ApiError(
      401,
      "Authentication required. Please provide a valid Bearer token or credentials.",
      "UNAUTHORIZED",
      undefined,
      {
        userTitle: "Login required",
        userMessage: "Please log in to continue.",
        action: "LOGIN",
        category: "AUTHENTICATION",
      }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      creatorProfile: {
        select: { id: true },
      },
    },
  });

  if (!user) {
    if (options.optional) return undefined;
    throw new ApiError(404, "Authenticated user account does not exist.", "USER_NOT_FOUND", undefined, {
      userTitle: "Account not found",
      userMessage: "We could not locate this account. Please sign up or log in.",
      action: "LOGIN",
      category: "AUTHENTICATION",
    });
  }

  if (user.isBanned || user.moderationState === "BANNED" || user.moderationState === "SUSPENDED") {
    throw new ApiError(
      403,
      `Account access suspended: ${user.banReason || "Policy violation"}`,
      "ACCOUNT_SUSPENDED",
      undefined,
      {
        userTitle: "Account suspended",
        userMessage: "Your account is temporarily suspended. Please contact support for help.",
        action: "CONTACT_SUPPORT",
        category: "MODERATION",
      }
    );
  }

  if (options.requiredRoles && options.requiredRoles.length > 0) {
    if (!options.requiredRoles.includes(user.role)) {
      throw new ApiError(
        403,
        `Access denied. Requires one of roles: [${options.requiredRoles.join(", ")}]`,
        "INSUFFICIENT_PERMISSIONS",
        undefined,
        {
          userTitle: "Access restricted",
          userMessage: "You do not have permission to perform this action.",
          action: "DISMISS",
          category: "AUTHORIZATION",
        }
      );
    }
  }

  return {
    ...user,
    creatorProfileId: user.creatorProfile?.id ?? null,
  };
}

/**
 * Standard HTTP success envelope.
 */
export function successResponse<T>(data: T, status: number = 200, headers?: HeadersInit): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status, headers }
  );
}

/**
 * Standard HTTP error envelope treating errors as first-class product states.
 */
export function errorResponse(
  message: string,
  status: number = 400,
  code: string = "ERROR",
  details?: any,
  options?: {
    userTitle?: string;
    userMessage?: string;
    walletCharged?: boolean;
    category?: ProductErrorCategory;
    action?: ProductErrorAction;
    isRetryable?: boolean;
    requestId?: string;
  }
): NextResponse<ProductErrorResponse> {
  const requestId = options?.requestId || `ERR-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const is5xx = status >= 500;

  const userTitle = options?.userTitle || (is5xx ? "Something went wrong" : message);
  const userMessage =
    options?.userMessage ||
    (is5xx ? "Your credits were not charged. Please try again." : message);
  const walletCharged = options?.walletCharged ?? false;
  const category = (options?.category as ProductErrorCategory) || (is5xx ? "SYSTEM" : "FINANCIAL");
  const action = (options?.action as ProductErrorAction) || (walletCharged ? "CONTACT_SUPPORT" : is5xx ? "RETRY" : "DISMISS");
  const isRetryable = options?.isRetryable ?? (is5xx || !walletCharged);

  const payload: ProductErrorResponse = {
    success: false,
    error: userTitle,
    userTitle,
    userMessage,
    walletCharged,
    category,
    code: code as ProductErrorCode,
    action,
    isRetryable,
    requestId,
    timestamp: new Date().toISOString(),
    details: process.env.NODE_ENV === "development" ? details : undefined,
  };

  return NextResponse.json(payload, { status });
}

/**
 * Thin API route wrapper encapsulating authentication, parameter extraction,
 * authoritative backend logging, and standardized Product State error handling.
 */
export function apiHandler<TParams = any>(
  handler: (req: NextRequest, ctx: ApiContext<TParams>) => Promise<NextResponse | Response>,
  options: { requiredRoles?: UserRole[]; requireAuth?: boolean } = { requireAuth: false }
) {
  return async (req: NextRequest, context?: { params?: Promise<TParams> | TParams } | any): Promise<NextResponse | Response> => {
    const requestId = `ERR-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    let authenticatedUser: AuthenticatedUser | undefined = undefined;

    try {
      const rawParams = context?.params;
      const resolvedParams = (rawParams instanceof Promise ? await rawParams : rawParams) as TParams;
      const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || undefined;
      const userAgent = req.headers.get("user-agent") || undefined;

      if (options.requireAuth || options.requiredRoles) {
        authenticatedUser = await authenticateUser(req, { requiredRoles: options.requiredRoles, optional: false });
      } else {
        authenticatedUser = await authenticateUser(req, { optional: true });
      }

      return await handler(req, {
        user: authenticatedUser,
        params: resolvedParams,
        ipAddress,
        userAgent,
      });
    } catch (error: any) {
      const path = req.nextUrl?.pathname || req.url || "API";
      const method = req.method || "POST";

      // 1. Known Domain ProductError
      if (error instanceof ProductError) {
        Logger.warn(`[PRODUCT_ERROR] ${error.userTitle} (${error.code})`, {
          requestId,
          path,
          method,
          code: error.code,
          technicalMessage: error.technicalMessage,
          userId: authenticatedUser?.id,
        });
        return NextResponse.json(error.toResponse(requestId), { status: error.statusCode });
      }

      // 2. ApiError
      if (error instanceof ApiError) {
        Logger.warn(`[API_ERROR] ${error.message} (${error.code})`, {
          requestId,
          path,
          method,
          code: error.code,
          userId: authenticatedUser?.id,
        });
        return errorResponse(error.message, error.statusCode, error.code, error.details, {
          userTitle: error.userTitle,
          userMessage: error.userMessage,
          walletCharged: error.walletCharged,
          category: error.category,
          action: error.action,
          isRetryable: error.isRetryable,
          requestId,
        });
      }

      // 3. Known Financial Domain Exceptions
      if (error?.name === "InsufficientFundsError" || error?.name === "InsufficientCreditsError") {
        const prodErr = new InsufficientCreditsProductError(
          error.requiredCredits || error.required || 0,
          error.availableCredits || error.available || 0
        );
        return NextResponse.json(prodErr.toResponse(requestId), { status: prodErr.statusCode });
      }

      if (error?.name === "WalletSuspendedError") {
        const prodErr = new WalletSuspendedProductError(error.status || "SUSPENDED");
        return NextResponse.json(prodErr.toResponse(requestId), { status: prodErr.statusCode });
      }

      if (error?.name === "DuplicateTransactionError") {
        const prodErr = new DuplicateTransactionProductError(error.idempotencyKey || "duplicate");
        return NextResponse.json(prodErr.toResponse(requestId), { status: prodErr.statusCode });
      }

      if (error?.name === "AuthorizationError") {
        Logger.warn(`[AUTH_DENIED] ${error.message}`, { requestId, path, userId: authenticatedUser?.id });
        return errorResponse(error.message, error.statusCode || 403, error.errorCode || "FORBIDDEN", error.decision, {
          userTitle: "Access restricted",
          userMessage: "You do not have permission to access this resource.",
          walletCharged: false,
          category: "AUTHORIZATION",
          action: "DISMISS",
          isRetryable: false,
          requestId,
        });
      }

      // 4. Unexpected / Unhandled Exception (500)
      // Log technical error securely to server console/telemetry, return comforting product state to fan
      Logger.error(`Unhandled API exception on ${method} ${path}`, error, {
        requestId,
        userId: authenticatedUser?.id,
        path,
        method,
      });

      const fallbackError = new SystemProductError(error?.message || "Internal server error occurred.");
      return NextResponse.json(fallbackError.toResponse(requestId), { status: 500 });
    }
  };
}
