import { prisma } from "@/lib/db";
import { CaseService } from "@/modules/trust-safety/case.service";
import {
  Job,
  ContentModeratePayload,
  ContentModerateResult,
  WorkerHandler,
} from "../types";
import { jobDispatcher } from "../core/job-dispatcher";

export const contentModeratorWorker: WorkerHandler<
  ContentModeratePayload,
  ContentModerateResult
> = async (job: Job<ContentModeratePayload>, updateProgress) => {
  const {
    contentId,
    livestreamId,
    creatorId,
    contentType,
    mediaUrl,
    textSnippet,
    checkUnderage2257,
    checkBannedKeywords,
  } = job.payload;

  console.log(`[ContentModeratorWorker] 🛡️ Scanning content for creator ${creatorId}`);
  await updateProgress(10);

  const flags: string[] = [];
  let riskScore = 0.05; // Base low risk

  // 1. Check Creator 2257 & KYC Compliance Status in Database
  if (checkUnderage2257) {
    try {
      const creator = await prisma.creatorProfile.findUnique({
        where: { id: creatorId },
        include: {
          user: { select: { kycStatus: true, isBanned: true } },
          verifications: { where: { verificationStatus: "APPROVED" } },
        },
      });

      if (creator && creator.user.kycStatus !== "COMPLIANCE_2257_APPROVED") {
        flags.push("MISSING_2257_COMPLIANCE_CLEARANCE");
        riskScore += 0.7;
      }
      if (creator?.user.isBanned) {
        flags.push("CREATOR_ACCOUNT_BANNED");
        riskScore += 0.9;
      }
    } catch (err: any) {
      console.warn("[ContentModeratorWorker] DB compliance lookup warning:", err.message);
    }
  }

  await updateProgress(40);

  // 2. Text Keyword / Chat Scan
  if (checkBannedKeywords && textSnippet) {
    const prohibitedPatterns = [
      /\b(underage|minor|child|teenager|csam|doxx|nazi|kill yourself)\b/i,
      /\b(stolen card|free bins|dump ccv|chargeback fraud)\b/i,
    ];

    for (const pattern of prohibitedPatterns) {
      if (pattern.test(textSnippet)) {
        flags.push("PROHIBITED_KEYWORD_DETECTED");
        riskScore = Math.max(riskScore, 0.95);
      }
    }
  }

  await updateProgress(70);

  // 3. Media Safety Heuristic (Simulated AI Vision/Audio classifier)
  if (mediaUrl && contentType === "VIDEO") {
    const visionRiskAssessment = 0.08;
    riskScore = Math.max(riskScore, visionRiskAssessment);
  }

  await updateProgress(85);

  // 4. Decision Engine & Action Routing
  let actionTaken: "APPROVED" | "QUARANTINED" | "ESCALATED_TO_MODERATORS" | "BANNED" = "APPROVED";
  let moderationCaseId: string | undefined;

  if (riskScore >= 0.85) {
    actionTaken = "QUARANTINED";

    // Auto-create High-Priority Moderation Case in Database
    try {
      const targetUser = await prisma.creatorProfile.findUnique({
        where: { id: creatorId },
        select: { userId: true },
      });

      if (targetUser) {
        const modCase = await CaseService.createCase(
          {
            reportedObjectType: contentId ? "CONTENT" : "CREATOR",
            reportedObjectId: contentId || creatorId,
            reasonCategory: flags.includes("MISSING_2257_COMPLIANCE_CLEARANCE")
              ? "UNDERAGE_SUSPICION"
              : "OTHER",
            reason: `Automated Background Moderation Flag: ${flags.join(", ")}. Risk score: ${riskScore.toFixed(2)}`,
            priority: flags.includes("MISSING_2257_COMPLIANCE_CLEARANCE")
              ? "CRITICAL_URGENT_UNDERAGE"
              : "HIGH",
            reporterType: "SYSTEM_AUTOMATION",
          },
          {
            actorType: "SYSTEM_AUTOMATION",
          }
        );
        moderationCaseId = modCase.id;

        await jobDispatcher.dispatchEmail({
          to: "trust-and-safety@platform.local",
          subject: `[URGENT] Automated Quarantine: Creator ${creatorId}`,
          template: "SECURITY_ALERT",
          variables: {
            creatorId,
            flags: flags.join(", "),
            riskScore: riskScore.toFixed(2),
            moderationCaseId: modCase.id,
          },
        });
      }
    } catch (e: any) {
      console.warn("[ContentModeratorWorker] DB case creation warning:", e.message);
    }
  } else if (riskScore > 0.4) {
    actionTaken = "ESCALATED_TO_MODERATORS";
  }

  await updateProgress(100);
  console.log(`[ContentModeratorWorker] ✅ Content moderation finished: action=${actionTaken}, risk=${riskScore.toFixed(2)}`);

  return {
    contentId,
    passed: riskScore < 0.85,
    riskScore,
    flags,
    actionTaken,
    moderationCaseId,
  };
};
