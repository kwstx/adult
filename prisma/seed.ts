import prisma from "../src/lib/db";

async function main() {
  console.log("🌱 Starting platform seed database...");

  // Clean existing records
  await prisma.auditLog.deleteMany({});
  await prisma.moderationReport.deleteMany({});
  await prisma.compliance2257Record.deleteMany({});
  await prisma.ageAssuranceRecord.deleteMany({});
  await prisma.chatMessage.deleteMany({});
  await prisma.liveSession.deleteMany({});
  await prisma.pPVPurchase.deleteMany({});
  await prisma.pPVContent.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.ledgerEntry.deleteMany({});
  await prisma.interactionMenuItem.deleteMany({});
  await prisma.creatorProfile.deleteMany({});
  await prisma.wallet.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Create Admins & Compliance Officers
  const admin = await prisma.user.create({
    data: {
      email: "compliance@auralive.internal",
      username: "compliance_officer",
      displayName: "Sarah Connor (Compliance Lead)",
      role: "ADMIN",
      kycStatus: "COMPLIANCE_2257_APPROVED",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
      wallet: {
        create: { balance: 10000 },
      },
    },
  });

  // 2. Create Featured Live Creator 1: Maya Velvet
  const creator1User = await prisma.user.create({
    data: {
      email: "maya@auralive.creator",
      username: "mayavelvet",
      displayName: "Maya Velvet ✨",
      role: "CREATOR",
      kycStatus: "COMPLIANCE_2257_APPROVED",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
      wallet: {
        create: { balance: 4520 }, // 4,520 credits accumulated ($452)
      },
      creatorProfile: {
        create: {
          bio: "Hey loves! Professional dancer & model. Streaming live vibes, music & high energy goals! 💖",
          bannerUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&auto=format&fit=crop&q=80",
          streamTitle: "Late Night Neon Lounge & Dance Requests 💃✨",
          isLive: true,
          viewerCount: 248,
          currentGoalTitle: "Cosplay Dance & Confetti Blast 🎉",
          currentGoalTarget: 1000,
          currentGoalProgress: 680,
          tags: "dance,music,vip,interactive,cosplay",
          isPrivateShow: false,
          minTipForPrivate: 1500,
          compliance2257: {
            create: {
              legalFullName: "Maya Elena Rostova",
              dateOfBirth: "1998-04-14",
              governmentIdType: "PASSPORT",
              idNumberEncrypted: "enc_US_9938472910_SECURE",
              documentVaultUrl: "vault://s3-compliance-2257/creators/mayavelvet/kyc_records_vault.tar.gz",
              verificationStatus: "APPROVED",
              approvedAt: new Date(),
            },
          },
          interactionItems: {
            create: [
              {
                title: "Mini Dance (30s)",
                description: "Dedicated freestyle dance performance to current track",
                creditCost: 50,
                actionType: "DANCE",
                sortOrder: 1,
              },
              {
                title: "Spin the Wheel 🎡",
                description: "Live spin with prizes, dare cards, and shoutouts",
                creditCost: 100,
                actionType: "WHEEL_SPIN",
                sortOrder: 2,
              },
              {
                title: "Neon Confetti Pop 🎊",
                description: "Room-wide celebration effect with physical popper",
                creditCost: 250,
                actionType: "ALERT_SOUND",
                sortOrder: 3,
              },
              {
                title: "VIP Highlight Spotlight ⭐",
                description: "Pinned spotlight chat message with golden badge for 5 mins",
                creditCost: 500,
                actionType: "CHAT_HIGHLIGHT",
                sortOrder: 4,
              },
            ],
          },
          ppvContents: {
            create: [
              {
                title: "Exclusive Neon Cyberpunk Photoshoot (4K)",
                description: "Full resolution 30-photo gallery with behind the scenes video",
                previewUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
                mediaUrl: "https://cdn.platform.local/creators/mayavelvet/cyberpunk_set_4k.zip",
                creditPrice: 150,
                mediaType: "ALBUM",
              },
              {
                title: "Acoustic Backstage Recording & Chill Q&A",
                description: "45-minute uncut studio session and personal Q&A",
                previewUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
                mediaUrl: "https://cdn.platform.local/creators/mayavelvet/backstage_video.mp4",
                creditPrice: 300,
                mediaType: "VIDEO",
              },
            ],
          },
        },
      },
    },
    include: {
      creatorProfile: true,
      wallet: true,
    },
  });

  // 3. Create Featured Creator 2: Chloe Siren
  const creator2User = await prisma.user.create({
    data: {
      email: "chloe@auralive.creator",
      username: "chloesiren",
      displayName: "Chloe Siren 🌊",
      role: "CREATOR",
      kycStatus: "COMPLIANCE_2257_APPROVED",
      avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80",
      wallet: {
        create: { balance: 8900 },
      },
      creatorProfile: {
        create: {
          bio: "Late night ASMR, deep talks, gaming & VIP interactive sessions. Join the siren squad! 🌙",
          bannerUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80",
          streamTitle: "Midnight Chill, ASMR Whispers & Story Time 🎧💤",
          isLive: true,
          viewerCount: 189,
          currentGoalTitle: "Binaural Mic Setup Upgrade 🎙️",
          currentGoalTarget: 800,
          currentGoalProgress: 450,
          tags: "asmr,gaming,chill,relax",
          isPrivateShow: false,
          compliance2257: {
            create: {
              legalFullName: "Chloe Amanda Vance",
              dateOfBirth: "1999-08-22",
              governmentIdType: "DRIVERS_LICENSE",
              idNumberEncrypted: "enc_CA_DL8827401_SECURE",
              documentVaultUrl: "vault://s3-compliance-2257/creators/chloesiren/kyc_records_vault.tar.gz",
              verificationStatus: "APPROVED",
              approvedAt: new Date(),
            },
          },
          interactionItems: {
            create: [
              {
                title: "Personal Whisper Shoutout 🎙️",
                description: "Binaural 3D audio whisper mention with customized message",
                creditCost: 75,
                actionType: "ALERT_SOUND",
                sortOrder: 1,
              },
              {
                title: "Custom Sound Trigger 🔔",
                description: "Trigger chime, harp, or ocean sounds on live stream",
                creditCost: 150,
                actionType: "CUSTOM",
                sortOrder: 2,
              },
            ],
          },
        },
      },
    },
    include: {
      creatorProfile: true,
    },
  });

  // 4. Create Fans (Standard Fan & VIP Fan)
  const fan1 = await prisma.user.create({
    data: {
      email: "crypto_whale@fan.local",
      username: "alex_patron",
      displayName: "Alex Patron 💎",
      role: "FAN",
      kycStatus: "AGE_VERIFIED",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      wallet: {
        create: { balance: 2500 }, // 2,500 credits available
      },
      ageRecords: {
        create: {
          method: "ID_DOCUMENT_KYC",
          verificationToken: "age_tok_verified_user_alex_18plus",
          status: "APPROVED",
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
        },
      },
    },
    include: { wallet: true },
  });

  const fan2 = await prisma.user.create({
    data: {
      email: "neon_rider@fan.local",
      username: "neon_rider",
      displayName: "Neon Rider ⚡",
      role: "FAN",
      kycStatus: "AGE_VERIFIED",
      avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
      wallet: {
        create: { balance: 750 },
      },
      ageRecords: {
        create: {
          method: "CREDIT_CARD_ASSURANCE",
          verificationToken: "age_tok_verified_neon_card",
          status: "APPROVED",
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
        },
      },
    },
    include: { wallet: true },
  });

  // 5. Seed Real-time Chat Messages
  if (creator1User.creatorProfile) {
    await prisma.chatMessage.createMany({
      data: [
        {
          creatorId: creator1User.creatorProfile.id,
          senderId: fan1.id,
          senderName: fan1.displayName,
          senderRole: "FAN",
          senderBadge: "VIP",
          text: "Love the new neon stage setup! ✨",
          isTipNotice: false,
        },
        {
          creatorId: creator1User.creatorProfile.id,
          senderId: fan2.id,
          senderName: fan2.displayName,
          senderRole: "FAN",
          senderBadge: "TOP_TIPPER",
          text: "sent 100 tokens! [Spin the Wheel 🎡]",
          isTipNotice: true,
          tipAmount: 100,
          tipActionName: "Spin the Wheel 🎡",
        },
        {
          creatorId: creator1User.creatorProfile.id,
          senderId: creator1User.id,
          senderName: creator1User.displayName,
          senderRole: "CREATOR",
          senderBadge: "CREATOR",
          text: "Thank you so much Neon! Spinning the wheel right now! 🎉",
          isTipNotice: false,
        },
      ],
    });
  }

  console.log("✅ Seed completed successfully!");
  console.log(`Created Admins: ${admin.username}`);
  console.log(`Created Creators: ${creator1User.username}, ${creator2User.username}`);
  console.log(`Created Fans: ${fan1.username} (Balance: ${fan1.wallet?.balance}), ${fan2.username} (Balance: ${fan2.wallet?.balance})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
