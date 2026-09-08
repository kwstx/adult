import { NextRequest, NextResponse } from "next/server";
import { ProductLoopOrchestrator } from "@/modules/scenarios/product-loop-orchestrator";

// Shared in-memory scenario instance for interactive playground sessions
let globalOrchestrator = new ProductLoopOrchestrator();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("reset") === "true") {
      globalOrchestrator = new ProductLoopOrchestrator();
    }
    return NextResponse.json({
      success: true,
      state: globalOrchestrator.getState(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch scenario state" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, step } = body;

    if (action === "reset") {
      globalOrchestrator = new ProductLoopOrchestrator();
      return NextResponse.json({
        success: true,
        message: "Scenario reset to initial state",
        state: globalOrchestrator.getState(),
      });
    }

    if (action === "run_full") {
      globalOrchestrator = new ProductLoopOrchestrator();
      const finalState = await globalOrchestrator.runFullLoop();
      return NextResponse.json({
        success: true,
        message: "Full product loop executed successfully through all 12 stages",
        state: finalState,
      });
    }

    if (action === "step") {
      const stepNumber = Number(step) || (globalOrchestrator.getState().currentStep + 1);

      switch (stepNumber) {
        case 1:
          await globalOrchestrator.step1_AuthenticateFan();
          break;
        case 2:
          await globalOrchestrator.step2_DiscoverCreatorLuna();
          break;
        case 3:
          await globalOrchestrator.step3_RecordViewingTelemetry();
          break;
        case 4:
          await globalOrchestrator.step4_OpenInteractionMenu();
          break;
        case 5:
          await globalOrchestrator.step5_BuyCreditsViaGateway();
          break;
        case 6:
          await globalOrchestrator.step6_PurchaseQuestionInteraction();
          break;
        case 7:
          await globalOrchestrator.step7_CreatorAcceptsInteraction();
          break;
        case 8:
          await globalOrchestrator.step8_ExecuteAndCompleteOrder();
          break;
        case 9:
          await globalOrchestrator.step9_AwardXpAndLevelUp();
          break;
        case 10:
          await globalOrchestrator.step10_UpdateLeaderboardAndGoal();
          break;
        case 11:
          await globalOrchestrator.step11_FanSubscribes();
          break;
        case 12:
          await globalOrchestrator.step12_NextDayReturnFeedElevation();
          break;
        default:
          return NextResponse.json(
            { success: false, error: `Invalid step index: ${stepNumber}` },
            { status: 400 }
          );
      }

      return NextResponse.json({
        success: true,
        stepExecuted: stepNumber,
        state: globalOrchestrator.getState(),
      });
    }

    // Default: run full loop if no action provided
    const state = await globalOrchestrator.runFullLoop();
    return NextResponse.json({
      success: true,
      state,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute scenario step" },
      { status: 500 }
    );
  }
}
