/**
 * ============================================================================
 * AUTHORITATIVE TRUST & SAFETY ARCHITECTURE - COMPREHENSIVE TEST SUITE
 * ============================================================================
 * 
 * Verifies:
 * 1. Content Moderation States: Pending, Approved, Restricted, Removed, Appealed, Rejected
 * 2. Account Moderation States: Active, Restricted, Suspended, Banned, Under review
 * 3. Creator Moderation States: Application, Verification pending, Verified, Monetization enabled, Restricted, Suspended
 * 4. Moderation Cases: Reported object, Reporter, Reason, Evidence, Automated signals, Reviewer, Decision, Decision time, Appeal status
 * 5. Immutable Audit Events & Cryptographic Hash Chain Integrity
 * 6. Access Guards & Permission Matrices
 */

import prisma from "../src/lib/db";
import {
  ContentModerationService,
  AccountModerationService,
  CreatorModerationService,
  CaseService,
  AuditService,
  AutomatedSignalsService,
  TrustSafetyGuards,
  ContentStateMachine,
  AccountStateMachine,
  CreatorStateMachine,
} from "../src/modules/trust-safety";

async function runTrustSafetyTests() {
  console.log("================================================================================");
  console.log("🛡️  RUNNING TRUST & SAFETY ARCHITECTURE VERIFICATION TEST SUITE");
  console.log("================================================================================\n");

  let testCount = 0;
  let passCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    testCount++;
    if (condition) {
      passCount++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName} - ${detail || "Assertion failed"}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // --------------------------------------------------------------------------
  // 1. SETUP TEST ENTITIES
  // --------------------------------------------------------------------------
  console.log("🔹 STEP 1: Setting up Test Entities (Fan, Creator, Content, Moderator)...");

  const timestamp = Date.now();
  const testFan = await prisma.user.create({
    data: {
      email: `test_fan_${timestamp}@platform.test`,
      username: `fan_${timestamp}`,
      displayName: "Test Fan User",
      role: "FAN",
      moderationState: "ACTIVE",
    },
  });

  const testModerator = await prisma.user.create({
    data: {
      email: `test_mod_${timestamp}@platform.test`,
      username: `mod_${timestamp}`,
      displayName: "Senior Trust Officer",
      role: "MODERATOR",
      moderationState: "ACTIVE",
    },
  });

  const testCreatorUser = await prisma.user.create({
    data: {
      email: `test_creator_${timestamp}@platform.test`,
      username: `creator_${timestamp}`,
      displayName: "Creator Star",
      role: "CREATOR",
      moderationState: "ACTIVE",
      creatorProfile: {
        create: {
          bio: "Live performer",
          moderationState: "APPLICATION",
        },
      },
    },
    include: { creatorProfile: true },
  });

  const creatorProfileId = testCreatorUser.creatorProfile!.id;

  const testContent = await prisma.content.create({
    data: {
      creatorProfileId,
      title: "Test Stream Replay",
      description: "Exclusive member video",
      mediaUrl: "https://cdn.platform.local/videos/test.mp4",
      moderationState: "PENDING",
      isPublished: false,
    },
  });

  assert(testFan.moderationState === "ACTIVE", "User created with ACTIVE account state");
  assert(testCreatorUser.creatorProfile!.moderationState === "APPLICATION", "Creator created with APPLICATION state");
  assert(testContent.moderationState === "PENDING", "Content created with PENDING state");

  // --------------------------------------------------------------------------
  // 2. CONTENT MODERATION STATE MACHINE TRANSITIONS
  // --------------------------------------------------------------------------
  console.log("\n🔹 STEP 2: Verifying Content Moderation States (Pending -> Approved -> Restricted -> Removed -> Appealed -> Rejected)...");

  // PENDING -> APPROVED
  const contentApproved = await ContentModerationService.transitionState(
    testContent.id,
    "APPROVED",
    "Cleared by initial automated scan",
    { actorId: testModerator.id, actorType: "MODERATOR" }
  );
  assert(contentApproved.moderationState === "APPROVED", "Content transitioned PENDING -> APPROVED");
  assert(contentApproved.isPublished === true, "Approved content is published");

  // APPROVED -> RESTRICTED
  const contentRestricted = await ContentModerationService.transitionState(
    testContent.id,
    "RESTRICTED",
    "Contains sensitive 18+ themes requiring blurred preview",
    { actorId: testModerator.id, actorType: "MODERATOR" }
  );
  assert(contentRestricted.moderationState === "RESTRICTED", "Content transitioned APPROVED -> RESTRICTED");

  // Access check for Restricted content
  const accessRestricted = ContentModerationService.evaluateAccess(contentRestricted as any);
  assert(accessRestricted.isAccessible === true && accessRestricted.isBlurredPreview === true, "Restricted content requires blurred preview");

  // RESTRICTED -> REMOVED
  const contentRemoved = await ContentModerationService.transitionState(
    testContent.id,
    "REMOVED",
    "Reported for copyright claim",
    { actorId: testModerator.id, actorType: "MODERATOR" }
  );
  assert(contentRemoved.moderationState === "REMOVED", "Content transitioned RESTRICTED -> REMOVED");
  assert(contentRemoved.isPublished === false, "Removed content is unpublished");

  // REMOVED -> APPEALED
  const contentAppealed = await ContentModerationService.transitionState(
    testContent.id,
    "APPEALED",
    "Creator filed appeal with proof of license",
    { actorId: testCreatorUser.id, actorType: "CREATOR" }
  );
  assert(contentAppealed.moderationState === "APPEALED", "Content transitioned REMOVED -> APPEALED");

  // APPEALED -> REJECTED (Appeal denied)
  const contentRejected = await ContentModerationService.transitionState(
    testContent.id,
    "REMOVED", // Intermediate state
    "Pre-rejection cleanup",
    { actorId: testModerator.id, actorType: "MODERATOR" }
  );
  const finalRejected = await ContentModerationService.transitionState(
    testContent.id,
    "APPEALED",
    "Re-appeal",
    { actorId: testCreatorUser.id, actorType: "CREATOR" }
  );
  const contentFinalRejected = await ContentModerationService.transitionState(
    testContent.id,
    "REJECTED",
    "Appeal rejected by Senior Compliance Lead",
    { actorId: testModerator.id, actorType: "ADMIN" }
  );
  assert(contentFinalRejected.moderationState === "REJECTED", "Content transitioned APPEALED -> REJECTED");

  // --------------------------------------------------------------------------
  // 3. ACCOUNT MODERATION STATE MACHINE TRANSITIONS
  // --------------------------------------------------------------------------
  console.log("\n🔹 STEP 3: Verifying Account Moderation States (Active -> Restricted -> Suspended -> Banned -> Under review)...");

  // ACTIVE -> RESTRICTED
  const userRestricted = await AccountModerationService.transitionState(
    testFan.id,
    "RESTRICTED",
    "Excessive chat spam warning",
    { actorId: testModerator.id, actorType: "MODERATOR" }
  );
  assert(userRestricted.moderationState === "RESTRICTED", "Account transitioned ACTIVE -> RESTRICTED");
  const permRestricted = await AccountModerationService.evaluatePermissions(testFan.id);
  assert(permRestricted.canChat === false && permRestricted.canBrowse === true, "Restricted account cannot chat but can browse");

  // RESTRICTED -> UNDER_REVIEW
  const userUnderReview = await AccountModerationService.transitionState(
    testFan.id,
    "UNDER_REVIEW",
    "Identity & Chargeback investigation",
    { actorId: testModerator.id, actorType: "MODERATOR" }
  );
  assert(userUnderReview.moderationState === "UNDER_REVIEW", "Account transitioned RESTRICTED -> UNDER_REVIEW");
  const permUnderReview = await AccountModerationService.evaluatePermissions(testFan.id);
  assert(permUnderReview.canSendTips === false && permUnderReview.canWithdrawFunds === false, "Under review account has financial actions frozen");

  // UNDER_REVIEW -> SUSPENDED
  const userSuspended = await AccountModerationService.transitionState(
    testFan.id,
    "SUSPENDED",
    "48-hour temporary safety lockout",
    { actorId: testModerator.id, actorType: "MODERATOR" },
    48
  );
  assert(userSuspended.moderationState === "SUSPENDED", "Account transitioned UNDER_REVIEW -> SUSPENDED");
  const permSuspended = await AccountModerationService.evaluatePermissions(testFan.id);
  assert(permSuspended.canLogin === false, "Suspended account is locked out of login");

  // SUSPENDED -> BANNED
  const userBanned = await AccountModerationService.transitionState(
    testFan.id,
    "BANNED",
    "Permanent ban for egregious terms violation",
    { actorId: testModerator.id, actorType: "ADMIN" }
  );
  assert(userBanned.moderationState === "BANNED" && userBanned.isBanned === true, "Account transitioned SUSPENDED -> BANNED");

  // --------------------------------------------------------------------------
  // 4. CREATOR MODERATION STATE MACHINE TRANSITIONS
  // --------------------------------------------------------------------------
  console.log("\n🔹 STEP 4: Verifying Creator Moderation States (Application -> Verification pending -> Verified -> Monetization enabled -> Restricted -> Suspended)...");

  // APPLICATION -> VERIFICATION_PENDING
  const creatorPending = await CreatorModerationService.transitionState(
    creatorProfileId,
    "VERIFICATION_PENDING",
    "2257 photo ID and selfie uploaded",
    { actorId: testCreatorUser.id, actorType: "CREATOR" }
  );
  assert(creatorPending.moderationState === "VERIFICATION_PENDING", "Creator transitioned APPLICATION -> VERIFICATION_PENDING");

  // VERIFICATION_PENDING -> VERIFIED
  const creatorVerified = await CreatorModerationService.transitionState(
    creatorProfileId,
    "VERIFIED",
    "Government ID and custodian records verified",
    { actorId: testModerator.id, actorType: "ADMIN" }
  );
  assert(creatorVerified.moderationState === "VERIFIED", "Creator transitioned VERIFICATION_PENDING -> VERIFIED");
  const statusVerified = await CreatorModerationService.evaluateMonetizationStatus(creatorProfileId);
  assert(statusVerified.canGoLive === true && statusVerified.canRequestPayout === false, "Verified creator can go live but payout requires monetization enabled");

  // VERIFIED -> MONETIZATION_ENABLED
  const creatorMonetized = await CreatorModerationService.transitionState(
    creatorProfileId,
    "MONETIZATION_ENABLED",
    "Tax documents and bank payout profile approved",
    { actorId: testModerator.id, actorType: "ADMIN" }
  );
  assert(creatorMonetized.moderationState === "MONETIZATION_ENABLED", "Creator transitioned VERIFIED -> MONETIZATION_ENABLED");
  const statusMonetized = await CreatorModerationService.evaluateMonetizationStatus(creatorProfileId);
  assert(statusMonetized.canEarnCredits === true && statusMonetized.canRequestPayout === true, "Monetization enabled creator can earn and request payouts");

  // MONETIZATION_ENABLED -> RESTRICTED
  const creatorRestricted = await CreatorModerationService.transitionState(
    creatorProfileId,
    "RESTRICTED",
    "Monetization temporarily paused for compliance audit",
    { actorId: testModerator.id, actorType: "MODERATOR" }
  );
  assert(creatorRestricted.moderationState === "RESTRICTED", "Creator transitioned MONETIZATION_ENABLED -> RESTRICTED");

  // RESTRICTED -> SUSPENDED
  const creatorSuspended = await CreatorModerationService.transitionState(
    creatorProfileId,
    "SUSPENDED",
    "Safety suspension for broadcasting violation",
    { actorId: testModerator.id, actorType: "ADMIN" }
  );
  assert(creatorSuspended.moderationState === "SUSPENDED", "Creator transitioned RESTRICTED -> SUSPENDED");

  // --------------------------------------------------------------------------
  // 5. MODERATION CASE LIFECYCLE, AUTOMATED SIGNALS, DECISION & APPEAL
  // --------------------------------------------------------------------------
  console.log("\n🔹 STEP 5: Verifying Moderation Case Lifecycle (Intake, Signals, Reviewer, Decision, Appeal)...");

  // 5.1 Case Creation
  const newCase = await CaseService.createCase(
    {
      reportedObjectType: "CONTENT",
      reportedObjectId: testContent.id,
      reporterId: testFan.id,
      reporterType: "USER",
      reasonCategory: "HARASSMENT_ABUSE",
      reason: "User claims video contains severe harassment language and threats.",
      evidenceItems: [
        {
          id: "ev-1",
          type: "VIDEO_CLIP_OR_TIMESTAMP",
          timestampSeconds: 142,
          capturedAt: new Date().toISOString(),
          notes: "Timestamp 02:22 harassment remark",
        },
      ],
    },
    {
      actorId: testFan.id,
      actorType: "USER",
      ipAddress: "192.168.1.100",
    }
  );

  assert(Boolean(newCase.id), "Moderation case created with unique ID");
  assert(newCase.caseNumber.startsWith("CASE-"), `Valid case number format: ${newCase.caseNumber}`);
  assert(newCase.reportedObjectType === "CONTENT", "Case contains correct reported object type");
  assert(newCase.reporterId === testFan.id, "Case contains correct reporter");
  assert(Boolean(newCase.evidence), "Case contains structured evidence");
  assert(Boolean(newCase.automatedSignals), "Case contains automated signals");
  assert(newCase.status === "OPEN", "Initial case status is OPEN");
  assert(newCase.appealStatus === "NONE", "Initial appeal status is NONE");

  // Parse automated signals
  const parsedSignals = JSON.parse(newCase.automatedSignals!);
  assert(parsedSignals.compositeRiskScore !== undefined, `Automated signals evaluated composite risk: ${parsedSignals.compositeRiskScore}`);
  assert(Array.isArray(parsedSignals.triggeredPolicyCodes), "Automated signals tracked policy codes");

  // 5.2 Assign Reviewer
  const assignedCase = await CaseService.assignReviewer(newCase.id, testModerator.id, {
    actorId: testModerator.id,
    actorType: "MODERATOR",
  });
  assert(assignedCase.reviewerId === testModerator.id, "Case reviewer assigned");
  assert(assignedCase.status === "INVESTIGATING", "Case status moved to INVESTIGATING");

  // 5.3 Render Decision
  const decidedCase = await CaseService.renderDecision(
    {
      caseId: newCase.id,
      reviewerId: testModerator.id,
      decision: "REMOVED",
      decisionAction: "WARNING_MESSAGE",
      decisionNotes: "Confirmed harassment violation at timestamp 02:22. Content removed.",
      policyViolations: ["POL-SAFETY-HARASSMENT-01"],
    },
    {
      actorId: testModerator.id,
      actorType: "MODERATOR",
    }
  );

  assert(decidedCase.decision === "REMOVED", "Decision recorded on case");
  assert(Boolean(decidedCase.decisionTime), "Decision time recorded");
  assert(decidedCase.status === "CLOSED_RESOLVED", "Case status moved to CLOSED_RESOLVED");

  // Verify target content was transitioned to REMOVED
  const contentAfterDecision = await prisma.content.findUnique({ where: { id: testContent.id } });
  assert(contentAfterDecision?.moderationState === "REMOVED", "Target content state updated by decision execution");

  // 5.4 Submit Appeal
  const appealedCase = await CaseService.submitAppeal(
    {
      caseId: newCase.id,
      appellantUserId: testCreatorUser.id,
      appealReason: "The remark was taken out of context in a scripted satire sketch.",
      appealEvidenceItems: [
        {
          id: "ev-appeal-1",
          type: "DOCUMENT_VAULT_REF",
          url: "vault://scripts/satire_script.pdf",
          capturedAt: new Date().toISOString(),
          notes: "Full script context",
        },
      ],
    },
    {
      actorId: testCreatorUser.id,
      actorType: "CREATOR",
    }
  );

  assert(appealedCase.appealStatus === "PENDING", "Appeal status set to PENDING");
  assert(appealedCase.appealReason?.includes("scripted satire"), "Appeal reason recorded");

  // Verify target content was transitioned to APPEALED
  const contentAfterAppeal = await prisma.content.findUnique({ where: { id: testContent.id } });
  assert(contentAfterAppeal?.moderationState === "APPEALED", "Target content state moved to APPEALED");

  // 5.5 Review Appeal (Overturn and Restore)
  const resolvedAppealCase = await CaseService.reviewAppeal(
    {
      caseId: newCase.id,
      reviewerId: testModerator.id,
      overturnDecision: true, // Overturn & restore
      decisionNotes: "Reviewed full script context. Harassment claim dismissed, content reinstated.",
    },
    {
      actorId: testModerator.id,
      actorType: "ADMIN",
    }
  );

  assert(resolvedAppealCase.appealStatus === "APPROVED", "Appeal status updated to APPROVED");
  assert(Boolean(resolvedAppealCase.appealDecisionTime), "Appeal decision time recorded");

  // Verify target content was restored to APPROVED
  const contentAfterOverturn = await prisma.content.findUnique({ where: { id: testContent.id } });
  assert(contentAfterOverturn?.moderationState === "APPROVED", "Target content restored to APPROVED on appeal approval");

  // --------------------------------------------------------------------------
  // 6. IMMUTABLE AUDIT TRAIL & CRYPTOGRAPHIC HASH CHAIN INTEGRITY
  // --------------------------------------------------------------------------
  console.log("\n🔹 STEP 6: Verifying Cryptographically Chained Audit Events...");

  const contentAuditLogs = await AuditService.queryAuditLogs({
    targetEntityType: "Content",
    targetEntityId: testContent.id,
  });

  assert(contentAuditLogs.total >= 5, `Audit records captured for Content (Total: ${contentAuditLogs.total})`);

  const caseAuditLogs = await AuditService.queryAuditLogs({
    targetEntityType: "ModerationCase",
    targetEntityId: newCase.id,
  });

  assert(caseAuditLogs.total >= 4, `Audit records captured for Case (Total: ${caseAuditLogs.total})`);

  // Verify Cryptographic Hash Chain Integrity
  const chainVerification = await AuditService.verifyAuditChain("ModerationCase", newCase.id);
  assert(chainVerification.isValid === true, "Cryptographic hash chain verified - 0 tampering detected");
  assert(chainVerification.totalEventsChecked >= 4, `All ${chainVerification.totalEventsChecked} chained audit records validated`);

  // --------------------------------------------------------------------------
  // 7. CLEANUP TEST DATA
  // --------------------------------------------------------------------------
  console.log("\n🔹 STEP 7: Cleaning up test fixtures...");
  await prisma.auditEvent.deleteMany({
    where: {
      OR: [
        { targetEntityId: testContent.id },
        { targetEntityId: newCase.id },
        { targetEntityId: testFan.id },
        { targetEntityId: creatorProfileId },
      ],
    },
  });
  await prisma.moderationCase.deleteMany({ where: { id: newCase.id } });
  await prisma.content.deleteMany({ where: { id: testContent.id } });
  await prisma.creatorProfile.deleteMany({ where: { id: creatorProfileId } });
  await prisma.user.deleteMany({
    where: { id: { in: [testFan.id, testModerator.id, testCreatorUser.id] } },
  });

  console.log("\n================================================================================");
  console.log(`🎉 ALL ${passCount}/${testCount} TRUST & SAFETY VERIFICATION TESTS PASSED SUCCESSFULLY!`);
  console.log("================================================================================\n");
}

runTrustSafetyTests()
  .catch((err) => {
    console.error("Test Suite Execution Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
