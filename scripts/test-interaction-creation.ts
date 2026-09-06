import { InteractionService } from "../src/modules/interaction/interaction.service";
import { eventBus } from "../src/modules/realtime/event-bus";
import { CreateInteractionInput, InteractionType } from "../src/types/interaction";

async function runInteractionCreationTest() {
  console.log("===============================================================");
  console.log("TESTING INTERACTION CREATION & REAL-TIME PUBLICATION PIPELINE");
  console.log("===============================================================\n");

  const creatorId = "creator_maya";
  let receivedRealtimeEvent: any = null;

  // 1. Subscribe mock viewer to real-time room channel
  const unsubscribe = eventBus.subscribe(`room:${creatorId}`, (event) => {
    console.log(`[Realtime Event Bus] Received Event: "${event.type}" on channel "${event.channel}"`);
    receivedRealtimeEvent = event;
  });

  // 2. Test Invalid Configuration (Validation Check)
  console.log("1. Testing Validation Failure Cases...");
  const invalidInput: Partial<CreateInteractionInput> = {
    type: "INVALID_TYPE" as any,
    name: " ", // Empty
    price: -50, // Negative price
    duration: 1, // Under 5s
  };

  const validationResult = InteractionService.validateInteractionConfiguration(invalidInput);
  console.log("  - Validation passed?", validationResult.isValid);
  console.log("  - Captured errors:", Object.keys(validationResult.errors));
  if (!validationResult.isValid) {
    console.log("  ✓ Expected validation failure caught correctly!\n");
  } else {
    throw new Error("Validation failed to catch invalid configuration.");
  }

  // 3. Test Valid Creation for each of the 5 Interaction Types
  const testTypes: { type: InteractionType; name: string; desc: string; price: number; duration: number }[] = [
    {
      type: "QUESTION",
      name: "AMA Priority Voice Answer 💬",
      desc: "Ask Maya anything live with an in-depth answer on camera",
      price: 150,
      duration: 30,
    },
    {
      type: "ACTIVITY",
      name: "1-Minute Freestyle Salsa Dance 💃",
      desc: "Live dance performance to viewer-chosen soundtrack",
      price: 250,
      duration: 60,
    },
    {
      type: "CHALLENGE",
      name: "Spicy Snack / 25 Push-up Challenge 🎯",
      desc: "Live endurance test requested by audience",
      price: 400,
      duration: 45,
    },
    {
      type: "PRIORITY_INTERACTION",
      name: "VIP Champagne Pop & Spotlight Toast ⚡",
      desc: "Jump the queue with glowing room banner and custom shoutout",
      price: 600,
      duration: 20,
    },
    {
      type: "CUSTOM_EXPERIENCE",
      name: "Fan-Chosen Cosplay Outfit Switch ✨",
      desc: "Creator changes into chosen costume theme for the stream",
      price: 1200,
      duration: 180,
    },
  ];

  console.log("2. Testing Creation & Real-Time Publishing of 5 Interaction Types...");

  for (const item of testTypes) {
    receivedRealtimeEvent = null;

    const input: CreateInteractionInput = {
      type: item.type,
      name: item.name,
      description: item.desc,
      price: item.price,
      duration: item.duration,
      quantity: 5,
      whoCanPurchase: "ALL",
      requiresAcceptance: true,
      entersQueue: true,
      icon: "✨",
    };

    const result = await InteractionService.createAndPublishInteraction({
      creatorProfileId: creatorId,
      input,
    });

    console.log(`\n  Published: [${result.interaction.type}] "${result.interaction.name}"`);
    console.log(`  - ID: ${result.interaction.id}`);
    console.log(`  - Price: ${result.interaction.price} 🪙`);
    console.log(`  - Duration: ${result.interaction.duration}s`);
    console.log(`  - Quantity: ${result.interaction.quantity} slots`);
    console.log(`  - Requires Acceptance: ${result.interaction.requiresAcceptance}`);
    console.log(`  - Enters Queue: ${result.interaction.entersQueue}`);
    console.log(`  - Active Status: ${result.interaction.isActive}`);

    if (!result.interaction.isActive) {
      throw new Error(`Interaction ${item.name} was not marked active.`);
    }

    // Verify Real-time Broadcast
    if (
      receivedRealtimeEvent &&
      receivedRealtimeEvent.type === "NEW_INTERACTION_AVAILABLE" &&
      receivedRealtimeEvent.payload.message === "New interaction available" &&
      receivedRealtimeEvent.payload.interaction.id === result.interaction.id
    ) {
      console.log(`  ✓ Real-Time Broadcast Verified: "New interaction available" delivered to viewers!`);
    } else {
      throw new Error(`Real-time broadcast event was not received for ${item.name}`);
    }
  }

  // 4. Verify Active Interactions List
  console.log("\n3. Verifying Room Active Interactions Catalogue...");
  const activeInteractions = await InteractionService.getActiveInteractions(creatorId);
  console.log(`  - Total active interactions in room catalogue: ${activeInteractions.length}`);
  if (activeInteractions.length < testTypes.length) {
    throw new Error("Active interactions catalogue count mismatch.");
  }
  console.log("  ✓ All published interactions are active in the live room catalogue!");

  unsubscribe();
  console.log("\n===============================================================");
  console.log("ALL INTERACTION CREATION TESTS PASSED WITH 100% SUCCESS!");
  console.log("===============================================================\n");
}

runInteractionCreationTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
