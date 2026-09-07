import { NextRequest, NextResponse } from "next/server";
import { User, UserRole } from "@prisma/client";
import prisma from "@/lib/db";
import * as crypto from "crypto";

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
  constructor(
    public readonly statusCode: number = 400,
    message: string,
    public readonly code: string = "BAD_REQUEST",
    public readonly details?: any
  ) {
    super(message);
    this.name = "ApiError";
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
    throw new ApiError(401, "Invalid authentication token format.", "INVALID_TOKEN");
  }

  const [header, body, signature] = parts;
  const expectedSig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");

  if (signature !== expectedSig) {
    throw new ApiError(401, "Token cryptographic signature failed verification.", "INVALID_TOKEN_SIGNATURE");
  }

  try {
    const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    if (new Date(decoded.exp).getTime() < Date.now()) {
      throw new ApiError(401, "Authentication session has expired.", "SESSION_EXPIRED");
    }
    return {
      userId: decoded.sub,
      role: decoded.role,
      username: decoded.username,
    };
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, "Corrupted authentication token.", "CORRUPT_TOKEN");
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
    throw new ApiError(401, "Authentication required. Please provide a valid Bearer token or credentials.", "UNAUTHORIZED");
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
    throw new ApiError(404, "Authenticated user account does not exist.", "USER_NOT_FOUND");
  }

  if (user.isBanned || user.moderationState === "BANNED" || user.moderationState === "SUSPENDED") {
    throw new ApiError(403, `Account access suspended: ${user.banReason || "Policy violation"}`, "ACCOUNT_SUSPENDED");
  }

  if (options.requiredRoles && options.requiredRoles.length > 0) {
    if (!options.requiredRoles.includes(user.role)) {
      throw new ApiError(
        403,
        `Access denied. Requires one of roles: [${options.requiredRoles.join(", ")}]`,
        "INSUFFICIENT_PERMISSIONS"
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
 * Standard HTTP error envelope.
 */
export function errorResponse(
  message: string,
  status: number = 400,
  code: string = "ERROR",
  details?: any
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code,
      details,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Thin API route wrapper encapsulating authentication, parameter extraction, and standardized error handling.
 */
export function apiHandler<TParams = any>(
  handler: (req: NextRequest, ctx: ApiContext<TParams>) => Promise<NextResponse | Response>,
  options: { requiredRoles?: UserRole[]; requireAuth?: boolean } = { requireAuth: false }
) {
  return async (req: NextRequest, context?: { params?: Promise<TParams> | TParams } | any): Promise<NextResponse | Response> => {
    try {
      const rawParams = context?.params;
      const resolvedParams = (rawParams instanceof Promise ? await rawParams : rawParams) as TParams;
      const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || undefined;
      const userAgent = req.headers.get("user-agent") || undefined;

      let user: AuthenticatedUser | undefined = undefined;
      if (options.requireAuth || options.requiredRoles) {
        user = await authenticateUser(req, { requiredRoles: options.requiredRoles, optional: false });
      } else {
        user = await authenticateUser(req, { optional: true });
      }

      return await handler(req, {
        user,
        params: resolvedParams,
        ipAddress,
        userAgent,
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        return errorResponse(error.message, error.statusCode, error.code, error.details);
      }
      console.error("[API_ERROR]", error);
      return errorResponse(error.message || "Internal server error occurred.", 500, "INTERNAL_ERROR");
    }
  };
}
