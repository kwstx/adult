/**
 * ============================================================================
 * AUTHORITATIVE DATABASE SECURITY & ACCESS RESTRICTION POLICY
 * ============================================================================
 * Enforces database security invariants:
 * - SSL/TLS connection enforcement for staging and production
 * - Least-privilege role validation
 * - Connection pool governance
 * - Raw query injection defense
 */

export interface DatabaseSecurityAuditResult {
  isSecure: boolean;
  sslEnforced: boolean;
  poolGoverned: boolean;
  violations: string[];
  recommendations: string[];
}

export class DatabaseSecurity {
  /**
   * Audits database connection configuration against enterprise security policy.
   */
  public static auditConnectionConfig(
    databaseUrl: string,
    environment: string = process.env.NODE_ENV || "development",
    maxConnections: number = parseInt(process.env.DATABASE_MAX_CONNECTIONS || "50", 10)
  ): DatabaseSecurityAuditResult {
    const violations: string[] = [];
    const recommendations: string[] = [];
    const envStr = String(environment).toLowerCase();
    const isProdOrStaging = envStr === "production" || envStr === "staging";

    let sslEnforced = false;

    // 1. SSL/TLS Verification
    if (databaseUrl.includes("sslmode=require") || databaseUrl.includes("sslmode=verify-full") || databaseUrl.includes("ssl=true")) {
      sslEnforced = true;
    } else if (isProdOrStaging) {
      violations.push("Production/Staging database URL MUST enforce TLS via sslmode=require or sslmode=verify-full.");
    } else {
      recommendations.push("Local development database may use non-SSL connections; staging/prod must enforce TLS.");
    }

    // 2. Localhost in Production check
    if (envStr === "production" && (databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1"))) {
      violations.push("Production DATABASE_URL cannot point to localhost or 127.0.0.1.");
    }

    // 3. Pool Size Governance
    let poolGoverned = true;
    if (maxConnections > 100) {
      violations.push(`DATABASE_MAX_CONNECTIONS (${maxConnections}) exceeds safe limit (100) per application instance.`);
      poolGoverned = false;
    } else if (maxConnections < 5 && isProdOrStaging) {
      recommendations.push("Connection pool size is very small (<5) for a high-concurrency production workload.");
    }

    // 4. Default / Superuser check in URL
    if (isProdOrStaging && (databaseUrl.includes("postgres:postgres@") || databaseUrl.includes("root:root@"))) {
      violations.push("Database URL is using default root credentials. Application must connect with dedicated 'app_user' role.");
    }

    return {
      isSecure: violations.length === 0,
      sslEnforced,
      poolGoverned,
      violations,
      recommendations,
    };
  }

  /**
   * Asserts safe parameterized SQL syntax to prevent SQL injection in any raw query calls.
   */
  public static validateQuerySafety(rawQuery: string): { isSafe: boolean; warning?: string } {
    // Check for obvious dangerous unparameterized concatenation patterns
    const dangerousPatterns = [
      /WHERE\s+\w+\s*=\s*'[^']*\$\{[^}]+\}/i, // Template string injection in SQL
      /;\s*DROP\s+TABLE/i,
      /;\s*TRUNCATE\s+TABLE/i,
      /UNION\s+ALL\s+SELECT\s+NULL/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(rawQuery)) {
        return {
          isSafe: false,
          warning: `Potential unparameterized query vulnerability detected matching pattern: ${pattern}`,
        };
      }
    }

    return { isSafe: true };
  }
}
