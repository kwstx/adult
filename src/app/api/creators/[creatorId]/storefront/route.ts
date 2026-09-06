import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { SubscriptionProductService } from "@/modules/subscription/subscription-product.service";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await context.params;
    const { searchParams } = new URL(req.url);
    const fanUserId = searchParams.get("fanUserId") || undefined;

    // 1. Resolve Creator Profile (by ID, username, or userId)
    let creator = await prisma.creatorProfile.findFirst({
      where: {
        OR: [
          { id: creatorId },
          { userId: creatorId },
          { user: { username: creatorId } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            bannerUrl: true,
            bio: true,
            kycStatus: true,
            role: true,
          },
        },
        verifications: {
          select: {
            verificationStatus: true,
            verifiedAt: true,
          },
        },
        interactionDefinitions: {
          where: { isEnabled: true },
          orderBy: { sortOrder: "asc" },
        },
        contents: {
          where: { isPublished: true, isArchived: false },
          orderBy: { createdAt: "desc" },
        },
        products: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
        },
        collectiveGoals: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        livestreams: {
          where: { status: "LIVE" },
          orderBy: { startedAt: "desc" },
          take: 1,
          include: {
            seats: {
              include: {
                currentUser: {
                  select: {
                    id: true,
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
              orderBy: { seatIndex: "asc" },
            },
          },
        },
        privateSessionAvailabilities: {
          where: { isActive: true },
        },
      },
    });

    if (!creator) {
      return NextResponse.json(
        { error: `Creator "${creatorId}" not found.` },
        { status: 404 }
      );
    }

    // 2. Resolve Subscription Products (Initialize defaults if none exist)
    let subscriptionProducts = await prisma.subscriptionProduct.findMany({
      where: {
        creatorProfileId: creator.id,
        isArchived: false,
      },
      orderBy: { tierLevel: "asc" },
    });

    if (subscriptionProducts.length === 0) {
      subscriptionProducts = (await SubscriptionProductService.initializeDefaultTiersForCreator(
        creator.id
      )) as any;
    }

    // 3. Fallback mock enrichment for rich demo experience if records are sparse
    const defaultInteractions =
      creator.interactionDefinitions.length > 0
        ? creator.interactionDefinitions
        : [
            {
              id: "act_dance_1",
              title: "Mini Dance (30s) 💃",
              description: "Dedicated freestyle dance to current track on stream",
              actionType: "DANCE_REQUEST",
              priceCredits: 50,
              durationSeconds: 30,
              iconUrl: "💃",
              isEnabled: true,
              sortOrder: 1,
            },
            {
              id: "act_wheel_1",
              title: "Spin the Wheel 🎡",
              description: "Live spin with prizes, dare cards, and custom shoutouts",
              actionType: "WHEEL_SPIN",
              priceCredits: 100,
              durationSeconds: 45,
              iconUrl: "🎡",
              isEnabled: true,
              sortOrder: 2,
            },
            {
              id: "act_confetti_1",
              title: "Neon Confetti Pop 🎊",
              description: "Room-wide celebration effect with physical popper",
              actionType: "TIP_ALERT",
              priceCredits: 250,
              durationSeconds: 15,
              iconUrl: "🎊",
              isEnabled: true,
              sortOrder: 3,
            },
            {
              id: "act_spotlight_1",
              title: "VIP Highlight Spotlight ⭐",
              description: "Pinned spotlight chat message for 5 minutes",
              actionType: "CHAT_PIN",
              priceCredits: 500,
              durationSeconds: 300,
              iconUrl: "⭐",
              isEnabled: true,
              sortOrder: 4,
            },
          ];

    const defaultContents =
      creator.contents.length > 0
        ? creator.contents
        : [
            {
              id: "ppv_neon_set",
              title: "Exclusive Neon Cyberpunk Photoshoot (4K Master)",
              description: "Full resolution 30-photo uncensored gallery in high dynamic range",
              contentType: "ALBUM",
              accessLevel: "PPV_PURCHASE",
              priceCredits: 150,
              previewUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
              mediaUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=90",
              isPublished: true,
              viewCount: 1420,
              likeCount: 388,
              purchaseCount: 94,
              createdAt: new Date().toISOString(),
            },
            {
              id: "ppv_backstage_vod",
              title: "Acoustic Backstage Recording & Candid Q&A (45m)",
              description: "45-minute uncut studio session with acoustic song performance and private stories",
              contentType: "VIDEO",
              accessLevel: "PPV_PURCHASE",
              priceCredits: 300,
              previewUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
              mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
              mediaDurationSeconds: 2700,
              isPublished: true,
              viewCount: 890,
              likeCount: 245,
              purchaseCount: 62,
              createdAt: new Date().toISOString(),
            },
            {
              id: "ppv_sunset_clip",
              title: "Golden Hour Sunset Dance Clip (60FPS)",
              description: "Subscriber-free exclusive aesthetic dance showcase in 4K 60FPS",
              contentType: "VIDEO",
              accessLevel: "SUBSCRIBERS_ONLY",
              priceCredits: 0,
              previewUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
              mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
              mediaDurationSeconds: 420,
              isPublished: true,
              viewCount: 2310,
              likeCount: 712,
              purchaseCount: 180,
              createdAt: new Date().toISOString(),
            },
          ];

    const defaultProducts =
      creator.products.length > 0
        ? creator.products
        : [
            {
              id: "exp_shoutout_1",
              creatorProfileId: creator.id,
              title: "Custom 4K Video Shoutout 🎬",
              description: "Personalized 2-minute HD video message addressing you by name, sent directly to your inbox within 48h.",
              productType: "SHOUTOUT",
              priceCredits: 800,
              priceFiatCents: 4000,
              currency: "EUR",
              inventoryCount: null,
              thumbnailUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80",
              mediaUrls: "[]",
              isActive: true,
            },
            {
              id: "exp_toy_control_1",
              creatorProfileId: creator.id,
              title: "Interactive Toy Control Pass (15 Min) ⚡",
              description: "Take direct remote haptic control of creator's connected device with live intensity sliders during stream.",
              productType: "TOY_CONTROL_PASS",
              priceCredits: 500,
              priceFiatCents: 2500,
              currency: "EUR",
              inventoryCount: null,
              thumbnailUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80",
              mediaUrls: "[]",
              isActive: true,
            },
            {
              id: "exp_signed_polaroid_1",
              creatorProfileId: creator.id,
              title: "Signed 4K Polaroid Pack + Handwritten Note 📸",
              description: "Collector's pack of 3 physical glossy polaroid photos with lipstick kiss & personalized handwritten note. Discreet packaging.",
              productType: "PHYSICAL_MERCH",
              priceCredits: 1200,
              priceFiatCents: 6000,
              currency: "EUR",
              inventoryCount: 15,
              thumbnailUrl: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&auto=format&fit=crop&q=80",
              mediaUrls: "[]",
              isActive: true,
            },
            {
              id: "exp_vip_pass_1",
              creatorProfileId: creator.id,
              title: "Permanent VIP Backstage Patron Pass 👑",
              description: "Exclusive lifetime VIP badge in all streams, private Discord VIP lounge access, and 20% discount on all private 1-on-1 sessions.",
              productType: "VIP_PASS",
              priceCredits: 2500,
              priceFiatCents: 12500,
              currency: "EUR",
              inventoryCount: null,
              thumbnailUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&auto=format&fit=crop&q=80",
              mediaUrls: "[]",
              isActive: true,
            },
          ];

    // 4. Resolve Fan State (if fanUserId provided)
    let fanState: {
      isFollowing: boolean;
      notificationTier: string;
      activeSubscription: any | null;
      unlockedContentIds: string[];
      relationship: {
        tier: string;
        currentLevel: number;
        totalCreditsSpent: number;
        currentStreakDays: number;
      };
      walletBalance: number;
    } = {
      isFollowing: false,
      notificationTier: "ALL",
      activeSubscription: null,
      unlockedContentIds: [],
      relationship: {
        tier: "STRANGER",
        currentLevel: 1,
        totalCreditsSpent: 0,
        currentStreakDays: 0,
      },
      walletBalance: 0,
    };

    if (fanUserId) {
      const [follow, subscription, purchases, relationship, wallet] =
        await Promise.all([
          prisma.follow.findUnique({
            where: {
              followerId_creatorProfileId: {
                followerId: fanUserId,
                creatorProfileId: creator.id,
              },
            },
          }),
          prisma.subscription.findFirst({
            where: {
              fanId: fanUserId,
              creatorProfileId: creator.id,
              status: "ACTIVE",
            },
            include: { product: true },
          }),
          prisma.contentPurchase.findMany({
            where: { fanId: fanUserId },
            select: { contentId: true },
          }),
          prisma.creatorRelationship.findUnique({
            where: {
              fanId_creatorProfileId: {
                fanId: fanUserId,
                creatorProfileId: creator.id,
              },
            },
          }),
          prisma.wallet.findUnique({
            where: { userId: fanUserId },
            select: { balance: true },
          }),
        ]);

      fanState = {
        isFollowing: Boolean(follow),
        notificationTier: follow?.notificationTier || "ALL",
        activeSubscription: subscription || null,
        unlockedContentIds: purchases.map((p) => p.contentId),
        relationship: {
          tier: relationship?.relationshipTier || "SUPPORTER",
          currentLevel: relationship?.currentLevel || 3,
          totalCreditsSpent: Number(relationship?.totalCreditsSpent || 0),
          currentStreakDays: relationship?.currentStreakDays || 4,
        },
        walletBalance: wallet?.balance || 2500,
      };
    }

    // Active Live Broadcast details
    const activeStream = creator.livestreams[0] || null;
    const activeGoal = creator.collectiveGoals[0] || {
      id: "goal_cosplay_1",
      title: "Cosplay Dance & Confetti Blast at 1,000 Tokens! 🎉",
      targetCredits: 1000,
      currentCredits: 720,
      contributorCount: 18,
      status: "ACTIVE",
    };

    const isLive = Boolean(creator.isLive || activeStream);

    return NextResponse.json({
      success: true,
      creator: {
        id: creator.id,
        userId: creator.userId,
        username: creator.user.username,
        displayName: creator.user.displayName,
        stageName: creator.stageName || creator.user.displayName,
        avatarUrl:
          creator.user.avatarUrl ||
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
        bannerUrl:
          creator.bannerUrl ||
          creator.user.bannerUrl ||
          "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&auto=format&fit=crop&q=80",
        bio:
          creator.bio ||
          creator.user.bio ||
          "Professional dancer, artist & interactive creator. Live vibes, exclusive 4K content vault, 1-on-1 private video bookings & bespoke experiences! 💖",
        tags: creator.tags ? creator.tags.split(",") : ["interactive", "live", "vip", "dance"],
        category: creator.category || "Interactive Entertainment",
        totalFollowers: creator.totalFollowers || 12450,
        totalViews: creator.totalViews || 84200,
        rating: "4.98 ★ (342 reviews)",
        responseTimeMinutes: 15,
        is2257Approved:
          creator.user.kycStatus === "COMPLIANCE_2257_APPROVED" ||
          creator.verifications.some((v) => v.verificationStatus === "APPROVED"),
      },

      // 1. LIVE PILLAR
      live: {
        isLive,
        streamTitle: activeStream?.title || "Late Night Neon Lounge & Dance Requests 💃✨",
        viewerCount: activeStream?.currentViewerCount || (isLive ? 342 : 0),
        streamMode: activeStream?.streamMode || "PUBLIC_BROADCAST",
        ticketPriceCredits: activeStream?.ticketPriceCredits || 0,
        playbackHlsUrl:
          activeStream?.hlsPlaybackUrl ||
          creator.playbackHlsUrl ||
          "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        activeGoal: {
          id: activeGoal.id,
          title: activeGoal.title,
          targetCredits: activeGoal.targetCredits,
          currentCredits: activeGoal.currentCredits,
          contributorCount: activeGoal.contributorCount,
          percentage: Math.min(100, Math.round((activeGoal.currentCredits / activeGoal.targetCredits) * 100)),
        },
        interactionMenu: defaultInteractions,
        stageSeats: activeStream?.seats || [
          { seatIndex: 0, seatTier: "VIP_FRONT_ROW", pricePerMinuteCredits: 20, isOccupied: true, currentUser: { displayName: "Alex Patron 💎", avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80" } },
          { seatIndex: 1, seatTier: "VIP_FRONT_ROW", pricePerMinuteCredits: 20, isOccupied: false, currentUser: null },
          { seatIndex: 2, seatTier: "VIP_BOX", pricePerMinuteCredits: 15, isOccupied: false, currentUser: null },
          { seatIndex: 3, seatTier: "VIP_BOX", pricePerMinuteCredits: 15, isOccupied: false, currentUser: null },
        ],
      },

      // 2. SUBSCRIPTION PILLAR
      subscription: {
        tiers: subscriptionProducts.map((p) => ({
          id: p.id,
          name: p.name,
          tier: p.tier,
          tierLevel: p.tierLevel,
          description: p.description,
          priceFiatCents: p.priceFiatCents,
          priceFiatFormatted: `€${(p.priceFiatCents / 100).toFixed(2)}`,
          creditPriceMonthly: p.creditPriceMonthly || Math.round(p.priceFiatCents / 5),
          currency: p.currency || "EUR",
          billingInterval: p.billingInterval || "MONTHLY",
          entitlements: (p.entitlements || "").split(","),
          badgeIconUrl: p.badgeIconUrl,
          badgeColorHex: p.badgeColorHex || "#9333EA",
          isPopular: p.tierLevel === 2,
        })),
        isSubscribed: Boolean(fanState.activeSubscription),
        activeSubscription: fanState.activeSubscription,
        grandfatherGuarantee: true,
      },

      // 3. CONTENT PILLAR
      content: {
        items: defaultContents.map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          contentType: c.contentType,
          accessLevel: c.accessLevel,
          priceCredits: c.priceCredits,
          previewUrl: c.previewUrl,
          mediaUrl: c.mediaUrl,
          mediaDurationSeconds: c.mediaDurationSeconds,
          viewCount: c.viewCount,
          likeCount: c.likeCount,
          purchaseCount: c.purchaseCount,
          isUnlocked:
            c.accessLevel === "PUBLIC" ||
            (c.accessLevel === "SUBSCRIBERS_ONLY" && Boolean(fanState.activeSubscription)) ||
            fanState.unlockedContentIds.includes(c.id),
        })),
      },

      // 4. PRIVATE PILLAR
      private: {
        creditRatePerMinute: 100,
        rateFormatted: "100 Tokens / min (~€5.00)",
        paidMessagesEnabled: creator.paidMessagesEnabled || true,
        messagePriceCredits: creator.messagePriceCredits || 50,
        durationTiers: [
          { durationMinutes: 15, totalCredits: 1500, priceFiatFormatted: "€75.00", title: "15-Minute Quick Catchup", desc: "Private 1-on-1 HD webcam room with dedicated live audio & chat." },
          { durationMinutes: 30, totalCredits: 2800, priceFiatFormatted: "€140.00", title: "30-Minute Full Private Show", desc: "Extended private video show with custom interactive requests.", popular: true },
          { durationMinutes: 45, totalCredits: 4000, priceFiatFormatted: "€200.00", title: "45-Minute VIP Intimate Session", desc: "Unrushed private session with full personal attention and recording copy." },
          { durationMinutes: 60, totalCredits: 5000, priceFiatFormatted: "€250.00", title: "60-Minute Ultimate VIP Hour", desc: "Full 1-hour VIP private show, priority future booking & dedicated gift." },
        ],
        availableDays: [
          { day: "Monday", slots: ["18:00 UTC", "19:00 UTC", "21:00 UTC"] },
          { day: "Wednesday", slots: ["17:00 UTC", "19:30 UTC", "22:00 UTC"] },
          { day: "Friday", slots: ["20:00 UTC", "21:30 UTC", "23:00 UTC"] },
          { day: "Saturday", slots: ["16:00 UTC", "18:00 UTC", "20:00 UTC", "22:00 UTC"] },
        ],
      },

      // 5. EXPERIENCES PILLAR
      experiences: {
        products: defaultProducts.map((prod) => ({
          id: prod.id,
          title: prod.title,
          description: prod.description,
          productType: prod.productType,
          priceCredits: prod.priceCredits,
          priceFiatCents: prod.priceFiatCents,
          priceFiatFormatted: `€${((prod.priceFiatCents || prod.priceCredits * 5) / 100).toFixed(2)}`,
          inventoryCount: prod.inventoryCount,
          thumbnailUrl: prod.thumbnailUrl,
        })),
      },

      // Viewer State
      fanState,
    });
  } catch (error: any) {
    console.error("Storefront API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load storefront data." },
      { status: 500 }
    );
  }
}
