import prisma from "../src/lib/db";

async function main() {
  console.log("🌱 Starting platform seed database with 12+ live creators & rich discovery feed...");

  // Clean existing records in cascade order
  await prisma.discoveryEvent.deleteMany({});
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
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80",
      wallet: {
        create: { balance: 10000 },
      },
    },
  });

  // 2. Define 12 Diverse Creators for Candidate Feed
  const creatorDefs = [
    {
      email: "maya@auralive.creator",
      username: "mayavelvet",
      displayName: "Maya Velvet ✨",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&auto=format&fit=crop&q=80",
      bio: "Hey loves! Professional dancer & model. Streaming live vibes, music & high energy goals! 💖",
      streamTitle: "Late Night Neon Lounge & Dance Requests 💃✨",
      isLive: true,
      viewerCount: 342,
      tags: "dance,music,vip,interactive,cosplay",
      goalTitle: "Cosplay Dance & Confetti Blast 🎉",
      goalTarget: 1000,
      goalProgress: 720,
      minTip: 1500,
      legalName: "Maya Elena Rostova",
      dob: "1998-04-14",
      idType: "PASSPORT",
      interactionItems: [
        { title: "Mini Dance (30s)", description: "Dedicated freestyle dance to current track", creditCost: 50, actionType: "DANCE" },
        { title: "Spin the Wheel 🎡", description: "Live spin with prizes, dare cards, and shoutouts", creditCost: 100, actionType: "WHEEL_SPIN" },
        { title: "Neon Confetti Pop 🎊", description: "Room-wide celebration effect with physical popper", creditCost: 250, actionType: "ALERT_SOUND" },
        { title: "VIP Highlight Spotlight ⭐", description: "Pinned spotlight chat message for 5 mins", creditCost: 500, actionType: "CHAT_HIGHLIGHT" },
      ],
      ppvs: [
        { title: "Exclusive Neon Cyberpunk Photoshoot (4K)", description: "Full resolution 30-photo gallery", previewUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80", mediaUrl: "https://cdn.platform.local/creators/mayavelvet/cyberpunk_set_4k.zip", creditPrice: 150, mediaType: "ALBUM" },
        { title: "Acoustic Backstage Recording & Q&A", description: "45-minute uncut studio session", previewUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80", mediaUrl: "https://cdn.platform.local/creators/mayavelvet/backstage_video.mp4", creditPrice: 300, mediaType: "VIDEO" }
      ]
    },
    {
      email: "chloe@auralive.creator",
      username: "chloesiren",
      displayName: "Chloe Siren 🌊",
      avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80",
      bio: "Late night ASMR, deep talks, binaural audio & cozy chill sessions. Join the siren squad! 🌙",
      streamTitle: "Midnight Binaural Whispers & Deep Relaxation 🎧💤",
      isLive: true,
      viewerCount: 289,
      tags: "asmr,chill,relax,interactive",
      goalTitle: "3Dio Free Space Binaural Mic Pro 🎙️",
      goalTarget: 800,
      goalProgress: 520,
      minTip: 1200,
      legalName: "Chloe Amanda Vance",
      dob: "1999-08-22",
      idType: "DRIVERS_LICENSE",
      interactionItems: [
        { title: "Personal Whisper Shoutout 🎙️", description: "3D binaural ear-to-ear whisper", creditCost: 75, actionType: "ALERT_SOUND" },
        { title: "Tapping & Scratching Session 🪵", description: "5 minutes custom texture triggers", creditCost: 150, actionType: "CUSTOM" },
        { title: "Cozy Storytime VIP Request 📖", description: "Read your custom bedtime story", creditCost: 350, actionType: "CUSTOM" },
      ],
      ppvs: [
        { title: "Rainy Night Binaural Soundscape & Visuals", description: "2-hour uninterrupted ultra-relax video", previewUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&auto=format&fit=crop&q=80", mediaUrl: "https://cdn.platform.local/creators/chloesiren/rainy_night.mp4", creditPrice: 200, mediaType: "VIDEO" }
      ]
    },
    {
      email: "elena@auralive.creator",
      username: "elenasol",
      displayName: "Elena Sol 🔥",
      avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&auto=format&fit=crop&q=80",
      bio: "Latin rhythm, workout fitness & high energy live interaction! Let's get hype! ⚡",
      streamTitle: "Salsa Fitness & Live Cardio Challenge! 💥💪",
      isLive: true,
      viewerCount: 412,
      tags: "dance,interactive,music,gaming",
      goalTitle: "100 Squats + Neon Party Glasses at 600! 🕶️",
      goalTarget: 600,
      goalProgress: 490,
      minTip: 1000,
      legalName: "Elena Maria Santos",
      dob: "1997-11-03",
      idType: "PASSPORT",
      interactionItems: [
        { title: "10 Squat Challenge 🏋️", description: "Instant workout set on stream", creditCost: 40, actionType: "CUSTOM" },
        { title: "Pick the Next Song 🎵", description: "Play your favorite workout anthem", creditCost: 100, actionType: "ALERT_SOUND" },
        { title: "Flex Pose for Screenshot 📸", description: "30s spotlight pose for chat", creditCost: 200, actionType: "DANCE" },
      ],
      ppvs: [
        { title: "Beach Sunset Cardio Full Workout Program", description: "Complete 4K workout video series", previewUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80", mediaUrl: "https://cdn.platform.local/creators/elenasol/workout_series.zip", creditPrice: 250, mediaType: "VIDEO" }
      ]
    },
    {
      email: "aria@auralive.creator",
      username: "ariabliss",
      displayName: "Aria Bliss 🌸",
      avatarUrl: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&auto=format&fit=crop&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80",
      bio: "Cosplay artist, gamer & anime enthusiast! Streaming JRPGs & live costume crafting 🎮✨",
      streamTitle: "Cyberpunk 2077 Netrunner Cosplay & Chill Gaming 👾",
      isLive: true,
      viewerCount: 520,
      tags: "cosplay,gaming,interactive,chill",
      goalTitle: "Secret Cosplay Reveal at 1,500 Tokens! 🎭",
      goalTarget: 1500,
      goalProgress: 1180,
      minTip: 2000,
      legalName: "Aria Lynn Thorne",
      dob: "2000-02-17",
      idType: "DRIVERS_LICENSE",
      interactionItems: [
        { title: "Change LED Lights Color 💡", description: "Set room LEDs to your chosen hue", creditCost: 60, actionType: "ALERT_SOUND" },
        { title: "In-Game Dare / Custom Weapon ⚔️", description: "Pick weapon or challenge in-game", creditCost: 120, actionType: "CUSTOM" },
        { title: "Signed Digital Polaroids 📷", description: "Custom watermark signed picture", creditCost: 300, actionType: "PRIVATE_SNAP" },
      ],
      ppvs: [
        { title: "Cyber Netrunner Cosplay High-Res Set", description: "40 high-res gallery shots", previewUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80", mediaUrl: "https://cdn.platform.local/creators/ariabliss/cyber_cosplay.zip", creditPrice: 180, mediaType: "ALBUM" }
      ]
    },
    {
      email: "luna@auralive.creator",
      username: "lunastarlight",
      displayName: "Luna Starlight 🌙",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80",
      bio: "Live acoustic guitar, original songwriting & singer-songwriter coffee vibes ☕🎸",
      streamTitle: "Acoustic Sunset Sessions & Song Requests 🎸🎙️",
      isLive: true,
      viewerCount: 195,
      tags: "music,chill,interactive,vip",
      goalTitle: "Record Special Request Single at 750! 🎶",
      goalTarget: 750,
      goalProgress: 420,
      minTip: 1000,
      legalName: "Luna Nicole Sterling",
      dob: "1996-09-12",
      idType: "PASSPORT",
      interactionItems: [
        { title: "Live Song Request 🎵", description: "Sing & play any song from repertoire", creditCost: 80, actionType: "ALERT_SOUND" },
        { title: "Custom Freestyle Song (60s) 🎤", description: "Acoustic verse written about you", creditCost: 250, actionType: "CUSTOM" },
        { title: "VIP Private Duet Chat 🌟", description: "Direct VIP chat highlight on stream", creditCost: 450, actionType: "CHAT_HIGHLIGHT" },
      ],
      ppvs: [
        { title: "Midnight Unplugged Album (Studio Master)", description: "High-res FLAC & behind the scenes video", previewUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80", mediaUrl: "https://cdn.platform.local/creators/lunastarlight/album.zip", creditPrice: 220, mediaType: "ALBUM" }
      ]
    },
    {
      email: "jade@auralive.creator",
      username: "jadefox",
      displayName: "Jade Fox 🦊",
      avatarUrl: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&auto=format&fit=crop&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1200&auto=format&fit=crop&q=80",
      bio: "DJ sets, electronic bass, party energy & high BPM vibes! Tune in and drop the bass! 🎧🔥",
      streamTitle: "Live Deep House & Cyber Rave DJ Set 🎛️⚡",
      isLive: true,
      viewerCount: 630,
      tags: "music,dance,interactive,party",
      goalTitle: "Hardstyle Drop & Laser Light Show at 1,200! 🚨",
      goalTarget: 1200,
      goalProgress: 980,
      minTip: 1800,
      legalName: "Jade Allison Fox",
      dob: "1999-05-30",
      idType: "DRIVERS_LICENSE",
      interactionItems: [
        { title: "Airhorn & Drop Siren 📢", description: "Trigger massive audio drop effect", creditCost: 50, actionType: "ALERT_SOUND" },
        { title: "BPM Speed Boost (10 mins) ⏩", description: "Crank the tempo to 140+ BPM", creditCost: 150, actionType: "CUSTOM" },
        { title: "Shoutout Over the Mic 🎙️", description: "Live MC shoutout during build-up", creditCost: 200, actionType: "ALERT_SOUND" },
      ],
      ppvs: [
        { title: "Exclusive Festival Set 2026 (Direct Feed)", description: "Complete 90-minute live visual set", previewUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80", mediaUrl: "https://cdn.platform.local/creators/jadefox/festival_set.mp4", creditPrice: 350, mediaType: "VIDEO" }
      ]
    },
    {
      email: "valentina@auralive.creator",
      username: "valentinavox",
      displayName: "Valentina Vox 👑",
      avatarUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&auto=format&fit=crop&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&auto=format&fit=crop&q=80",
      bio: "High fashion, luxury lifestyle, glamour & interactive VIP lounges. Only the finest! 💎",
      streamTitle: "VIP Gold Lounge: Styling, Gossip & Cocktails 🍸✨",
      isLive: true,
      viewerCount: 215,
      tags: "vip,chill,interactive,fashion",
      goalTitle: "Unbox Designer Mystery Box at 2,000! 🎁",
      goalTarget: 2000,
      goalProgress: 1450,
      minTip: 2500,
      legalName: "Valentina Rose Beaumont",
      dob: "1995-12-04",
      idType: "PASSPORT",
      interactionItems: [
        { title: "Champagne Toast 🥂", description: "Raise a glass with personalized toast", creditCost: 100, actionType: "ALERT_SOUND" },
        { title: "Fashion Advice / Outfit Rating 👗", description: "Personal style feedback live", creditCost: 200, actionType: "CUSTOM" },
        { title: "Crown VIP Fan of the Day 👑", description: "Top screen badge for full broadcast", creditCost: 1000, actionType: "CHAT_HIGHLIGHT" },
      ],
      ppvs: [
        { title: "Paris Fashion Week Exclusive Behind The Scenes", description: "Luxury gallery & personal vlogs", previewUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop&q=80", mediaUrl: "https://cdn.platform.local/creators/valentinavox/paris_vlog.zip", creditPrice: 400, mediaType: "ALBUM" }
      ]
    },
    {
      email: "samira@auralive.creator",
      username: "samiradance",
      displayName: "Samira Mirage 💃",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1200&auto=format&fit=crop&q=80",
      bio: "Belly dancing, fusion choreography & silk fan performances! Arabian night vibes 🌙💫",
      streamTitle: "Silk Fan Belly Dance & Eastern Beats 🏮✨",
      isLive: true,
      viewerCount: 380,
      tags: "dance,music,interactive,cosplay",
      goalTitle: "LED Wings Spectacular at 1,000 Tokens! 🦋",
      goalTarget: 1000,
      goalProgress: 810,
      minTip: 1500,
      legalName: "Samira Fatima Al-Mansoor",
      dob: "1997-07-19",
      idType: "PASSPORT",
      interactionItems: [
        { title: "Silk Veil Swirl Performance 🧕", description: "Dedicated 1-minute silk dance", creditCost: 65, actionType: "DANCE" },
        { title: "Finger Cymbal Chime 🔔", description: "Rhythm chime beat on stream", creditCost: 35, actionType: "ALERT_SOUND" },
        { title: "Custom Song Choreography 💃", description: "Dance to your selected song", creditCost: 300, actionType: "DANCE" },
      ],
      ppvs: [
        { title: "Desert Sunset Cinematic Dance Showcase", description: "4K cinematic dance short film", previewUrl: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=600&auto=format&fit=crop&q=80", mediaUrl: "https://cdn.platform.local/creators/samiradance/desert_dance.mp4", creditPrice: 260, mediaType: "VIDEO" }
      ]
    },
    {
      email: "zoe@auralive.creator",
      username: "zoepixel",
      displayName: "Zoe Pixel 🕹️",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80",
      bio: "Speedruns, horror games, retro arcade & funny live reactions! Scream queen 😱🎮",
      streamTitle: "Midnight Horror Game Marathon: Jump Scares! 👻🕹️",
      isLive: true,
      viewerCount: 470,
      tags: "gaming,interactive,chill,vip",
      goalTitle: "Eat Spicy Hot Chip on Next Jump Scare at 500! 🌶️",
      goalTarget: 500,
      goalProgress: 360,
      minTip: 1000,
      legalName: "Zoe Katherine Briggs",
      dob: "2001-03-25",
      idType: "DRIVERS_LICENSE",
      interactionItems: [
        { title: "Jump Scare Flash 💀", description: "Play surprise scream sound effect", creditCost: 70, actionType: "ALERT_SOUND" },
        { title: "Invert Game Controls (1 min) 🎮", description: "Play upside down for challenge", creditCost: 150, actionType: "CUSTOM" },
        { title: "Wheel of spicy snacks 🎡", description: "Spin and eat mystery spicy candy", creditCost: 200, actionType: "WHEEL_SPIN" },
      ],
      ppvs: [
        { title: "VR Horror Highlights & Funny Outtakes", description: "60-minute funniest scream compilation", previewUrl: "https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?w=600&auto=format&fit=crop&q=80", mediaUrl: "https://cdn.platform.local/creators/zoepixel/vr_horror.mp4", creditPrice: 160, mediaType: "VIDEO" }
      ]
    },
    {
      email: "nikki@auralive.creator",
      username: "nikkineon",
      displayName: "Nikki Neon ⚡",
      avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1200&auto=format&fit=crop&q=80",
      bio: "Synthwave aesthetics, retro roller skating & live art creations! Good energy only 🌈🎨",
      streamTitle: "Synthwave Roller Skating & Neon Canvas Painting 🎨🛼",
      isLive: true,
      viewerCount: 260,
      tags: "interactive,music,chill,dance",
      goalTitle: "Give Away Finished Live Neon Painting at 1,000! 🖼️",
      goalTarget: 1000,
      goalProgress: 640,
      minTip: 1200,
      legalName: "Nikki Danielle Chen",
      dob: "1998-10-15",
      idType: "PASSPORT",
      interactionItems: [
        { title: "Add Your Color to Painting 🎨", description: "Brush stroke in your favorite color", creditCost: 50, actionType: "CUSTOM" },
        { title: "Roller Spin Trick 🛼", description: "Live 360 degree spin on skates", creditCost: 100, actionType: "DANCE" },
        { title: "Name on Canvas Corner ✍️", description: "Permanent dedication on the painting", creditCost: 350, actionType: "CUSTOM" },
      ],
      ppvs: [
        { title: "Neon Canvas Art Time-Lapse & 4K Prints", description: "High resolution digital prints pack", previewUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80", mediaUrl: "https://cdn.platform.local/creators/nikkineon/art_pack.zip", creditPrice: 190, mediaType: "ALBUM" }
      ]
    },
    {
      email: "scarlett@auralive.creator",
      username: "scarlettrose",
      displayName: "Scarlett Rose 🌹",
      avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80",
      bio: "Romantic poetry, soft piano, candlelit evenings & heartfelt conversation 🕯️🍷",
      streamTitle: "Candlelit Wine & Late Night Heart-to-Heart Talks 🍷📖",
      isLive: true,
      viewerCount: 175,
      tags: "chill,relax,interactive,vip",
      goalTitle: "Piano Ballad Composition at 600 Tokens! 🎹",
      goalTarget: 600,
      goalProgress: 390,
      minTip: 1000,
      legalName: "Scarlett Rose Evans",
      dob: "1996-01-29",
      idType: "DRIVERS_LICENSE",
      interactionItems: [
        { title: "Poem Reading by Candlelight 📜", description: "Dedicated classic or requested poem", creditCost: 60, actionType: "CUSTOM" },
        { title: "Piano Chord Dedication 🎹", description: "Melodic tribute played live", creditCost: 120, actionType: "ALERT_SOUND" },
        { title: "Virtual Wine Clink 🍷", description: "Raise a toast with customized chat message", creditCost: 180, actionType: "ALERT_SOUND" },
      ],
      ppvs: [
        { title: "Candlelight Acoustic Piano Album (Lossless)", description: "12 original relaxation tracks", previewUrl: "https://images.unsplash.com/photo-1520523839898-5071282543e1?w=600&auto=format&fit=crop&q=80", mediaUrl: "https://cdn.platform.local/creators/scarlettrose/piano_album.zip", creditPrice: 220, mediaType: "ALBUM" }
      ]
    },
    {
      email: "amber@auralive.creator",
      username: "amberwaves",
      displayName: "Amber Waves ☀️",
      avatarUrl: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&auto=format&fit=crop&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80",
      bio: "Tropical surfing, California sunshine, ukulele acoustic tunes & positivity! 🏄‍♀️🌺",
      streamTitle: "Sunset Beach Ukulele Jam & Ocean Waves Live 🏖️🤙",
      isLive: true,
      viewerCount: 230,
      tags: "music,chill,interactive,relax",
      goalTitle: "Sunset Ukulele Singalong at 500 Tokens! 🎶",
      goalTarget: 500,
      goalProgress: 310,
      minTip: 800,
      legalName: "Amber Joy Callahan",
      dob: "1999-12-11",
      idType: "PASSPORT",
      interactionItems: [
        { title: "Ukulele Jam Request 🌺", description: "Play your favorite beach song", creditCost: 50, actionType: "ALERT_SOUND" },
        { title: "Wave Shoutout 🌊", description: "Dedicate an ocean wave to you", creditCost: 80, actionType: "CUSTOM" },
        { title: "Hula Dance Mini Clip 🌸", description: "Traditional hula dance live on beach", creditCost: 200, actionType: "DANCE" },
      ],
      ppvs: [
        { title: "Tropical Hawaii Surf & Drone 4K Film", description: "Scenic 45-minute surf film", previewUrl: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=600&auto=format&fit=crop&q=80", mediaUrl: "https://cdn.platform.local/creators/amberwaves/surf_film.mp4", creditPrice: 200, mediaType: "VIDEO" }
      ]
    }
  ];

  const createdCreators: any[] = [];

  for (const def of creatorDefs) {
    const creatorUser = await prisma.user.create({
      data: {
        email: def.email,
        username: def.username,
        displayName: def.displayName,
        role: "CREATOR",
        kycStatus: "COMPLIANCE_2257_APPROVED",
        avatarUrl: def.avatarUrl,
        wallet: {
          create: { balance: Math.floor(Math.random() * 5000) + 2000 },
        },
        creatorProfile: {
          create: {
            bio: def.bio,
            bannerUrl: def.bannerUrl,
            streamTitle: def.streamTitle,
            isLive: def.isLive,
            viewerCount: def.viewerCount,
            tags: def.tags,
            currentGoalTitle: def.goalTitle,
            currentGoalTarget: def.goalTarget,
            currentGoalProgress: def.goalProgress,
            isPrivateShow: false,
            minTipForPrivate: def.minTip,
            compliance2257: {
              create: {
                legalFullName: def.legalName,
                dateOfBirth: def.dob,
                governmentIdType: def.idType,
                idNumberEncrypted: `enc_SEC_${def.username.toUpperCase()}_2257`,
                documentVaultUrl: `vault://s3-compliance-2257/creators/${def.username}/kyc_records_vault.tar.gz`,
                verificationStatus: "APPROVED",
                approvedAt: new Date(),
              }
            },
            interactionItems: {
              create: def.interactionItems.map((item, idx) => ({
                title: item.title,
                description: item.description,
                creditCost: item.creditCost,
                actionType: item.actionType,
                sortOrder: idx + 1,
              }))
            },
            ppvContents: {
              create: def.ppvs.map(ppv => ({
                title: ppv.title,
                description: ppv.description,
                previewUrl: ppv.previewUrl,
                mediaUrl: ppv.mediaUrl,
                creditPrice: ppv.creditPrice,
                mediaType: ppv.mediaType,
              }))
            }
          }
        }
      },
      include: {
        creatorProfile: true,
        wallet: true,
      }
    });

    createdCreators.push(creatorUser);
  }

  // 3. Create Fans (Standard Fan & VIP Patron)
  const fan1 = await prisma.user.create({
    data: {
      id: "fan_alex",
      email: "crypto_whale@fan.local",
      username: "alex_patron",
      displayName: "Alex Patron 💎",
      role: "FAN",
      kycStatus: "AGE_VERIFIED",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      wallet: {
        create: { balance: 2500 },
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

  // 4. Create Subscriptions for Fan 1 to Maya Velvet & Chloe Siren
  if (createdCreators[0]?.creatorProfile) {
    await prisma.subscription.create({
      data: {
        fanId: fan1.id,
        creatorId: createdCreators[0].creatorProfile.id,
        tier: "VIP",
        creditCostMonthly: 200,
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      }
    });
  }

  if (createdCreators[1]?.creatorProfile) {
    await prisma.subscription.create({
      data: {
        fanId: fan1.id,
        creatorId: createdCreators[1].creatorProfile.id,
        tier: "VIP",
        creditCostMonthly: 200,
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      }
    });
  }

  // 5. Seed Real-time Chat Messages
  if (createdCreators[0]?.creatorProfile) {
    await prisma.chatMessage.createMany({
      data: [
        {
          creatorId: createdCreators[0].creatorProfile.id,
          senderId: fan1.id,
          senderName: fan1.displayName,
          senderRole: "FAN",
          senderBadge: "VIP",
          text: "Love the new neon stage setup! ✨",
          isTipNotice: false,
        },
        {
          creatorId: createdCreators[0].creatorProfile.id,
          senderId: fan2.id,
          senderName: fan2.displayName,
          senderRole: "FAN",
          senderBadge: "TOP_TIPPER",
          text: "sent 100 tokens! [Spin the Wheel 🎡]",
          isTipNotice: true,
          tipAmount: 100,
          tipActionName: "Spin the Wheel 🎡",
        },
      ],
    });
  }

  console.log("✅ Seed completed successfully!");
  console.log(`Created ${createdCreators.length} Live Creators in Candidate Pool`);
  console.log(`Created Admin: ${admin.username}`);
  console.log(`Created Fans: ${fan1.username}, ${fan2.username}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
