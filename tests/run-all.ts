/**
 * MASTER TEST ORCHESTRATOR & AGGREGATE REPORTER
 * 
 * Runs all testing layers across the platform:
 * 1. Unit Tests (Business Functions & Algorithms)
 * 2. Integration Tests (Database Transactions & Atomicity)
 * 3. API Tests (Route Handlers & HTTP Contracts)
 * 4. Security Tests (Authorization Boundaries & Zero-Trust)
 * 5. Financial Tests (10 Critical Failure Scenarios)
 * 6. End-to-End Tests (Full User Journeys)
 * 7. Load Tests (High-Traffic Concurrency & Contention)
 * 8. Observability Tests (Metrics Registry, Tracing & Logging)
 * 9. Security Architecture (#68 Tests: CSRF, Cookies, RateLimiter, AdminGuard)
 * 10. Privacy Architecture (#69 Tests: Field Encryption, Vault, Retention, GDPR Deletion)
 * 11. Infra Tests (Database Backup & Restoration Verification Drill)
 */

import { runUnitTests } from "./unit/business-functions.unit.test";
import { runEntitlementUnitTests } from "./unit/entitlements.unit.test";
import { runOrderUnitTests } from "./unit/orders.unit.test";
import { runEventStreamUnitTests } from "./unit/event-stream.unit.test";
import { runStateMachineUnitTests } from "./unit/state-machines.unit.test";
import { runOrdersEntitlementsIntegrationTests } from "./integration/orders-entitlements.integration.test";
import { runBehavioralEventsIntegrationTests } from "./integration/behavioral-events.integration.test";
import { runStateMachineIntegrationTests } from "./integration/state-machines.integration.test";
import { runIntegrationTests } from "./integration/database-transactions.integration.test";
import { runApiTests } from "./api/api-endpoints.test";
import { runSecurityTests } from "./security/authorization-boundaries.security.test";
import { runFinancialScenarios } from "./financial/financial-scenarios.test";
import { runE2eTests } from "./e2e/user-journeys.e2e.test";
import { runLoadTests } from "./load/high-traffic.load.test";
import { runObservabilityTests } from "./unit/observability.unit.test";
import { runSecurityArchitectureTests } from "./unit/security.unit.test";
import { runPrivacyArchitectureTests } from "./unit/privacy.unit.test";
import { runBackupRestoreTests } from "./infra/backup-restore.test";

interface SuiteRunSummary {
  layer: string;
  name: string;
  passed: boolean;
  durationMs: number;
}

async function runMasterTestSuite() {
  console.log(`\n\x1b[1m\x1b[35m===============================================================================\x1b[0m`);
  console.log(`\x1b[1m\x1b[35m🚀 MASTER TEST SUITE: FULL PLATFORM VERIFICATION\x1b[0m`);
  console.log(`\x1b[1m\x1b[35m===============================================================================\x1b[0m`);

  const suiteRuns: SuiteRunSummary[] = [];
  const overallStart = performance.now();

  const suites = [
    { layer: "Layer 1A", name: "Unit: Business Functions", runner: runUnitTests },
    { layer: "Layer 1B", name: "Unit: Entitlement Engine", runner: runEntitlementUnitTests },
    { layer: "Layer 1C", name: "Unit: Order Management Engine", runner: runOrderUnitTests },
    { layer: "Layer 1D", name: "Unit: Behavioral Event Stream", runner: runEventStreamUnitTests },
    { layer: "Layer 1E", name: "Unit: 8 Domain State Machines", runner: runStateMachineUnitTests },
    { layer: "Layer 2A", name: "Integration: Database Transactions", runner: runIntegrationTests },
    { layer: "Layer 2B", name: "Integration: Orders & Entitlements Triad", runner: runOrdersEntitlementsIntegrationTests },
    { layer: "Layer 2C", name: "Integration: Behavioral Events 8-Engine Fan-Out", runner: runBehavioralEventsIntegrationTests },
    { layer: "Layer 2D", name: "Integration: State Machines & Invariants", runner: runStateMachineIntegrationTests },
    { layer: "Layer 3", name: "API: Route Handlers & Contracts", runner: runApiTests },
    { layer: "Layer 4", name: "Security: Authorization Boundaries", runner: runSecurityTests },
    { layer: "Layer 5", name: "Financial: 10 Critical Scenarios", runner: runFinancialScenarios },
    { layer: "Layer 6", name: "E2E: Full User Journeys", runner: runE2eTests },
    { layer: "Layer 7", name: "Load: High-Traffic Concurrency", runner: runLoadTests },
    { layer: "Layer 8", name: "Observability: Metrics & Tracing", runner: runObservabilityTests },
    { layer: "Layer 9", name: "Security: #68 Arch & CSRF/RateLimit", runner: runSecurityArchitectureTests },
    { layer: "Layer 10", name: "Privacy: #69 Vault & Retention", runner: runPrivacyArchitectureTests },
    { layer: "Layer 11", name: "Infra: Backup Restoration Drill", runner: runBackupRestoreTests },
  ];

  for (const s of suites) {
    const t0 = performance.now();
    try {
      const passed = await s.runner();
      const durationMs = Math.round(performance.now() - t0);
      suiteRuns.push({ layer: s.layer, name: s.name, passed, durationMs });
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - t0);
      console.error(`\x1b[31mSuite Crash [${s.name}]:\x1b[0m`, err);
      suiteRuns.push({ layer: s.layer, name: s.name, passed: false, durationMs });
    }
  }

  const overallDuration = Math.round(performance.now() - overallStart);
  const totalPassedSuites = suiteRuns.filter((s) => s.passed).length;
  const totalFailedSuites = suiteRuns.filter((s) => !s.passed).length;

  console.log(`\n\x1b[1m\x1b[35m===============================================================================\x1b[0m`);
  console.log(`\x1b[1m\x1b[35m📊 MASTER TEST EXECUTION SUMMARY\x1b[0m`);
  console.log(`\x1b[1m\x1b[35m===============================================================================\x1b[0m\n`);

  console.log(`  \x1b[1m${"Layer".padEnd(10)} | ${"Suite Name".padEnd(38)} | ${"Status".padEnd(10)} | ${"Duration".padEnd(10)}\x1b[0m`);
  console.log(`  ${"-".repeat(10)}-+-${"-".repeat(38)}-+-${"-".repeat(10)}-+-${"-".repeat(10)}`);

  for (const s of suiteRuns) {
    const statusStr = s.passed ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
    console.log(`  ${s.layer.padEnd(10)} | ${s.name.padEnd(38)} | ${statusStr.padEnd(19)} | ${`${s.durationMs}ms`.padEnd(10)}`);
  }

  console.log(`\n\x1b[1mOverall Result:\x1b[0m ${
    totalFailedSuites === 0
      ? `\x1b[32m\x1b[1mALL ${totalPassedSuites} SUITES PASSED\x1b[0m`
      : `\x1b[31m\x1b[1m${totalFailedSuites} SUITES FAILED\x1b[0m, \x1b[32m${totalPassedSuites} passed\x1b[0m`
  } (Completed in ${overallDuration}ms)\n`);

  if (totalFailedSuites > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runMasterTestSuite();
}
