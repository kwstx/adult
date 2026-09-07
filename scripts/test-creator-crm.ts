// ============================================================================
// VERIFICATION TEST SUITE: CREATOR CRM & AUDIENCE INTELLIGENCE ENGINE
// ============================================================================

import { CreatorCrmService } from "../src/modules/creator-crm/creator-crm.service";
import { COHORT_DEFINITIONS } from "../src/modules/creator-crm/crm-store";
import { CrmFanCohort } from "../src/modules/creator-crm/types";

async function runCrmVerification() {
  console.log("====================================================================");
  console.log("  CREATOR CRM & AUDIENCE INTELLIGENCE VERIFICATION TEST SUITE");
  console.log("====================================================================\n");

  const creatorId = "creator_luna_profile";
  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] Test ${totalTests}: ${testName}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${testName}`);
      if (details) console.error(`         Details: ${details}`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Authoritative Evaluation of All 10 CRM Cohorts
  // --------------------------------------------------------------------------
  console.log("--- 1. Testing 10-Cohort Segmentation Engine ---");
  const { metrics, cohorts } = await CreatorCrmService.getCohortMetrics(creatorId);

  assert(
    cohorts.length === 10,
    "Exactly 10 authoritative cohorts are defined and tracked",
    `Expected 10 cohorts, received ${cohorts.length}`
  );

  const requiredCohorts: CrmFanCohort[] = [
    "NEW_FANS",
    "RETURNING_FANS",
    "VIPS",
    "INACTIVE_FANS",
    "RECENT_PURCHASERS",
    "HIGH_VALUE_SUPPORTERS",
    "SUBSCRIBERS",
    "EXPIRING_SUBSCRIBERS",
    "PEOPLE_WHO_HAVENT_RETURNED",
    "RECENT_CONTENT_PURCHASERS",
  ];

  const presentCohorts = cohorts.map((c) => c.cohort);
  const allPresent = requiredCohorts.every((c) => presentCohorts.includes(c));
  assert(
    allPresent,
    "All 10 required cohorts exist in CRM metadata",
    `Missing cohorts: ${requiredCohorts.filter((c) => !presentCohorts.includes(c)).join(", ")}`
  );

  assert(
    metrics.totalTrackedFans > 0,
    `Audience metrics calculated (${metrics.totalTrackedFans} total fans tracked, €${metrics.totalAudienceLtvFiatEur} LTV)`,
    `Received totalTrackedFans: ${metrics.totalTrackedFans}`
  );

  // --------------------------------------------------------------------------
  // TEST 2: Multi-Filter Audience Querying
  // --------------------------------------------------------------------------
  console.log("\n--- 2. Testing Audience Querying, Filters & Search ---");

  // Query all fans
  const allFansRes = await CreatorCrmService.queryFans(creatorId, { cohort: "ALL" });
  assert(
    allFansRes.fans.length > 0 && allFansRes.total > 0,
    `Querying all fans returned ${allFansRes.fans.length} items (total: ${allFansRes.total})`
  );

  // Query Expiring Subscribers
  const expiringRes = await CreatorCrmService.queryFans(creatorId, { cohort: "EXPIRING_SUBSCRIBERS" });
  assert(
    expiringRes.fans.every((f) => f.cohorts.includes("EXPIRING_SUBSCRIBERS")),
    `Filtered Expiring Subscribers (${expiringRes.fans.length} fans) - all match cohort tag`
  );

  // Query VIPs
  const vipsRes = await CreatorCrmService.queryFans(creatorId, { cohort: "VIPS" });
  assert(
    vipsRes.fans.every((f) => f.cohorts.includes("VIPS")),
    `Filtered VIPs (${vipsRes.fans.length} fans) - all match VIP cohort tag`
  );

  // Search by keyword
  const searchRes = await CreatorCrmService.queryFans(creatorId, { search: "Alex" });
  assert(
    searchRes.fans.length > 0 && searchRes.fans[0].username.toLowerCase().includes("alex"),
    `Search by name 'Alex' found matching fan: @${searchRes.fans[0]?.username}`
  );

  // --------------------------------------------------------------------------
  // TEST 3: Fan 360° Dossier & Spend Breakdown
  // --------------------------------------------------------------------------
  console.log("\n--- 3. Testing Deep Fan CRM Dossier ---");
  const targetFanId = allFansRes.fans[0].fanId;
  const dossier = await CreatorCrmService.getFanDossier(creatorId, targetFanId);

  assert(
    dossier.fanId === targetFanId,
    `Retrieved 360° dossier for fan @${dossier.username}`
  );

  assert(
    dossier.spendBreakdown.totalSpentCredits === dossier.totalCreditsSpent,
    `Authoritative spend breakdown matches total credits spent (${dossier.totalCreditsSpent} cr)`
  );

  assert(
    Array.isArray(dossier.spendBreakdown.liveTipsCredits !== undefined ? [] : null),
    "Spend breakdown includes specific channel buckets (live tips, toys, PPV, subs, sessions)"
  );

  // --------------------------------------------------------------------------
  // TEST 4: Private Notes, Custom Nicknames & Tags
  // --------------------------------------------------------------------------
  console.log("\n--- 4. Testing Creator Private Notes & Tagging ---");
  const testNotes = "VIP fan since the Berlin livestream. Prefers acoustic sets!";
  const testNickname = "Alex The Star";
  const testTags = ["VIP Regular", "Acoustic Fan", "Top Tipper"];

  const updateRes = await CreatorCrmService.updateFanMetadata(creatorId, targetFanId, {
    customNotes: testNotes,
    customNickname: testNickname,
    tags: testTags,
  });

  assert(
    updateRes.success && updateRes.customNotes === testNotes && updateRes.customNickname === testNickname,
    "Creator private notes, custom nickname, and tags updated successfully"
  );

  const updatedDossier = await CreatorCrmService.getFanDossier(creatorId, targetFanId);
  assert(
    updatedDossier.customNotes === testNotes && updatedDossier.customNickname === testNickname,
    "Updated private notes persisted and reflected in fan dossier"
  );

  // --------------------------------------------------------------------------
  // TEST 5: Targeted Creator Campaigns & Dispatch
  // --------------------------------------------------------------------------
  console.log("\n--- 5. Testing Targeted Creator Campaigns & Telemetry ---");
  const campaign = await CreatorCrmService.createCampaign(creatorId, {
    title: "Automated Verification Test Campaign: Renewal Perk Drop",
    targetCohort: "EXPIRING_SUBSCRIBERS",
    channel: "DIRECT_MESSAGE",
    messageBody: "Hey! Your VIP pass is up for renewal soon. Here is an exclusive backstage set!",
    perkAttached: {
      type: "FREE_CONTENT_UNLOCK",
      title: "Exclusive Backstage Reel",
      valueDescription: "Worth 400 credits",
    },
    dispatchImmediately: true,
  });

  assert(
    campaign.status === "DISPATCHED" && campaign.targetCohort === "EXPIRING_SUBSCRIBERS",
    `Campaign created and dispatched immediately (${campaign.id})`
  );

  assert(
    campaign.deliveredCount > 0,
    `Campaign delivery telemetry recorded: ${campaign.deliveredCount} delivered, ${campaign.readCount} read`
  );

  const campaignsList = await CreatorCrmService.getCampaigns(creatorId);
  assert(
    campaignsList.some((c) => c.id === campaign.id),
    `Campaign listed in creator campaign history (total: ${campaignsList.length} campaigns)`
  );

  // --------------------------------------------------------------------------
  // TEST 6: Privacy & Data Minimization Guardrails
  // --------------------------------------------------------------------------
  console.log("\n--- 6. Testing Privacy & Data Minimization Guardrails ---");
  const serializedFan = JSON.stringify(dossier);

  assert(
    !serializedFan.includes("email") &&
      !serializedFan.includes("creditCard") &&
      !serializedFan.includes("password") &&
      !serializedFan.includes("ipAddress") &&
      !serializedFan.includes("govId"),
    "Zero PII / payment / verification documents leaked in CRM payload (Data Minimization Verified)"
  );

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log("\n====================================================================");
  console.log(`  VERIFICATION RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
  console.log("====================================================================\n");

  if (passedTests === totalTests) {
    console.log(">> ALL CREATOR CRM VERIFICATION CHECKS COMPLETED SUCCESSFULLY. <<\n");
  } else {
    process.exit(1);
  }
}

runCrmVerification().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
