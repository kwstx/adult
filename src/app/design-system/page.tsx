"use client";

import React, { useState } from "react";
import {
  Display,
  Heading,
  Text,
  Caption,
  Overline,
  MonoNumber,
  Button,
  ButtonGroup,
  Input,
  Textarea,
  Select,
  Checkbox,
  Switch,
  Slider,
  RadioGroup,
  Radio,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  MediaCard,
  Modal,
  Drawer,
  Badge,
  Avatar,
  AvatarGroup,
  Icon,
  TokenIcon,
  LiveIcon,
  VipIcon,
  HeartIconCustom,
  FlameIconCustom,
  SparklesIcon,
  PulseBeacon,
  AudioWaveIndicator,
  ShimmerBox,
  CountUpNumber,
  useToast,
  ProgressBar,
  StreamGoalBar,
  CircularProgress,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Navbar,
  Breadcrumbs,
  Pagination,
} from "@/components/ui";

import {
  Sparkles,
  Search,
  Lock,
  Send,
  Heart,
  Volume2,
  Settings,
  Share2,
  DollarSign,
  Layers,
  Palette,
  Sliders,
  Bell,
  Eye,
} from "lucide-react";

export default function DesignSystemPage() {
  const toast = useToast();

  // Interactive States for Live Testing
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerBottomOpen, setIsDrawerBottomOpen] = useState(false);
  const [isDrawerRightOpen, setIsDrawerRightOpen] = useState(false);
  const [inputText, setInputText] = useState("AuraLive Creator");
  const [textareaText, setTextareaText] = useState("Exclusive 4K stream tonight starting at 10 PM EST. Don't miss out!");
  const [switchActive, setSwitchActive] = useState(true);
  const [checkboxActive, setCheckboxActive] = useState(true);
  const [sliderValue, setSliderValue] = useState(65);
  const [radioValue, setRadioValue] = useState("vip");
  const [selectValue, setSelectValue] = useState("1080p");
  const [btnLoading, setBtnLoading] = useState(false);
  const [paginationPage, setPaginationPage] = useState(1);
  const [goalAmount, setGoalAmount] = useState(4850);

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-6 sm:p-10 max-w-7xl mx-auto space-y-16 pb-32">
      {/* Header & Hero */}
      <section className="space-y-4 border-b border-white/[0.08] pb-10">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="live" pulse>
            SYSTEM ACTIVE
          </Badge>
          <Badge variant="vip">AURALIVE V1.0</Badge>
          <Badge variant="accent">DARK · MINIMALIST · EDGY</Badge>
        </div>

        <Display size="2xl" gradient>
          AuraLive Design System
        </Display>

        <Text size="lg" variant="secondary" className="max-w-3xl leading-relaxed">
          The unified, production-grade visual identity and component foundation for AuraLive.
          Built with dark neutral carbons, signature electric rose accent, restraint, large high-contrast typography, subtle glass/transparency, and fast micro-animations.
        </Text>

        <div className="pt-4 flex flex-wrap gap-3">
          <Button
            variant="primary"
            leftIcon={<Layers className="h-4 w-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Launch Modal Dialog
          </Button>

          <Button
            variant="secondary"
            leftIcon={<Sliders className="h-4 w-4" />}
            onClick={() => setIsDrawerBottomOpen(true)}
          >
            Open Bottom Sheet
          </Button>

          <Button
            variant="glass"
            leftIcon={<Palette className="h-4 w-4" />}
            onClick={() => setIsDrawerRightOpen(true)}
          >
            Open Right Drawer
          </Button>

          <Button
            variant="vip"
            leftIcon={<Sparkles className="h-4 w-4" />}
            onClick={() =>
              toast.tip({
                amount: 1000,
                senderName: "WhaleFan99",
                message: "You are the absolute best! Keep shining 🔥",
              })
            }
          >
            Trigger Tip Alert Toast
          </Button>
        </div>
      </section>

      {/* SECTION 1: TYPOGRAPHY */}
      <section className="space-y-6">
        <div className="border-b border-white/[0.08] pb-3">
          <Overline variant="accent">01. Hierarchy & Type</Overline>
          <Heading level={2} size="1">Typography System</Heading>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card variant="glass" className="p-6 space-y-6">
            <div className="space-y-1">
              <Overline>Display Scale</Overline>
              <Display size="xl">Display XL Title</Display>
              <Display size="lg" gradient>
                Display LG Gradient Accent
              </Display>
            </div>

            <div className="space-y-2 border-t border-white/[0.06] pt-4">
              <Overline>Heading Scale</Overline>
              <Heading size="1">H1 Heading (30px / -0.025em)</Heading>
              <Heading size="2">H2 Heading (24px / -0.02em)</Heading>
              <Heading size="3">H3 Heading (20px / -0.015em)</Heading>
              <Heading size="4">H4 Heading (18px / -0.01em)</Heading>
            </div>
          </Card>

          <Card variant="glass" className="p-6 space-y-6">
            <div className="space-y-2">
              <Overline>Body & Informational Text</Overline>
              <Text size="lg" variant="primary">
                Large Body — High contrast body text designed for readability on dark OLED displays.
              </Text>
              <Text size="base" variant="secondary">
                Base Body — Secondary neutral shade with subtle warmth and crisp contrast.
              </Text>
              <Text size="sm" variant="muted">
                Small Body / Muted — Muted metadata, descriptions, timestamps, and annotations.
              </Text>
              <Text size="xs" variant="accent">
                XS Accent Text — Highlighted micro labels and critical interactive cues.
              </Text>
            </div>

            <div className="space-y-2 border-t border-white/[0.06] pt-4">
              <Overline>Financial Monospace Numerals</Overline>
              <div className="flex items-center gap-6">
                <div>
                  <Caption>Wallet Balance</Caption>
                  <div>
                    <MonoNumber size="xl" variant="gold">
                      54,250
                    </MonoNumber>
                    <span className="text-xs text-amber-400 font-semibold ml-1">TOKENS</span>
                  </div>
                </div>
                <div>
                  <Caption>Estimated Earnings</Caption>
                  <div>
                    <MonoNumber size="xl" variant="accent">
                      $4,340.00
                    </MonoNumber>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* SECTION 2: SPACING & RADIUS */}
      <section className="space-y-6">
        <div className="border-b border-white/[0.08] pb-3">
          <Overline variant="accent">02. Geometry & Scale</Overline>
          <Heading level={2} size="1">Corner Radii & Spacing Scale</Heading>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {[
            { label: "xs (4px)", radius: "rounded-xs" },
            { label: "sm (6px)", radius: "rounded-sm" },
            { label: "md (8px)", radius: "rounded-md" },
            { label: "lg (12px)", radius: "rounded-lg" },
            { label: "xl (16px)", radius: "rounded-xl" },
            { label: "2xl (20px)", radius: "rounded-2xl" },
            { label: "full (9999px)", radius: "rounded-full" },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`h-24 bg-surface-card border border-white/[0.1] ${item.radius} flex flex-col items-center justify-center p-2 text-center transition-all hover:border-accent`}
            >
              <span className="text-[11px] font-mono text-zinc-300 font-bold">{item.label}</span>
              <span className="text-[9px] text-zinc-500 uppercase mt-1">Border Radius</span>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3: BUTTONS */}
      <section className="space-y-6">
        <div className="border-b border-white/[0.08] pb-3">
          <Overline variant="accent">03. Interactive Actions</Overline>
          <Heading level={2} size="1">Buttons & Button Groups</Heading>
        </div>

        <Card variant="glass" className="p-6 space-y-6">
          <div className="space-y-3">
            <Overline>Variants</Overline>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" leftIcon={<Sparkles className="h-4 w-4" />}>
                Primary Accent
              </Button>
              <Button variant="secondary" leftIcon={<Settings className="h-4 w-4" />}>
                Secondary Surface
              </Button>
              <Button variant="outline">Outline Wireframe</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="glass" leftIcon={<Eye className="h-4 w-4" />}>
                Glass Blur
              </Button>
              <Button variant="vip" leftIcon={<VipIcon size="xs" />}>
                VIP Prestige Gold
              </Button>
              <Button variant="danger">Danger Action</Button>
            </div>
          </div>

          <div className="space-y-3 border-t border-white/[0.06] pt-4">
            <Overline>Sizes & Loading Micro-states</Overline>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="xs" variant="secondary">Size XS</Button>
              <Button size="sm" variant="secondary">Size SM</Button>
              <Button size="md" variant="secondary">Size MD</Button>
              <Button size="lg" variant="secondary">Size LG</Button>
              <Button size="xl" variant="primary">Size XL</Button>
              <Button
                variant="primary"
                isLoading={btnLoading}
                onClick={() => {
                  setBtnLoading(true);
                  setTimeout(() => setBtnLoading(false), 2000);
                }}
              >
                {btnLoading ? "Processing" : "Click for Loading State"}
              </Button>
            </div>
          </div>

          <div className="space-y-3 border-t border-white/[0.06] pt-4">
            <Overline>Segmented Button Group</Overline>
            <ButtonGroup attached>
              <Button variant="secondary" size="sm">Day</Button>
              <Button variant="secondary" size="sm">Week</Button>
              <Button variant="primary" size="sm">Month</Button>
              <Button variant="secondary" size="sm">Year</Button>
            </ButtonGroup>
          </div>
        </Card>
      </section>

      {/* SECTION 4: FORM CONTROLS & INPUTS */}
      <section className="space-y-6">
        <div className="border-b border-white/[0.08] pb-3">
          <Overline variant="accent">04. Data Entry</Overline>
          <Heading level={2} size="1">Inputs, Select, Switches & Sliders</Heading>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card variant="glass" className="p-6 space-y-5">
            <div>
              <Label required subText="Display name seen in live chat and profile">
                Creator Username
              </Label>
              <div className="mt-1.5">
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Enter name"
                  clearable
                  onClear={() => setInputText("")}
                  startIcon={<Search className="h-4 w-4" />}
                />
              </div>
            </div>

            <div>
              <Label required>Password with Visibility Toggle</Label>
              <div className="mt-1.5">
                <Input
                  type="password"
                  defaultValue="SuperSecretPass123"
                  startIcon={<Lock className="h-4 w-4" />}
                />
              </div>
            </div>

            <div>
              <Label>Resolution Preset (Select Dropdown)</Label>
              <div className="mt-1.5">
                <Select
                  value={selectValue}
                  onChange={(e) => setSelectValue(e.target.value)}
                  options={[
                    { value: "4k", label: "4K Ultra HD (60 FPS, 15 Mbps)" },
                    { value: "1080p", label: "1080p Full HD (60 FPS, 8 Mbps)" },
                    { value: "720p", label: "720p HD (Low Latency Mode)" },
                  ]}
                />
              </div>
            </div>

            <div>
              <Label subText="Maximum 200 characters">Stream Announcement Message</Label>
              <div className="mt-1.5">
                <Textarea
                  value={textareaText}
                  onChange={(e) => setTextareaText(e.target.value)}
                  maxLength={200}
                  showCharCount
                  rows={3}
                />
              </div>
            </div>
          </Card>

          <Card variant="glass" className="p-6 space-y-6">
            <div className="space-y-4">
              <Overline>Toggles & Choices</Overline>
              <Switch
                label="Low-Latency WebRTC Ingest"
                description="Enables sub-second live interactions with viewers"
                checked={switchActive}
                onChange={(e) => setSwitchActive(e.target.checked)}
              />

              <Checkbox
                label="18+ Age & Compliance Verified"
                description="I confirm 18 U.S.C. § 2257 compliance documentation is attached."
                checked={checkboxActive}
                onChange={(e) => setCheckboxActive(e.target.checked)}
              />
            </div>

            <div className="space-y-3 border-t border-white/[0.06] pt-4">
              <Label>Stream Audio Master Gain ({sliderValue}%)</Label>
              <Slider
                value={sliderValue}
                onChange={(e) => setSliderValue(Number(e.target.value))}
                min={0}
                max={100}
                showValue
                valueFormatter={(v) => `${v}%`}
              />
            </div>

            <div className="space-y-3 border-t border-white/[0.06] pt-4">
              <Label>Access Tier Permission</Label>
              <RadioGroup
                value={radioValue}
                onValueChange={(val) => setRadioValue(String(val))}
              >
                <Radio
                  value="public"
                  label="Public Free Stream"
                  description="Open to all registered 18+ members"
                />
                <Radio
                  value="vip"
                  label="VIP Subscriber Only"
                  description="Requires active tier subscription or whale pass"
                />
                <Radio
                  value="private"
                  label="1-on-1 Private Session"
                  description="Exclusive direct room booking"
                />
              </RadioGroup>
            </div>
          </Card>
        </div>
      </section>

      {/* SECTION 5: CARDS & MEDIA VAULT PREVIEWS */}
      <section className="space-y-6">
        <div className="border-b border-white/[0.08] pb-3">
          <Overline variant="accent">05. Content Containers</Overline>
          <Heading level={2} size="1">Cards & Livestream Media Cards</Heading>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Interactive Live Stream Card (16:9) */}
          <MediaCard
            aspectRatio="16/9"
            isLive
            viewerCount={1420}
            overlayFooter={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar name="Elena Fox" size="sm" isLive />
                  <div>
                    <p className="text-xs font-bold text-white leading-none">Elena Fox</p>
                    <p className="text-[10px] text-zinc-300 mt-0.5">Late Night Q&A & Chill</p>
                  </div>
                </div>
                <Badge variant="accent" size="sm">
                  100 Tokens / Tip
                </Badge>
              </div>
            }
          />

          {/* Card 2: Interactive Vertical Stream (9:16) */}
          <MediaCard
            aspectRatio="16/9"
            badge={<Badge variant="vip">PPV VAULT</Badge>}
            overlayFooter={
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Behind The Scenes 4K Vault</p>
                  <p className="text-[10px] text-zinc-400">12 min · 60 FPS</p>
                </div>
                <Button size="xs" variant="primary">
                  Unlock 250 T
                </Button>
              </div>
            }
          />

          {/* Card 3: Interactive Elevated Card */}
          <Card variant="interactive" className="p-5 flex flex-col justify-between">
            <CardHeader className="p-0">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="tier">TIER 3 PERK</Badge>
                <VipIcon size="sm" />
              </div>
              <CardTitle>Private Direct Line</CardTitle>
              <CardDescription>
                Direct prioritized messaging queue with instant media delivery and unread alerts.
              </CardDescription>
            </CardHeader>
            <CardFooter className="p-0 mt-4 border-none flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-amber-400">500 TOKENS / MO</span>
              <Button size="xs" variant="vip">Subscribe</Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* SECTION 6: BADGES, AVATARS & ICONS */}
      <section className="space-y-6">
        <div className="border-b border-white/[0.08] pb-3">
          <Overline variant="accent">06. Identity & Visual Cues</Overline>
          <Heading level={2} size="1">Badges, Avatars & System Icons</Heading>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card variant="glass" className="p-6 space-y-5">
            <Overline>Badges & Status Tags</Overline>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="live" pulse dot>LIVE</Badge>
              <Badge variant="vip" dot>WHALE VIP</Badge>
              <Badge variant="accent">FEATURED</Badge>
              <Badge variant="tier">LEVEL 42</Badge>
              <Badge variant="success" dot>ONLINE</Badge>
              <Badge variant="danger">MUTED</Badge>
              <Badge variant="outline">HD 60FPS</Badge>
              <Badge variant="default" onDismiss={() => alert("Dismissed")}>
                Dismissible Tag
              </Badge>
            </div>

            <div className="border-t border-white/[0.06] pt-4 space-y-3">
              <Overline>Micro-Animation Indicators</Overline>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <PulseBeacon color="live" size="md" />
                  <span className="text-xs text-zinc-300">Live Beacon</span>
                </div>
                <div className="flex items-center gap-2">
                  <AudioWaveIndicator isPlaying />
                  <span className="text-xs text-zinc-300">Audio Equalizer</span>
                </div>
                <div className="flex items-center gap-2">
                  <CountUpNumber target={24950} duration={800} />
                  <span className="text-xs text-amber-400 font-bold">TOKENS</span>
                </div>
              </div>
            </div>
          </Card>

          <Card variant="glass" className="p-6 space-y-5">
            <Overline>Avatar Scale & Statuses</Overline>
            <div className="flex flex-wrap items-center gap-4">
              <Avatar size="xs" name="Alex Ray" status="online" />
              <Avatar size="sm" name="Bella Rose" status="busy" />
              <Avatar size="md" name="Scarlet V" isVerified status="online" />
              <Avatar size="lg" name="Elena Fox" isLive tierLevel={8} />
              <Avatar size="xl" name="Diamond Whale" isVip />
            </div>

            <div className="border-t border-white/[0.06] pt-4 space-y-3">
              <Overline>Avatar Group (Stacked Supporters)</Overline>
              <AvatarGroup max={4} size="md">
                <Avatar name="User One" />
                <Avatar name="User Two" />
                <Avatar name="User Three" />
                <Avatar name="User Four" />
                <Avatar name="User Five" />
                <Avatar name="User Six" />
              </AvatarGroup>
            </div>
          </Card>
        </div>
      </section>

      {/* SECTION 7: PROGRESS BARS & GOALS */}
      <section className="space-y-6">
        <div className="border-b border-white/[0.08] pb-3">
          <Overline variant="accent">07. Progress & Telemetry</Overline>
          <Heading level={2} size="1">Progress Bars & Stream Goals</Heading>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card variant="glass" className="p-6 space-y-5">
            <Overline>Linear Progress Meters</Overline>
            <div className="space-y-4">
              <ProgressBar value={75} variant="accent" showLabel />
              <ProgressBar value={45} variant="gold" showLabel />
              <ProgressBar value={90} variant="gradient" showLabel />
            </div>

            <div className="border-t border-white/[0.06] pt-4 flex items-center justify-around">
              <div className="flex flex-col items-center gap-1.5">
                <CircularProgress value={85} variant="accent" showValue size="lg" />
                <span className="text-[11px] text-zinc-400">Fan Affinity</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <CircularProgress value={60} variant="gold" showValue size="lg" />
                <span className="text-[11px] text-zinc-400">Monthly Goal</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <CircularProgress variant="accent" size="lg" />
                <span className="text-[11px] text-zinc-400">Stream Buffer</span>
              </div>
            </div>
          </Card>

          <Card variant="glass" className="p-6 space-y-5 flex flex-col justify-between">
            <Overline>Interactive Stream Goal</Overline>
            <StreamGoalBar
              title="Cosplay & Dance Performance"
              current={goalAmount}
              target={5000}
              checkpoints={[1500, 3000, 4500]}
            />

            <div className="flex items-center justify-between pt-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setGoalAmount((prev) => Math.min(5000, prev + 250))}
              >
                +250 Tokens
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => setGoalAmount((prev) => Math.min(5000, prev + 1000))}
              >
                +1,000 Tokens
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setGoalAmount(1200)}
              >
                Reset
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* SECTION 8: TABS & NAVIGATION */}
      <section className="space-y-6">
        <div className="border-b border-white/[0.08] pb-3">
          <Overline variant="accent">08. Navigation & Tabs</Overline>
          <Heading level={2} size="1">Navigation Rails, Top Bar & Tabs</Heading>
        </div>

        <Card variant="glass" className="p-6 space-y-6">
          <Overline>Tabs (Underline Style)</Overline>
          <Tabs defaultValue="chat" variant="underline">
            <TabsList>
              <TabsTrigger value="chat" badge={<Badge variant="accent" size="sm">24</Badge>}>
                Live Chat
              </TabsTrigger>
              <TabsTrigger value="gifts">Interaction Menu</TabsTrigger>
              <TabsTrigger value="vault">PPV Media Vault</TabsTrigger>
              <TabsTrigger value="fans">Top Supporters</TabsTrigger>
            </TabsList>
            <TabsContent value="chat">
              <div className="p-4 rounded-md bg-surface-base border border-white/[0.06] text-xs text-zinc-300">
                Live Chat feed is active with low-latency real-time messages.
              </div>
            </TabsContent>
            <TabsContent value="gifts">
              <div className="p-4 rounded-md bg-surface-base border border-white/[0.06] text-xs text-zinc-300">
                Paid interaction items and creator menu configured.
              </div>
            </TabsContent>
            <TabsContent value="vault">
              <div className="p-4 rounded-md bg-surface-base border border-white/[0.06] text-xs text-zinc-300">
                Exclusive locked media vault items.
              </div>
            </TabsContent>
            <TabsContent value="fans">
              <div className="p-4 rounded-md bg-surface-base border border-white/[0.06] text-xs text-zinc-300">
                Top weekly and all-time tipping leaderboard.
              </div>
            </TabsContent>
          </Tabs>

          <div className="border-t border-white/[0.06] pt-4 space-y-4">
            <Overline>Breadcrumbs & Pagination</Overline>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Breadcrumbs
                items={[
                  { label: "Home", href: "/" },
                  { label: "Discover", href: "/discover" },
                  { label: "Elena Fox", href: "/creator/elena" },
                  { label: "Live Room" },
                ]}
              />

              <Pagination
                currentPage={paginationPage}
                totalPages={10}
                onPageChange={setPaginationPage}
              />
            </div>
          </div>
        </Card>
      </section>

      {/* INTERACTIVE MODAL COMPONENT */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Confirm Paid Interaction"
        description="Your token balance will be deducted immediately upon creator acceptance."
      >
        <div className="space-y-4">
          <div className="p-4 rounded-md bg-surface-base border border-white/[0.08] flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">Custom Fan Request</p>
              <p className="text-xs text-zinc-400">Elena Fox · 2 min queue wait</p>
            </div>
            <div className="text-right">
              <MonoNumber size="lg" variant="gold">
                500
              </MonoNumber>
              <span className="text-xs text-amber-400 font-bold ml-1">TOKENS</span>
            </div>
          </div>

          <Textarea placeholder="Enter your custom request message for the creator..." rows={3} />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsModalOpen(false);
                toast.success("Request Submitted", "Elena Fox has received your 500 token interaction.");
              }}
            >
              Confirm & Pay
            </Button>
          </div>
        </div>
      </Modal>

      {/* INTERACTIVE BOTTOM SHEET DRAWER */}
      <Drawer
        isOpen={isDrawerBottomOpen}
        onClose={() => setIsDrawerBottomOpen(false)}
        placement="bottom"
        title="Interaction & Gift Menu"
        description="Send instant animated gifts to trigger room alerts"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
          {[
            { name: "Neon Heart", cost: 50, icon: "💖" },
            { name: "VIP Champagne", cost: 250, icon: "🍾" },
            { name: "Super Car", cost: 1000, icon: "🏎️" },
            { name: "Golden Crown", cost: 5000, icon: "👑" },
          ].map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setIsDrawerBottomOpen(false);
                toast.tip({
                  amount: item.cost,
                  senderName: "You",
                  message: `Sent ${item.name}!`,
                });
              }}
              className="p-3 rounded-lg bg-surface-base border border-white/[0.08] hover:border-accent flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs font-bold text-zinc-200">{item.name}</span>
              <span className="text-[11px] font-mono text-amber-400 font-semibold">{item.cost} T</span>
            </button>
          ))}
        </div>
      </Drawer>

      {/* INTERACTIVE RIGHT DRAWER */}
      <Drawer
        isOpen={isDrawerRightOpen}
        onClose={() => setIsDrawerRightOpen(false)}
        placement="right"
        title="Design Token Inspector"
        description="Inspect active theme variables and CSS parameters"
      >
        <div className="space-y-4 text-xs font-mono">
          <div className="p-3 rounded bg-black/60 border border-white/[0.08]">
            <p className="text-accent font-bold">Accent Color: #f42567</p>
            <p className="text-zinc-400">RGB: (244, 37, 103)</p>
            <p className="text-zinc-500">Tailwind: bg-accent, text-accent</p>
          </div>

          <div className="p-3 rounded bg-black/60 border border-white/[0.08]">
            <p className="text-amber-400 font-bold">VIP Gold: #f59e0b</p>
            <p className="text-zinc-400">RGB: (245, 158, 11)</p>
            <p className="text-zinc-500">Tailwind: bg-gold, text-gold</p>
          </div>

          <div className="p-3 rounded bg-black/60 border border-white/[0.08]">
            <p className="text-zinc-100 font-bold">Surface Card: #18181c</p>
            <p className="text-zinc-400">Border: rgba(255, 255, 255, 0.08)</p>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
