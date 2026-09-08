/**
 * UNIFIED TEST RUNNER & ASSERTION SUITE
 * 
 * Provides a standalone test execution engine with assertion utilities,
 * execution timing, formatted console reporters, and exit code management.
 */

export interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: Error;
}

export interface SuiteResult {
  suiteName: string;
  results: TestResult[];
  passedCount: number;
  failedCount: number;
  totalDurationMs: number;
}

export class TestRunner {
  private suiteName: string;
  private results: TestResult[] = [];
  private currentTestStartTime: number = 0;

  constructor(suiteName: string) {
    this.suiteName = suiteName;
  }

  public async runTest(testName: string, fn: () => Promise<void> | void): Promise<boolean> {
    const start = performance.now();
    try {
      await fn();
      const durationMs = Math.round(performance.now() - start);
      this.results.push({ name: testName, passed: true, durationMs });
      console.log(`  \x1b[32m✓\x1b[0m ${testName} \x1b[90m(${durationMs}ms)\x1b[0m`);
      return true;
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      this.results.push({ name: testName, passed: false, durationMs, error: err });
      console.error(`  \x1b[31m✗\x1b[0m ${testName} \x1b[90m(${durationMs}ms)\x1b[0m`);
      console.error(`    \x1b[31mError:\x1b[0m ${err?.message || err}`);
      if (err?.stack && process.env.VERBOSE_TESTS) {
        console.error(`    \x1b[90m${err.stack}\x1b[0m`);
      }
      return false;
    }
  }

  public getSummary(): SuiteResult {
    const passedCount = this.results.filter((r) => r.passed).length;
    const failedCount = this.results.filter((r) => !r.passed).length;
    const totalDurationMs = this.results.reduce((acc, r) => acc + r.durationMs, 0);

    return {
      suiteName: this.suiteName,
      results: this.results,
      passedCount,
      failedCount,
      totalDurationMs,
    };
  }

  public printHeader() {
    console.log(`\n\x1b[1m\x1b[36m===============================================================\x1b[0m`);
    console.log(`\x1b[1m\x1b[36m🧪 TEST SUITE: ${this.suiteName}\x1b[0m`);
    console.log(`\x1b[1m\x1b[36m===============================================================\x1b[0m\n`);
  }

  public printFooter(): SuiteResult {
    const summary = this.getSummary();
    console.log(`\n\x1b[90m---------------------------------------------------------------\x1b[0m`);
    if (summary.failedCount === 0) {
      console.log(
        `\x1b[32m\x1b[1mPASS\x1b[0m ${this.suiteName}: \x1b[32m${summary.passedCount} passed\x1b[0m in ${summary.totalDurationMs}ms`
      );
    } else {
      console.log(
        `\x1b[31m\x1b[1mFAIL\x1b[0m ${this.suiteName}: \x1b[31m${summary.failedCount} failed\x1b[0m, \x1b[32m${summary.passedCount} passed\x1b[0m in ${summary.totalDurationMs}ms`
      );
    }
    console.log(`\x1b[90m---------------------------------------------------------------\x1b[0m\n`);
    return summary;
  }
}

// ----------------------------------------------------------------------------
// STANDALONE ASSERTION HELPERS
// ----------------------------------------------------------------------------

export function assert(condition: any, message: string = "Assertion failed"): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected [${expected}] (${typeof expected}), but received [${actual}] (${typeof actual})`
    );
  }
}

export function assertNotEqual<T>(actual: T, unexpected: T, message?: string) {
  if (actual === unexpected) {
    throw new Error(message || `Expected value NOT to be [${unexpected}], but it was.`);
  }
}

export function assertDeepEqual(actual: any, expected: any, message?: string) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(
      message || `Deep equality mismatch:\nExpected: ${expectedStr}\nReceived: ${actualStr}`
    );
  }
}

export async function assertRejects(
  fn: () => Promise<any>,
  expectedErrorTypeOrSubstring?: any,
  message?: string
) {
  try {
    await fn();
    throw new Error(message || "Expected promise to reject, but it resolved successfully.");
  } catch (err: any) {
    if (err.message?.includes("Expected promise to reject")) {
      throw err;
    }
    if (typeof expectedErrorTypeOrSubstring === "string") {
      if (!err.message?.toLowerCase().includes(expectedErrorTypeOrSubstring.toLowerCase())) {
        throw new Error(
          `Expected rejection message to contain "${expectedErrorTypeOrSubstring}", but got: "${err.message}"`
        );
      }
    } else if (typeof expectedErrorTypeOrSubstring === "function") {
      if (!(err instanceof expectedErrorTypeOrSubstring)) {
        throw new Error(
          `Expected rejection error to be instance of ${expectedErrorTypeOrSubstring.name}, but got: ${err?.constructor?.name || typeof err} (${err.message})`
        );
      }
    }
    return err;
  }
}

export function assertThrows(fn: () => any, expectedErrorTypeOrSubstring?: any, message?: string) {
  try {
    fn();
    throw new Error(message || "Expected function to throw, but it executed without error.");
  } catch (err: any) {
    if (err.message?.includes("Expected function to throw")) {
      throw err;
    }
    if (typeof expectedErrorTypeOrSubstring === "string") {
      if (!err.message?.toLowerCase().includes(expectedErrorTypeOrSubstring.toLowerCase())) {
        throw new Error(
          `Expected error message to contain "${expectedErrorTypeOrSubstring}", but got: "${err.message}"`
        );
      }
    } else if (typeof expectedErrorTypeOrSubstring === "function") {
      if (!(err instanceof expectedErrorTypeOrSubstring)) {
        throw new Error(
          `Expected error to be instance of ${expectedErrorTypeOrSubstring.name}, but got: ${err?.constructor?.name || typeof err}`
        );
      }
    }
    return err;
  }
}
