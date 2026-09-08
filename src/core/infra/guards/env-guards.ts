/**
 * ============================================================================
 * RUNTIME ENVIRONMENT OPERATION GUARDS
 * ============================================================================
 * Programmatic guards to protect sensitive operations from execution in the wrong environment.
 */

import { AppEnvironment } from "../../config/env-schema";
import { env } from "../../config/environment";
import { Logger } from "../../../lib/logger";

export interface GuardOptions {
  allowedEnvironments: AppEnvironment[];
  actionName: string;
  auditActorId?: string;
}

/**
 * Wraps an asynchronous operation with an environment validation guard.
 */
export async function withEnvironmentGuard<T>(
  options: GuardOptions,
  operation: () => Promise<T>
): Promise<T> {
  const currentEnv = env.getEnvironmentName();

  if (!options.allowedEnvironments.includes(currentEnv)) {
    const errorMsg = `[SECURITY_VIOLATION] Attempted to execute '${options.actionName}' in prohibited environment '${currentEnv}'. Allowed: [${options.allowedEnvironments.join(
      ", "
    )}].`;

    Logger.error(errorMsg, undefined, {
      userId: options.auditActorId,
      metadata: {
        action: options.actionName,
        currentEnv,
        allowedEnvironments: options.allowedEnvironments,
      },
    });

    throw new Error(errorMsg);
  }

  Logger.info(`[GUARD_PASSED] Executing '${options.actionName}' in environment '${currentEnv}'.`);
  return await operation();
}

/**
 * Specifically prevents destructive development/test fixtures from being injected into production or staging.
 */
export function assertCanRunMockAdapter(adapterName: string): void {
  if (env.isProduction()) {
    throw new Error(
      `[CRITICAL_SECURITY_ERROR] Mock adapter '${adapterName}' cannot be initialized in PRODUCTION.`
    );
  }
}
