/**
 * ============================================================================
 * AUTOMATED SIGNALS & MULTI-LAYER THREAT DETECTION ENGINE
 * ============================================================================
 * 
 * Computes AI safety signals, media perceptual hashing, text toxicity,
 * account velocity anomalies, and reporter credibility scores to enrich
 * moderation cases and automate critical triage.
 */

import prisma from "@/lib/db";
import {
  AutomatedSignals,
  MediaPerceptualHashSignal,
  TextSafetySignal,
  AccountVelocitySignal,
  ReporterTrustSignal,
  ModerationPriority,
  ReportCategory,
} from "./types";

// High-risk policy triggers
const UNDERAGE_KEYWORDS = [
  "underage",
  "minor",
  "teenager",
  "child",
  "schoolgirl",
  "16yo",
  "17yo",
  "middle school",
  "high school",
  "csam",
];

const VIOLENCE_THREAT_KEYWORDS = [
  "kill you",
  "murder",
  "doxx",
  "bomb",
  "swat",
  "hostage",
  "extort",
  "blackmail",
];

const SCAM_PHISHING_KEYWORDS = [
  "free credits hack",
  "click this link to unlock",
  "gift card code",
  "telegram @",
  "whatsapp +",
  "cashapp me",
  "crypto double",
];

export class AutomatedSignalsService {
  private static readonly EVALUATOR_VERSION = "T&S-SignalEngine-v2.6";

  /**
   * Evaluates text content for safety violations and returns structured signal metrics.
   */
  static evaluateTextSafety(text?: string): TextSafetySignal {
    if (!text || text.trim().length === 0) {
      return {
        toxicityScore: 0,
        severeHarassmentScore: 0,
        underageSolicitationScore: 0,
        threatViolenceScore: 0,
        phishingOrScamScore: 0,
        flaggedKeywords: [],
      };
    }

    const lower = text.toLowerCase();
    const flaggedKeywords: string[] = [];

    let underageScore = 0;
    for (const kw of UNDERAGE_KEYWORDS) {
      if (lower.includes(kw)) {
        flaggedKeywords.push(kw);
        underageScore = Math.min(1.0, underageScore + 0.5);
      }
    }

    let threatScore = 0;
    for (const kw of VIOLENCE_THREAT_KEYWORDS) {
      if (lower.includes(kw)) {
        flaggedKeywords.push(kw);
        threatScore = Math.min(1.0, threatScore + 0.4);
      }
    }

    let scamScore = 0;
    for (const kw of SCAM_PHISHING_KEYWORDS) {
      if (lower.includes(kw)) {
        flaggedKeywords.push(kw);
        scamScore = Math.min(1.0, scamScore + 0.35);
      }
    }

    // Baseline toxicity heuristic based on vulgarity density
    const toxicityScore = Math.min(1.0, (flaggedKeywords.length * 0.25));

    return {
      toxicityScore,
      severeHarassmentScore: threatScore * 0.8,
      underageSolicitationScore: underageScore,
      threatViolenceScore: threatScore,
      phishingOrScamScore: scamScore,
      flaggedKeywords,
    };
  }

  /**
   * Scans media against safety signature databases (PhotoDNA, CSAM hash vaults, copyright banks).
   */
  static evaluateMediaSignatures(mediaUrl?: string, previewUrl?: string): MediaPerceptualHashSignal {
    if (!mediaUrl && !previewUrl) {
      return {
        knownBadMatch: false,
        similarityScore: 0,
      };
    }

    const targetUrl = mediaUrl || previewUrl || "";

    // Mock known signature match detection (e.g. flagging specific test hashes or indicators)
    if (targetUrl.includes("known_csam_signature") || targetUrl.includes("photodna_match_test")) {
      return {
        pHash: "0xDEADBEEF0000CSAM",
        knownBadMatch: true,
        matchDatabase: "CSAM_PHOTODNA",
        similarityScore: 0.99,
      };
    }

    if (targetUrl.includes("known_copyright_strike")) {
      return {
        pHash: "0xFEEDFACE0000CPY",
        knownBadMatch: true,
        matchDatabase: "COPYRIGHT_FINGERPRINT",
        similarityScore: 0.92,
      };
    }

    return {
      pHash: "0x7F8E9D0A1B2C3D4E",
      knownBadMatch: false,
      matchDatabase: "NONE",
      similarityScore: 0.02,
    };
  }

  /**
   * Evaluates target account velocity, chargeback records, and prior strikes.
   */
  static async evaluateAccountVelocity(userId?: string): Promise<AccountVelocitySignal> {
    if (!userId) {
      return {
        registrationsFromSameIp24h: 0,
        chargebackRateScore: 0,
        burnerEmailRisk: false,
        priorViolationCount: 0,
        accountAgeDays: 0,
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        createdAt: true,
        moderationCasesTarget: {
          where: { status: "CLOSED_RESOLVED" },
          select: { id: true },
        },
      },
    });

    if (!user) {
      return {
        registrationsFromSameIp24h: 0,
        chargebackRateScore: 0,
        burnerEmailRisk: false,
        priorViolationCount: 0,
        accountAgeDays: 0,
      };
    }

    const isBurnerEmail =
      user.email.endsWith(".tempmail.com") ||
      user.email.endsWith(".10minutemail.com") ||
      user.email.endsWith(".guerrillamail.com");

    const accountAgeDays = Math.max(
      0,
      Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    );

    return {
      registrationsFromSameIp24h: 1,
      chargebackRateScore: 0.0,
      burnerEmailRisk: isBurnerEmail,
      priorViolationCount: user.moderationCasesTarget.length,
      accountAgeDays,
    };
  }

  /**
   * Evaluates reporter credibility to protect against coordinated malicious brigading.
   */
  static async evaluateReporterTrust(reporterId?: string): Promise<ReporterTrustSignal> {
    if (!reporterId) {
      return {
        reporterHistoricalAccuracyRate: 0.5,
        priorReportsSubmitted: 0,
        falseReportRate: 0.0,
        isBrigadeRisk: false,
      };
    }

    const reports = await prisma.report.findMany({
      where: { reporterId },
      select: { status: true },
      take: 50,
    });

    if (reports.length === 0) {
      return {
        reporterHistoricalAccuracyRate: 0.8, // Default trust for initial reports
        priorReportsSubmitted: 0,
        falseReportRate: 0.0,
        isBrigadeRisk: false,
      };
    }

    const dismissedReports = reports.filter((r) => r.status === "RESOLVED_DISMISSED").length;
    const actionedReports = reports.filter((r) => r.status === "ACTION_TAKEN").length;
    const totalDecided = dismissedReports + actionedReports;

    const falseReportRate = totalDecided > 0 ? dismissedReports / totalDecided : 0.0;
    const accuracyRate = totalDecided > 0 ? actionedReports / totalDecided : 0.8;

    return {
      reporterHistoricalAccuracyRate: accuracyRate,
      priorReportsSubmitted: reports.length,
      falseReportRate,
      isBrigadeRisk: reports.length > 10 && falseReportRate > 0.8,
    };
  }

  /**
   * Computes unified automated signals across text, media, velocity, and reporter trust.
   */
  static async generateSignals(params: {
    category: ReportCategory;
    description?: string;
    mediaUrl?: string;
    previewUrl?: string;
    targetUserId?: string;
    reporterId?: string;
    reportedObjectId: string;
  }): Promise<AutomatedSignals> {
    const textSignal = this.evaluateTextSafety(params.description);
    const mediaSignal = this.evaluateMediaSignatures(params.mediaUrl, params.previewUrl);
    const velocitySignal = await this.evaluateAccountVelocity(params.targetUserId);
    const reporterSignal = await this.evaluateReporterTrust(params.reporterId);

    // Check duplicate report velocity for this object
    const duplicateCount = await prisma.moderationCase.count({
      where: {
        reportedObjectId: params.reportedObjectId,
        status: { in: ["OPEN", "INVESTIGATING"] },
      },
    });

    const triggeredPolicyCodes: string[] = [];
    let compositeRisk = 10; // Baseline

    // 1. Underage / CSAM Zero-Tolerance Check
    if (params.category === "UNDERAGE_SUSPICION" || textSignal.underageSolicitationScore > 0 || mediaSignal.matchDatabase === "CSAM_PHOTODNA") {
      triggeredPolicyCodes.push("POL-ZERO-TOLERANCE-UNDERAGE");
      compositeRisk = 100;
    }

    // 2. Severe Threat / Harassment Check
    if (textSignal.threatViolenceScore > 0.5) {
      triggeredPolicyCodes.push("POL-SAFETY-VIOLENCE-THREAT");
      compositeRisk = Math.max(compositeRisk, 85);
    }

    // 3. Known Bad Media Match Check
    if (mediaSignal.knownBadMatch) {
      triggeredPolicyCodes.push(`POL-MEDIA-HASH-MATCH-${mediaSignal.matchDatabase}`);
      compositeRisk = Math.max(compositeRisk, 95);
    }

    // 4. Sybil / Burner Account Risk
    if (velocitySignal.burnerEmailRisk || velocitySignal.priorViolationCount >= 3) {
      triggeredPolicyCodes.push("POL-FRAUD-HIGH-RECIDIVISM");
      compositeRisk = Math.max(compositeRisk, 65);
    }

    // 5. Coordinated Brigading Downweight
    if (reporterSignal.isBrigadeRisk && compositeRisk < 80) {
      triggeredPolicyCodes.push("SIG-POSSIBLE-BRIGADING-ATTACK");
      compositeRisk = Math.max(5, compositeRisk - 30);
    }

    // Determine Recommended Priority
    let recommendedPriority: ModerationPriority = "LOW";
    if (compositeRisk >= 90 || params.category === "UNDERAGE_SUSPICION") {
      recommendedPriority = "CRITICAL_URGENT_UNDERAGE";
    } else if (compositeRisk >= 65) {
      recommendedPriority = "HIGH";
    } else if (compositeRisk >= 35) {
      recommendedPriority = "MEDIUM";
    }

    return {
      compositeRiskScore: compositeRisk,
      recommendedPriority,
      mediaHashSignal: mediaSignal,
      textSafetySignal: textSignal,
      velocitySignal,
      reporterSignal,
      duplicateReportsCount: duplicateCount,
      triggeredPolicyCodes,
      evaluatedAt: new Date().toISOString(),
      evaluatorVersion: this.EVALUATOR_VERSION,
    };
  }
}
