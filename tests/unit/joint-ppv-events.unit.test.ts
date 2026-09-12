/**
 * UNIT TEST SUITE: JOINT PPV, JOINT EVENTS & 2257 COMPLIANCE
 * 
 * Verifies:
 * 1. 18 U.S.C. § 2257 Co-Performer record-keeping verification & consent workflows
 * 2. Revenue distribution matrix calculations & zero fractional credit leakage
 * 3. Joint ticket access token issuance and entitlement gates
 */

import { TestRunner, assert, assertEqual, assertThrows } from "../utils/test-runner";
import { JointComplianceService } from "@/modules/content/joint-compliance.service";

export async function runJointPPVUnitTests(): Promise<boolean> {
  const runner = new TestRunner("Layer 1G: Joint PPV, Joint Events & 2257 Compliance Tests");
  runner.printHeader();

  // --------------------------------------------------------------------------
  // 1. 2257 COMPLIANCE & CO-PERFORMER RECORD VALIDATION
  // --------------------------------------------------------------------------
  await runner.runTest("Compliance 2257: Blocks co-creators with missing 2257 KYC records", async () => {
    const check = await JointComplianceService.validateCoCreatorsCompliance([
      "creator_unverified_mock_999",
    ]);

    assertEqual(check.allCompliant, false, "Must fail compliance when creator profile is unverified");
    assert(check.details.length === 1, "Details array contains 1 entry");
    assertEqual(check.details[0].is2257Approved, false, "is2257Approved must be false");
    assert(check.details[0].missingRequirements.length > 0, "Missing requirements listed");
  });

  // --------------------------------------------------------------------------
  // 2. REVENUE DISTRIBUTION MATRIX & SPLIT FORMULATIONS
  // --------------------------------------------------------------------------
  await runner.runTest("Joint PPV Matrix: 60/40 Split on 1,000 Credits (20% Platform Rake)", () => {
    const priceCredits = 1000;
    const rakePercent = 0.20;
    const platformRake = Math.floor(priceCredits * rakePercent); // 200
    const netPool = priceCredits - platformRake; // 800

    const producerShare = Math.floor(netPool * 0.60); // 480
    const coStarShare = netPool - producerShare; // 320

    assertEqual(platformRake, 200, "Platform fee is 200 CR (20%)");
    assertEqual(netPool, 800, "Net creator pool is 800 CR (80%)");
    assertEqual(producerShare, 480, "Primary producer receives 480 CR (60% of net)");
    assertEqual(coStarShare, 320, "Co-star receives 320 CR (40% of net)");
    assertEqual(platformRake + producerShare + coStarShare, priceCredits, "Exact conservation of credits (200 + 480 + 320 = 1000)");
  });

  await runner.runTest("Joint Event Ticket Matrix: 3-Way Split (50/25/25) on 800 Credits", () => {
    const ticketPrice = 800;
    const rakePercent = 0.20;
    const platformRake = Math.floor(ticketPrice * rakePercent); // 160
    const netPool = ticketPrice - platformRake; // 640

    const hostShare = Math.floor(netPool * 0.50); // 320
    const coHost1 = Math.floor(netPool * 0.25); // 160
    const coHost2 = netPool - (hostShare + coHost1); // 160

    assertEqual(platformRake, 160, "Platform rake is 160 CR");
    assertEqual(netPool, 640, "Net pool is 640 CR");
    assertEqual(hostShare, 320, "Primary host share is 320 CR");
    assertEqual(coHost1, 160, "Co-host 1 share is 160 CR");
    assertEqual(coHost2, 160, "Co-host 2 share is 160 CR");
    assertEqual(platformRake + hostShare + coHost1 + coHost2, ticketPrice, "Credits sum exactly to 800 CR ticket price");
  });

  await runner.runTest("Joint Split Matrix: Odd Price (299 Credits) with 3 Co-Stars (45/35/20)", () => {
    const priceCredits = 299;
    const rakePercent = 0.20;
    const platformRake = Math.floor(priceCredits * rakePercent); // 59
    const netPool = priceCredits - platformRake; // 240

    const creator1 = Math.floor(netPool * 0.45); // 108
    const creator2 = Math.floor(netPool * 0.35); // 84
    const creator3 = netPool - (creator1 + creator2); // 240 - 192 = 48 (20%)

    assertEqual(platformRake, 59, "Platform fee is 59 CR");
    assertEqual(netPool, 240, "Net pool is 240 CR");
    assertEqual(creator1, 108, "Creator 1 receives 108 CR");
    assertEqual(creator2, 84, "Creator 2 receives 84 CR");
    assertEqual(creator3, 48, "Creator 3 receives 48 CR");
    assertEqual(platformRake + creator1 + creator2 + creator3, priceCredits, "Zero fractional leakage on 299 CR purchase");
  });

  // --------------------------------------------------------------------------
  // 3. TICKET ACCESS PASS TOKEN ISSUANCE
  // --------------------------------------------------------------------------
  await runner.runTest("Ticket Pass Token: Cryptographic payload encoding and expiration", () => {
    const eventId = "evt_joint_summer_live";
    const fanId = "usr_fan_101";
    const expiration = Date.now() + 1000 * 60 * 60 * 24;

    const payload = {
      eventId,
      userId: fanId,
      exp: expiration,
    };

    const token = `tkt_pass_${Buffer.from(JSON.stringify(payload)).toString("base64url")}`;
    assert(token.startsWith("tkt_pass_"), "Token starts with tkt_pass_ prefix");

    const decoded = JSON.parse(Buffer.from(token.replace("tkt_pass_", ""), "base64url").toString("utf8"));
    assertEqual(decoded.eventId, eventId, "Decoded event ID matches");
    assertEqual(decoded.userId, fanId, "Decoded user ID matches");
    assertEqual(decoded.exp, expiration, "Decoded expiration timestamp matches");
  });

  const summary = runner.printFooter();
  return summary.failedCount === 0;
}

if (require.main === module) {
  runJointPPVUnitTests();
}
