/**
 * SECURITY ARCHITECTURE (#68) UNIT TEST SUITE
 * 
 * Verifies security headers, secure cookies, CSRF protection, rate limiting,
 * administrative RBAC guards, DB security, and secret scanning.
 */

import { TestRunner, assert, assertEqual, assertRejects } from "../utils/test-runner";
import { SecurityHeaders } from "@/core/security/headers";
import { SecureCookies } from "@/core/security/cookies";
import { CsrfProtection } from "@/core/security/csrf";
import { RateLimiter } from "@/core/security/rate-limiter";
import { AdminGuard } from "@/core/security/admin-guard";
import { DatabaseSecurity } from "@/core/security/db-security";
import { SecretScanner } from "@/core/security/secret-scanner";
import { NextRequest } from "next/server";

export async function runSecurityArchitectureTests(): Promise<boolean> {
  const runner = new TestRunner("Layer: Security Architecture (#68) Tests");
  runner.printHeader();

  // --------------------------------------------------------------------------
  // TEST 1: Security Headers & HTTPS Enforcement
  // --------------------------------------------------------------------------
  await runner.runTest("Security Headers: Produces OWASP-compliant HSTS, CSP, and framing headers", () => {
    const prodHeaders = SecurityHeaders.getHeaders(true);
    assertEqual(prodHeaders["X-Frame-Options"], "DENY", "X-Frame-Options must be DENY");
    assertEqual(prodHeaders["X-Content-Type-Options"], "nosniff", "X-Content-Type-Options must be nosniff");
    assert(prodHeaders["Strict-Transport-Security"].includes("max-age=63072000"), "HSTS must be enabled in production");
    assert(prodHeaders["Content-Security-Policy"].includes("default-src 'self'"), "CSP must define default-src 'self'");
  });

  // --------------------------------------------------------------------------
  // TEST 2: Secure Cookie Serialization
  // --------------------------------------------------------------------------
  await runner.runTest("Cookies: Enforces HttpOnly, Secure, SameSite, and __Host- prefixes", () => {
    const serialized = SecureCookies.serialize("session_id", "xyz123", {
      isProduction: true,
      useHostPrefix: true,
      sameSite: "strict",
      maxAgeSeconds: 3600,
    });

    assert(serialized.startsWith("__Host-session_id=xyz123"), "Must use __Host- prefix in production");
    assert(serialized.includes("HttpOnly"), "Must enforce HttpOnly");
    assert(serialized.includes("Secure"), "Must enforce Secure flag");
    assert(serialized.includes("SameSite=Strict"), "Must enforce SameSite=Strict");
    assert(serialized.includes("Path=/"), "Must specify Path=/");
  });

  // --------------------------------------------------------------------------
  // TEST 3: CSRF Double Submit Token Verification
  // --------------------------------------------------------------------------
  await runner.runTest("CSRF: Cryptographic token validation & mismatch rejection", () => {
    const validToken = CsrfProtection.generateToken();
    assert(CsrfProtection.verifyToken(validToken), "Valid token must pass verification");
    assert(!CsrfProtection.verifyToken("tampered_token_string"), "Tampered token must fail verification");

    // Test request validation
    const validReq = new NextRequest("http://localhost:3000/api/wallet/spend", {
      method: "POST",
      headers: {
        cookie: `platform_csrf_token=${validToken}`,
        "x-csrf-token": validToken,
      },
    });
    const checkResult = CsrfProtection.validateRequest(validReq);
    assertEqual(checkResult.isValid, true, "Matching cookie and header token must succeed");

    const mismatchReq = new NextRequest("http://localhost:3000/api/wallet/spend", {
      method: "POST",
      headers: {
        cookie: `platform_csrf_token=${validToken}`,
        "x-csrf-token": "attacker_forged_token",
      },
    });
    const mismatchResult = CsrfProtection.validateRequest(mismatchReq);
    assertEqual(mismatchResult.isValid, false, "Mismatched token must fail");
  });

  // --------------------------------------------------------------------------
  // TEST 4: Distributed Rate Limiting (Sliding Window)
  // --------------------------------------------------------------------------
  await runner.runTest("Rate Limiter: Limits request burst and computes retry-after headers", async () => {
    RateLimiter.resetMemoryStore();
    const testIp = "192.168.1.100";
    const policy = { name: "TEST_BURST", maxRequests: 3, windowSeconds: 10 };

    const r1 = await RateLimiter.check(testIp, policy);
    assertEqual(r1.allowed, true, "Request 1 allowed");
    assertEqual(r1.remaining, 2, "Remaining 2");

    const r2 = await RateLimiter.check(testIp, policy);
    assertEqual(r2.allowed, true, "Request 2 allowed");

    const r3 = await RateLimiter.check(testIp, policy);
    assertEqual(r3.allowed, true, "Request 3 allowed");

    const r4 = await RateLimiter.check(testIp, policy);
    assertEqual(r4.allowed, false, "Request 4 must be blocked (burst limit reached)");

    const headers = RateLimiter.getHeaders(r4);
    assertEqual(headers["X-RateLimit-Limit"], "3", "Limit header matches");
    assertEqual(headers["X-RateLimit-Remaining"], "0", "Remaining header is 0");
    assert(headers["Retry-After"] !== undefined, "Retry-After header must be set");
  });

  // --------------------------------------------------------------------------
  // TEST 5: Administrative RBAC & Justification Enforcement
  // --------------------------------------------------------------------------
  await runner.runTest("Admin RBAC: High-risk operations require documented justification", async () => {
    const adminUser: any = {
      id: "usr_admin_01",
      email: "admin@platform.local",
      username: "superadmin",
      role: "ADMIN",
    };

    // Attempt high-risk action (USERS_BAN) without justification
    await assertRejects(
      async () => {
        await AdminGuard.assertAuthorized({
          adminUser,
          permission: "USERS_BAN",
          resourceType: "USER",
          targetId: "target_usr_99",
          justification: "", // Missing justification
        });
      },
      "requires a documented business justification",
      "Must reject high-risk admin action without justification"
    );

    // Provide valid justification
    const authResult = await AdminGuard.assertAuthorized({
      adminUser,
      permission: "USERS_BAN",
      resourceType: "USER",
      targetId: "target_usr_99",
      justification: "Confirmed severe terms of service violation ticket #4402",
    });

    assertEqual(authResult.authorized, true, "Must authorize with valid permission and justification");
  });

  // --------------------------------------------------------------------------
  // TEST 6: Database Security & Query Injection Validation
  // --------------------------------------------------------------------------
  await runner.runTest("DB Security: Detects insecure connections and unparameterized SQL syntax", () => {
    const auditInsecure = DatabaseSecurity.auditConnectionConfig("postgres://root:root@localhost:5432/platform", "production");
    assertEqual(auditInsecure.isSecure, false, "Insecure URL in production must fail audit");
    assert(auditInsecure.violations.length >= 2, "Should identify missing SSL and localhost in prod");

    const safeSql = DatabaseSecurity.validateQuerySafety("SELECT * FROM users WHERE id = $1");
    assertEqual(safeSql.isSafe, true, "Parameterized query must pass");

    const dangerousSql = DatabaseSecurity.validateQuerySafety("SELECT * FROM users WHERE id = '${userInput}'; DROP TABLE users;");
    assertEqual(dangerousSql.isSafe, false, "Dangerous injection pattern must be flagged");
  });

  // --------------------------------------------------------------------------
  // TEST 7: Secret Scanner Content Detection
  // --------------------------------------------------------------------------
  await runner.runTest("Secret Scanner: Flags private keys and live API tokens in scanned text", () => {
    const sampleDirtyCode = [
      'const AWS_KEY = "' + 'AKIA' + 'IOSFODNN7EXAMPLE";',
      'const STRIPE = "' + 'sk_live_' + '123456789012345678901234";',
    ].join("\n");

    const findings = SecretScanner.scanContent(sampleDirtyCode, "sample.ts");
    assertEqual(findings.length, 2, "Must detect both AWS key and Stripe live key");
  });

  const summary = runner.printFooter();
  return summary.failedCount === 0;
}

if (require.main === module) {
  runSecurityArchitectureTests().then((success) => process.exit(success ? 0 : 1));
}
