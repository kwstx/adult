-- ============================================================================
-- MIGRATION 0_INIT: Authoritative PostgreSQL Database Schema
-- Generated for PostgreSQL as Authoritative System of Record
-- ============================================================================

-- Load Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Load Enums
CREATE TYPE "UserRole" AS ENUM ('FAN', 'CREATOR', 'MODERATOR', 'ADMIN', 'AUDITOR');
CREATE TYPE "KYCStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'AGE_VERIFIED', 'COMPLIANCE_2257_APPROVED', 'REJECTED', 'SUSPENDED');
CREATE TYPE "GovIdType" AS ENUM ('PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID', 'RESIDENCE_PERMIT');
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED');
CREATE TYPE "FollowNotifyTier" AS ENUM ('ALL', 'LIVE_ONLY', 'NONE');
CREATE TYPE "StreamMode" AS ENUM ('PUBLIC_BROADCAST', 'SUBSCRIBERS_ONLY', 'TICKETED_PPV', 'PRIVATE_1ON1', 'VIP_GROUP');
CREATE TYPE "StreamStatus" AS ENUM ('SCHEDULED', 'PREPARING', 'LIVE', 'PAUSED', 'ENDED', 'TERMINATED_SAFETY');
CREATE TYPE "ParticipantStreamRole" AS ENUM ('VIEWER', 'SUBSCRIBER', 'VIP', 'MODERATOR', 'CO_HOST', 'GUEST');
CREATE TYPE "SubscriptionTier" AS ENUM ('BASIC', 'VIP', 'DIAMOND', 'CUSTOM');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED', 'PAUSED');
CREATE TYPE "ProductType" AS ENUM ('DIGITAL_DOWNLOAD', 'PHYSICAL_MERCH', 'CUSTOM_SERVICE', 'SHOUTOUT', 'VIP_PASS', 'TOY_CONTROL_PASS');
CREATE TYPE "ContentType" AS ENUM ('PHOTO', 'VIDEO', 'AUDIO', 'ALBUM', 'POST', 'BUNDLE');
CREATE TYPE "ContentAccessLevel" AS ENUM ('PUBLIC', 'FOLLOWERS_ONLY', 'SUBSCRIBERS_ONLY', 'PPV_PURCHASE', 'TIER_VIP_ONLY');
CREATE TYPE "ConversationType" AS ENUM ('DIRECT_DM', 'CREATOR_FAN_DM', 'GROUP_CHAT', 'SUPPORT_TICKET');
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'TIP_ATTACHED', 'PPV_LOCKED_MEDIA', 'SYSTEM_NOTICE');
CREATE TYPE "WalletStatus" AS ENUM ('ACTIVE', 'FROZEN_SECURITY', 'SUSPENDED_CHARGEBACK');
CREATE TYPE "WalletTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'LIVE_TIP', 'PPV_PURCHASE', 'SUBSCRIPTION_PAYMENT', 'PRODUCT_PURCHASE', 'INTERACTION_FEE', 'PRIVATE_BOOKING', 'GOAL_CONTRIBUTION', 'GAME_ENTRY_FEE', 'GAME_JACKPOT_WIN', 'PLATFORM_FEE_RAKE', 'REFUND', 'CHARGEBACK_REVERSAL', 'ADMIN_ADJUSTMENT');
CREATE TYPE "TransactionDirection" AS ENUM ('DEBIT', 'CREDIT', 'TRANSFER');
CREATE TYPE "WalletTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');
CREATE TYPE "PaymentGateway" AS ENUM ('CCBILL', 'SEGPAY', 'EPOCH', 'STRIPE', 'NOWPAYMENTS', 'COINBASE_COMMERCE', 'MANUAL_BANK');
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('INITIALIZED', 'PENDING_WEBHOOK', 'SUCCEEDED', 'FAILED', 'DISPUTED_CHARGEBACK', 'REFUNDED');
CREATE TYPE "EarningSourceType" AS ENUM ('LIVE_TIP', 'SUBSCRIPTION', 'PPV_CONTENT', 'PRIVATE_SESSION', 'PRODUCT_SALE', 'INTERACTION', 'GOAL_REWARD', 'GAME_REWARD', 'PLATFORM_BONUS');
CREATE TYPE "EarningClearanceStatus" AS ENUM ('PENDING_HOLD', 'CLEARED', 'PAID_OUT', 'REVERSED_FRAUD');
CREATE TYPE "PayoutMethod" AS ENUM ('SEPA_BANK', 'ACH_DIRECT', 'MASS_PAY', 'PAXUM', 'COSMO_PAY', 'CRYPTO_USDT', 'WIRE');
CREATE TYPE "PayoutStatus" AS ENUM ('REQUESTED', 'UNDER_COMPLIANCE_REVIEW', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED');
CREATE TYPE "InteractionActionType" AS ENUM ('TIP_ALERT', 'SOUND_EFFECT', 'VIBRATION_TOY', 'WHEEL_SPIN', 'DANCE_REQUEST', 'COSTUME_CHANGE', 'CHAT_PIN', 'POLL_VOTE', 'CUSTOM_ACTION');
CREATE TYPE "InteractionPurchaseStatus" AS ENUM ('PAID', 'QUEUED', 'EXECUTING', 'COMPLETED', 'REJECTED', 'REFUNDED');
CREATE TYPE "QueueEntryStatus" AS ENUM ('PENDING', 'CURRENTLY_PLAYING', 'COMPLETED', 'SKIPPED', 'CANCELLED');
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'REACHED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "RelationshipTier" AS ENUM ('STRANGER', 'SUPPORTER', 'SUPERFAN', 'VIP_DEVOTEE', 'SOULMATE', 'ROYAL_PATRON');
CREATE TYPE "RelationshipXPType" AS ENUM ('LIVE_TIP', 'CHAT_MESSAGE', 'STREAM_WATCH_TIME', 'PPV_PURCHASE', 'SUBSCRIPTION_RENEWAL', 'GOAL_CONTRIBUTION', 'GAME_PARTICIPATION');
CREATE TYPE "PlatformXPType" AS ENUM ('DAILY_LOGIN', 'FIRST_DEPOSIT', 'WATCH_STREAM', 'UNLOCK_ACHIEVEMENT', 'WRITE_REVIEW', 'COMMUNITY_QUEST', 'LEVEL_UP_BONUS');
CREATE TYPE "AchievementCategory" AS ENUM ('FAN_LOYALTY', 'SPENDING', 'WATCH_TIME', 'SOCIAL', 'GAMING', 'CREATOR_MILESTONE');
CREATE TYPE "BadgeTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MYTHIC');
CREATE TYPE "SeatTier" AS ENUM ('VIP_FRONT_ROW', 'VIP_BOX', 'CO_HOST_STAGE', 'GUEST_CAMERA', 'MODERATOR_CHAIR');
CREATE TYPE "LeaderboardScope" AS ENUM ('GLOBAL_PLATFORM', 'CREATOR_ROOM', 'LIVESTREAM_SESSION');
CREATE TYPE "LeaderboardTimeframe" AS ENUM ('ALL_TIME', 'MONTHLY', 'WEEKLY', 'DAILY', 'STREAM_SESSION');
CREATE TYPE "BookingStatus" AS ENUM ('PENDING_CREATOR_ACCEPT', 'ACCEPTED', 'REJECTED', 'CANCELLED_BY_FAN', 'CANCELLED_BY_CREATOR', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW');
CREATE TYPE "ReportCategory" AS ENUM ('UNDERAGE_SUSPICION', 'NON_CONSENSUAL_CONTENT', 'HARASSMENT_ABUSE', 'VIOLENCE_THREATS', 'COPYRIGHT_INFRINGEMENT', 'FINANCIAL_FRAUD', 'SPAM_SCAM', 'TOY_SAFETY_VIOLATION', 'OTHER');
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'ASSIGNED_TO_MODERATOR', 'UNDER_REVIEW', 'ACTION_TAKEN', 'RESOLVED_DISMISSED', 'ESCALATED_LEGAL');
CREATE TYPE "ModerationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL_URGENT_UNDERAGE');
CREATE TYPE "ModerationCaseStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'AWAITING_ID_REAUTH', 'ESCALATED_LEGAL', 'CLOSED_RESOLVED');
CREATE TYPE "ModerationActionType" AS ENUM ('NONE', 'WARNING_MESSAGE', 'SHADOWBAN', 'TEMPORARY_SUSPENSION', 'PERMANENT_BAN', 'COMPLIANCE_2257_REVOCATION', 'NCMEC_LEGAL_ESCALATION');
CREATE TYPE "NotificationType" AS ENUM ('CREATOR_WENT_LIVE', 'TIP_RECEIVED', 'NEW_SUBSCRIBER', 'SUB_RENEWAL', 'INTERACTION_QUEUED', 'INTERACTION_EXECUTED', 'GOAL_REACHED', 'PRIVATE_BOOKING_REQUEST', 'PRIVATE_BOOKING_CONFIRMED', 'MODERATION_WARNING', 'SYSTEM_ANNOUNCEMENT', 'ACHIEVEMENT_UNLOCKED');
CREATE TYPE "GameType" AS ENUM ('SPIN_THE_WHEEL', 'TRIVIA_ARENA', 'MYSTERY_BOX', 'PLINKO_DROP', 'DUEL_CHALLENGE');
CREATE TYPE "GameSessionStatus" AS ENUM ('LOBBY_WAITING', 'ACTIVE_IN_PROGRESS', 'CALCULATING_RESULTS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "GameRewardType" AS ENUM ('CREDITS_JACKPOT', 'PPV_CONTENT_FREE', 'VIP_BADGE_PASS', 'FREE_SUB_MONTH', 'EXCLUSIVE_SHOUTOUT', 'PHYSICAL_GIFT', 'XP_BOOST');

-- Tables
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "banner_url" TEXT,
    "bio" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'FAN',
    "kyc_status" "KYCStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "ban_reason" TEXT,
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "creator_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "stage_name" TEXT,
    "bio" TEXT,
    "banner_url" TEXT,
    "category" TEXT,
    "tags" TEXT NOT NULL DEFAULT 'interactive,live',
    "stream_key" TEXT NOT NULL,
    "ingest_url" TEXT NOT NULL DEFAULT 'rtmp://live.platform.local/app',
    "playback_hls_url" TEXT,
    "playback_whep_url" TEXT,
    "is_live" BOOLEAN NOT NULL DEFAULT false,
    "total_followers" INTEGER NOT NULL DEFAULT 0,
    "total_views" INTEGER NOT NULL DEFAULT 0,
    "total_earned_credits" BIGINT NOT NULL DEFAULT 0,
    "default_min_tip" INTEGER NOT NULL DEFAULT 0,
    "subscription_tier1_price" INTEGER NOT NULL DEFAULT 200,
    "subscription_tier2_price" INTEGER NOT NULL DEFAULT 500,
    "subscription_tier3_price" INTEGER NOT NULL DEFAULT 1500,
    "custom_rules" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "creator_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "creator_verifications" (
    "id" TEXT NOT NULL,
    "creator_profile_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "legal_first_name" TEXT NOT NULL,
    "legal_last_name" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "id_type" "GovIdType" NOT NULL,
    "id_number_encrypted" TEXT NOT NULL,
    "id_document_front_url" TEXT NOT NULL,
    "id_document_back_url" TEXT,
    "selfie_with_id_url" TEXT NOT NULL,
    "secondary_custodian_name" TEXT DEFAULT 'Platform Legal Records Custodian',
    "secondary_custodian_address" TEXT DEFAULT '100 Compliance Way, Suite 400, Wilmington, DE',
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "verified_by_admin_id" TEXT,
    "verified_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "compliance_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "creator_verifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "age_assurance_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "verification_token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ip_hash" TEXT,
    "country_code" TEXT NOT NULL DEFAULT 'US',
    CONSTRAINT "age_assurance_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "follows" (
    "id" TEXT NOT NULL,
    "follower_id" TEXT NOT NULL,
    "creator_profile_id" TEXT NOT NULL,
    "notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "notification_tier" "FollowNotifyTier" NOT NULL DEFAULT 'ALL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "livestreams" (
    "id" TEXT NOT NULL,
    "creator_profile_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Entertainment',
    "tags" TEXT NOT NULL DEFAULT 'live,interactive',
    "stream_mode" "StreamMode" NOT NULL DEFAULT 'PUBLIC_BROADCAST',
    "status" "StreamStatus" NOT NULL DEFAULT 'SCHEDULED',
    "ticket_price_credits" INTEGER NOT NULL DEFAULT 0,
    "media_room_id" TEXT,
    "media_session_id" TEXT,
    "rtmp_ingest_url" TEXT,
    "whip_ingest_url" TEXT,
    "hls_playback_url" TEXT,
    "whep_playback_url" TEXT,
    "recording_url" TEXT,
    "current_viewer_count" INTEGER NOT NULL DEFAULT 0,
    "peak_viewer_count" INTEGER NOT NULL DEFAULT 0,
    "total_unique_viewers" INTEGER NOT NULL DEFAULT 0,
    "total_credits_earned" INTEGER NOT NULL DEFAULT 0,
    "scheduled_start_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "livestreams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "livestream_participants" (
    "id" TEXT NOT NULL,
    "livestream_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_in_stream" "ParticipantStreamRole" NOT NULL DEFAULT 'VIEWER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "watch_duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "credits_spent" INTEGER NOT NULL DEFAULT 0,
    "chat_messages_count" INTEGER NOT NULL DEFAULT 0,
    "is_muted" BOOLEAN NOT NULL DEFAULT false,
    "is_banned_from_room" BOOLEAN NOT NULL DEFAULT false,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "livestream_participants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "seats" (
    "id" TEXT NOT NULL,
    "livestream_id" TEXT NOT NULL,
    "seat_index" INTEGER NOT NULL,
    "seat_tier" "SeatTier" NOT NULL DEFAULT 'VIP_FRONT_ROW',
    "current_user_id" TEXT,
    "price_per_minute_credits" INTEGER NOT NULL DEFAULT 0,
    "minimum_bid_credits" INTEGER NOT NULL DEFAULT 0,
    "is_occupied" BOOLEAN NOT NULL DEFAULT false,
    "occupied_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "seats_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "fan_id" TEXT NOT NULL,
    "creator_profile_id" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'VIP',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "credit_price_monthly" INTEGER NOT NULL DEFAULT 200,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "canceled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "creator_profile_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "product_type" "ProductType" NOT NULL,
    "price_credits" INTEGER NOT NULL,
    "price_fiat_cents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "inventory_count" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "thumbnail_url" TEXT,
    "media_urls" TEXT NOT NULL DEFAULT '[]',
    "metadata_json" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contents" (
    "id" TEXT NOT NULL,
    "creator_profile_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content_type" "ContentType" NOT NULL DEFAULT 'VIDEO',
    "access_level" "ContentAccessLevel" NOT NULL DEFAULT 'PPV_PURCHASE',
    "price_credits" INTEGER NOT NULL DEFAULT 0,
    "preview_url" TEXT,
    "media_url" TEXT NOT NULL,
    "media_duration_seconds" INTEGER,
    "file_size_bytes" BIGINT,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "purchase_count" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "content_purchases" (
    "id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "fan_id" TEXT NOT NULL,
    "price_credits_paid" INTEGER NOT NULL,
    "platform_fee_credits" INTEGER NOT NULL,
    "creator_net_credits" INTEGER NOT NULL,
    "wallet_transaction_id" TEXT,
    "access_granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "content_purchases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "conversation_type" "ConversationType" NOT NULL DEFAULT 'DIRECT_DM',
    "title" TEXT,
    "creator_profile_id" TEXT,
    "initiator_user_id" TEXT NOT NULL,
    "recipient_user_id" TEXT,
    "last_message_id" TEXT,
    "last_message_preview" TEXT,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "recipient_id" TEXT,
    "message_type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "body" TEXT,
    "media_url" TEXT,
    "is_ppv_locked" BOOLEAN NOT NULL DEFAULT false,
    "ppv_price_credits" INTEGER DEFAULT 0,
    "is_ppv_unlocked" BOOLEAN NOT NULL DEFAULT false,
    "tip_credits" INTEGER DEFAULT 0,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CREDITS',
    "balance" INTEGER NOT NULL DEFAULT 0,
    "locked_balance" INTEGER NOT NULL DEFAULT 0,
    "pending_balance" INTEGER NOT NULL DEFAULT 0,
    "lifetime_deposited_credits" BIGINT NOT NULL DEFAULT 0,
    "lifetime_earned_credits" BIGINT NOT NULL DEFAULT 0,
    "lifetime_spent_credits" BIGINT NOT NULL DEFAULT 0,
    "lifetime_withdrawn_credits" BIGINT NOT NULL DEFAULT 0,
    "status" "WalletStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "source_wallet_id" TEXT,
    "destination_wallet_id" TEXT,
    "transaction_type" "WalletTransactionType" NOT NULL,
    "direction" "TransactionDirection" NOT NULL DEFAULT 'TRANSFER',
    "amount_credits" INTEGER NOT NULL,
    "platform_fee_credits" INTEGER NOT NULL DEFAULT 0,
    "creator_net_credits" INTEGER NOT NULL DEFAULT 0,
    "source_balance_before" INTEGER,
    "source_balance_after" INTEGER,
    "dest_balance_before" INTEGER,
    "dest_balance_after" INTEGER,
    "idempotency_key" TEXT NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "status" "WalletTransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "note" TEXT,
    "metadata_json" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "payment_gateway" "PaymentGateway" NOT NULL,
    "gateway_transaction_id" TEXT,
    "gateway_event_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "amount_fiat_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "credits_purchased" INTEGER NOT NULL,
    "bonus_credits" INTEGER NOT NULL DEFAULT 0,
    "gateway_fee_cents" INTEGER NOT NULL DEFAULT 0,
    "payment_method" TEXT,
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'INITIALIZED',
    "risk_score" INTEGER,
    "ip_address" TEXT,
    "country_code" TEXT,
    "raw_gateway_payload" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "creator_earnings" (
    "id" TEXT NOT NULL,
    "creator_profile_id" TEXT NOT NULL,
    "wallet_transaction_id" TEXT,
    "earning_source" "EarningSourceType" NOT NULL,
    "source_reference_id" TEXT,
    "gross_credits" INTEGER NOT NULL,
    "platform_rake_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0.20,
    "platform_fee_credits" INTEGER NOT NULL,
    "net_creator_credits" INTEGER NOT NULL,
    "fiat_value_estimated_cents" INTEGER NOT NULL,
    "clearance_status" "EarningClearanceStatus" NOT NULL DEFAULT 'CLEARED',
    "clears_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "creator_earnings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "creator_profile_id" TEXT NOT NULL,
    "amount_fiat_cents" INTEGER NOT NULL,
    "credits_deducted" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "payout_method" "PayoutMethod" NOT NULL,
    "payout_beneficiary_info" TEXT NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'REQUESTED',
    "gateway_reference_id" TEXT,
    "failure_reason" TEXT,
    "reviewed_by_admin_id" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "interaction_definitions" (
    "id" TEXT NOT NULL,
    "creator_profile_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "action_type" "InteractionActionType" NOT NULL DEFAULT 'TIP_ALERT',
    "price_credits" INTEGER NOT NULL,
    "duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "intensity_level" INTEGER,
    "toy_command_pattern" TEXT,
    "sound_asset_url" TEXT,
    "icon_url" TEXT,
    "cooldown_seconds" INTEGER NOT NULL DEFAULT 0,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "interaction_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "interaction_purchases" (
    "id" TEXT NOT NULL,
    "livestream_id" TEXT,
    "creator_profile_id" TEXT NOT NULL,
    "fan_id" TEXT NOT NULL,
    "interaction_definition_id" TEXT NOT NULL,
    "price_credits_paid" INTEGER NOT NULL,
    "custom_message" TEXT,
    "toy_intensity" INTEGER,
    "status" "InteractionPurchaseStatus" NOT NULL DEFAULT 'PAID',
    "executed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "interaction_purchases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "interaction_queue_entries" (
    "id" TEXT NOT NULL,
    "livestream_id" TEXT NOT NULL,
    "interaction_purchase_id" TEXT NOT NULL,
    "queue_position" INTEGER NOT NULL,
    "status" "QueueEntryStatus" NOT NULL DEFAULT 'PENDING',
    "scheduled_execution_time" TIMESTAMP(3),
    "started_playing_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "interaction_queue_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "collective_goals" (
    "id" TEXT NOT NULL,
    "livestream_id" TEXT,
    "creator_profile_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "reward_description" TEXT,
    "target_credits" INTEGER NOT NULL,
    "current_credits" INTEGER NOT NULL DEFAULT 0,
    "contributor_count" INTEGER NOT NULL DEFAULT 0,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3),
    "reached_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "collective_goals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "goal_contributions" (
    "id" TEXT NOT NULL,
    "collective_goal_id" TEXT NOT NULL,
    "livestream_id" TEXT,
    "fan_id" TEXT NOT NULL,
    "amount_credits" INTEGER NOT NULL,
    "message" TEXT,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "goal_contributions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "creator_relationships" (
    "id" TEXT NOT NULL,
    "fan_id" TEXT NOT NULL,
    "creator_profile_id" TEXT NOT NULL,
    "relationship_tier" "RelationshipTier" NOT NULL DEFAULT 'STRANGER',
    "current_level" INTEGER NOT NULL DEFAULT 1,
    "total_xp" BIGINT NOT NULL DEFAULT 0,
    "total_credits_spent" BIGINT NOT NULL DEFAULT 0,
    "total_minutes_watched" INTEGER NOT NULL DEFAULT 0,
    "current_streak_days" INTEGER NOT NULL DEFAULT 0,
    "longest_streak_days" INTEGER NOT NULL DEFAULT 0,
    "last_interacted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "custom_nickname" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "creator_relationships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "relationship_xp_events" (
    "id" TEXT NOT NULL,
    "creator_relationship_id" TEXT NOT NULL,
    "fan_id" TEXT NOT NULL,
    "creator_profile_id" TEXT NOT NULL,
    "event_type" "RelationshipXPType" NOT NULL,
    "xp_awarded" INTEGER NOT NULL,
    "credits_multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "metadata_json" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "relationship_xp_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_xp_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_type" "PlatformXPType" NOT NULL,
    "xp_awarded" INTEGER NOT NULL,
    "user_level_after" INTEGER NOT NULL,
    "metadata_json" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_xp_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "AchievementCategory" NOT NULL DEFAULT 'FAN_LOYALTY',
    "badge_icon_url" TEXT NOT NULL,
    "badge_tier" "BadgeTier" NOT NULL DEFAULT 'BRONZE',
    "xp_reward" INTEGER NOT NULL DEFAULT 100,
    "credit_bonus_reward" INTEGER NOT NULL DEFAULT 0,
    "requirement_threshold" INTEGER NOT NULL DEFAULT 1,
    "requirement_metric" TEXT NOT NULL DEFAULT 'TOTAL_CREDITS_SPENT',
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_achievements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "current_progress" INTEGER NOT NULL DEFAULT 0,
    "is_unlocked" BOOLEAN NOT NULL DEFAULT false,
    "unlocked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leaderboard_records" (
    "id" TEXT NOT NULL,
    "scope" "LeaderboardScope" NOT NULL,
    "timeframe" "LeaderboardTimeframe" NOT NULL,
    "period_key" TEXT NOT NULL,
    "creator_profile_id" TEXT,
    "livestream_id" TEXT,
    "user_id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "total_credits_contributed" BIGINT NOT NULL DEFAULT 0,
    "total_xp_earned" BIGINT NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "leaderboard_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "private_session_availabilities" (
    "id" TEXT NOT NULL,
    "creator_profile_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time_utc" TEXT NOT NULL,
    "end_time_utc" TEXT NOT NULL,
    "min_duration_minutes" INTEGER NOT NULL DEFAULT 10,
    "max_duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "credit_rate_per_minute" INTEGER NOT NULL DEFAULT 100,
    "buffer_time_minutes" INTEGER NOT NULL DEFAULT 5,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "private_session_availabilities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "creator_profile_id" TEXT NOT NULL,
    "fan_id" TEXT NOT NULL,
    "scheduled_start_time" TIMESTAMP(3) NOT NULL,
    "scheduled_end_time" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "credit_rate_per_minute" INTEGER NOT NULL,
    "total_credits_escrowed" INTEGER NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING_CREATOR_ACCEPT',
    "meeting_room_id" TEXT,
    "fan_notes" TEXT,
    "creator_notes" TEXT,
    "actual_started_at" TIMESTAMP(3),
    "actual_ended_at" TIMESTAMP(3),
    "actual_duration_seconds" INTEGER,
    "wallet_transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "reported_user_id" TEXT,
    "reported_creator_profile_id" TEXT,
    "reported_content_id" TEXT,
    "reported_livestream_id" TEXT,
    "reported_message_id" TEXT,
    "category" "ReportCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "evidence_urls" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "assigned_moderator_id" TEXT,
    "moderator_notes" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "moderation_cases" (
    "id" TEXT NOT NULL,
    "case_number" TEXT NOT NULL,
    "source_report_id" TEXT,
    "target_user_id" TEXT NOT NULL,
    "assigned_moderator_id" TEXT,
    "priority" "ModerationPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "ModerationCaseStatus" NOT NULL DEFAULT 'OPEN',
    "action_taken" "ModerationActionType" NOT NULL DEFAULT 'NONE',
    "action_duration_hours" INTEGER,
    "summary_findings" TEXT,
    "internal_notes" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "moderation_cases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "target_entity_type" TEXT NOT NULL,
    "target_entity_id" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "old_values" TEXT,
    "new_values" TEXT,
    "metadata_json" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "sender_user_id" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "action_url" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "metadata_json" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "game_sessions" (
    "id" TEXT NOT NULL,
    "livestream_id" TEXT,
    "creator_profile_id" TEXT NOT NULL,
    "game_type" "GameType" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "GameSessionStatus" NOT NULL DEFAULT 'LOBBY_WAITING',
    "entry_cost_credits" INTEGER NOT NULL DEFAULT 0,
    "total_prize_pool_credits" INTEGER NOT NULL DEFAULT 0,
    "winning_user_id" TEXT,
    "game_state_json" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "game_rewards" (
    "id" TEXT NOT NULL,
    "game_session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reward_type" "GameRewardType" NOT NULL,
    "reward_value_credits" INTEGER NOT NULL DEFAULT 0,
    "is_claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimed_at" TIMESTAMP(3),
    "claim_metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "game_rewards_pkey" PRIMARY KEY ("id")
);

-- Unique Constraints
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "creator_profiles_user_id_key" ON "creator_profiles"("user_id");
CREATE UNIQUE INDEX "creator_profiles_stream_key_key" ON "creator_profiles"("stream_key");
CREATE UNIQUE INDEX "age_assurance_records_verification_token_key" ON "age_assurance_records"("verification_token");
CREATE UNIQUE INDEX "follows_follower_id_creator_profile_id_key" ON "follows"("follower_id", "creator_profile_id");
CREATE UNIQUE INDEX "seats_livestream_id_seat_index_key" ON "seats"("livestream_id", "seat_index");
CREATE UNIQUE INDEX "subscriptions_fan_id_creator_profile_id_key" ON "subscriptions"("fan_id", "creator_profile_id");
CREATE UNIQUE INDEX "content_purchases_content_id_fan_id_key" ON "content_purchases"("content_id", "fan_id");
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");
CREATE UNIQUE INDEX "wallet_transactions_idempotency_key_key" ON "wallet_transactions"("idempotency_key");
CREATE UNIQUE INDEX "payment_transactions_idempotency_key_key" ON "payment_transactions"("idempotency_key");
CREATE UNIQUE INDEX "interaction_queue_entries_interaction_purchase_id_key" ON "interaction_queue_entries"("interaction_purchase_id");
CREATE UNIQUE INDEX "creator_relationships_fan_id_creator_profile_id_key" ON "creator_relationships"("fan_id", "creator_profile_id");
CREATE UNIQUE INDEX "achievements_code_key" ON "achievements"("code");
CREATE UNIQUE INDEX "user_achievements_user_id_achievement_id_key" ON "user_achievements"("user_id", "achievement_id");
CREATE UNIQUE INDEX "leaderboard_records_scope_timeframe_period_key_creator_pro_key" ON "leaderboard_records"("scope", "timeframe", "period_key", "creator_profile_id", "livestream_id", "user_id");
CREATE UNIQUE INDEX "moderation_cases_case_number_key" ON "moderation_cases"("case_number");

-- Foreign Keys
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "creator_verifications" ADD CONSTRAINT "creator_verifications_creator_profile_id_fkey" FOREIGN KEY ("creator_profile_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "creator_verifications" ADD CONSTRAINT "creator_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "creator_verifications" ADD CONSTRAINT "creator_verifications_verified_by_admin_id_fkey" FOREIGN KEY ("verified_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "age_assurance_records" ADD CONSTRAINT "age_assurance_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "follows" ADD CONSTRAINT "follows_creator_profile_id_fkey" FOREIGN KEY ("creator_profile_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "livestreams" ADD CONSTRAINT "livestreams_creator_profile_id_fkey" FOREIGN KEY ("creator_profile_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "livestream_participants" ADD CONSTRAINT "livestream_participants_livestream_id_fkey" FOREIGN KEY ("livestream_id") REFERENCES "livestreams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "livestream_participants" ADD CONSTRAINT "livestream_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seats" ADD CONSTRAINT "seats_livestream_id_fkey" FOREIGN KEY ("livestream_id") REFERENCES "livestreams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seats" ADD CONSTRAINT "seats_current_user_id_fkey" FOREIGN KEY ("current_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_fan_id_fkey" FOREIGN KEY ("fan_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_creator_profile_id_fkey" FOREIGN KEY ("creator_profile_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_creator_profile_id_fkey" FOREIGN KEY ("creator_profile_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contents" ADD CONSTRAINT "contents_creator_profile_id_fkey" FOREIGN KEY ("creator_profile_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_purchases" ADD CONSTRAINT "content_purchases_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_purchases" ADD CONSTRAINT "content_purchases_fan_id_fkey" FOREIGN KEY ("fan_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_purchases" ADD CONSTRAINT "content_purchases_wallet_transaction_id_fkey" FOREIGN KEY ("wallet_transaction_id") REFERENCES "wallet_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_creator_profile_id_fkey" FOREIGN KEY ("creator_profile_id") REFERENCES "creator_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_initiator_user_id_fkey" FOREIGN KEY ("initiator_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_source_wallet_id_fkey" FOREIGN KEY ("source_wallet_id") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_destination_wallet_id_fkey" FOREIGN KEY ("destination_wallet_id") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "creator_earnings" ADD CONSTRAINT "creator_earnings_creator_profile_id_fkey" FOREIGN KEY ("creator_profile_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "creator_earnings" ADD CONSTRAINT "creator_earnings_wallet_transaction_id_fkey" FOREIGN KEY ("wallet_transaction_id") REFERENCES "wallet_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_creator_profile_id_fkey" FOREIGN KEY ("creator_profile_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_reviewed_by_admin_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "interaction_definitions" ADD CONSTRAINT "interaction_definitions_creator_profile_id_fkey" FOREIGN KEY ("creator_profile_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interaction_purchases" ADD CONSTRAINT "interaction_purchases_livestream_id_fkey" FOREIGN KEY ("livestream_id") REFERENCES "livestreams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "interaction_purchases" ADD CONSTRAINT "interaction_purchases_creator_profile_id_fkey" FOREIGN KEY ("creator_profile_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interaction_purchases" ADD CONSTRAINT "interaction_purchases_fan_id_fkey" FOREIGN KEY ("fan_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interaction_purchases" ADD CONSTRAINT "interaction_purchases_interaction_definition_id_fkey" FOREIGN KEY ("interaction_definition_id") REFERENCES "interaction_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interaction_queue_entries" ADD CONSTRAINT "interaction_queue_entries_livestream_id_fkey" FOREIGN KEY ("livestream_id") REFERENCES "livestreams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interaction_queue_entries" ADD CONSTRAINT "interaction_queue_entries_interaction_purchase_id_fkey" FOREIGN KEY ("interaction_purchase_id") REFERENCES "interaction_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collective_goals" ADD CONSTRAINT "collective_goals_livestream_id_fkey" FOREIGN KEY ("livestream_id") REFERENCES "livestreams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "collective_goals" ADD CONSTRAINT "collective_goals_creator_profile_id_fkey" FOREIGN KEY ("creator_profile_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_collective_goal_id_fkey" FOREIGN KEY ("collective_goal_id") REFERENCES "collective_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_livestream_id_fkey" FOREIGN KEY ("livestream_id") REFERENCES "livestreams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_fan_id_fkey" FOREIGN KEY ("fan_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "creator_relationships" ADD CONSTRAINT "creator_relationships_fan_id_fkey" FOREIGN KEY ("fan_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "creator_relationships" ADD CONSTRAINT "creator_relationships_creator_profile_id_fkey" FOREIGN KEY ("creator_profile_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "relationship_xp_events" ADD CONSTRAINT "relationship_xp_events_creator_relationship_id_fkey" FOREIGN KEY ("creator_relationship_id") REFERENCES "creator_relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "relationship_xp_events" ADD CONSTRAINT "relationship_xp_events_fan_id_fkey" FOREIGN KEY ("fan_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "relationship_xp_events" ADD CONSTRAINT "relationship_xp_events_creator_profile_id_fkey" FOREIGN KEY ("creator_profile_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_xp_events" ADD CONSTRAINT "platform_xp_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leaderboard_records" ADD CONSTRAINT "leaderboard_records_creator_profile_id_fkey" FOREIGN KEY ("creator_profile_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leaderboard_records" ADD CONSTRAINT "leaderboard_records_livestream_id_fkey" FOREIGN KEY ("livestream_id") REFERENCES "livestreams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leaderboard_records" ADD CONSTRAINT "leaderboard_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "private_session_availabilities" ADD CONSTRAINT "private_session_availabilities_creator_profile_id_fkey" FOREIGN KEY ("creator_profile_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_creator_profile_id_fkey" FOREIGN KEY ("creator_profile_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_fan_id_fkey" FOREIGN KEY ("fan_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_wallet_transaction_id_fkey" FOREIGN KEY ("wallet_transaction_id") REFERENCES "wallet_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_creator_profile_id_fkey" FOREIGN KEY ("reported_creator_profile_id") REFERENCES "creator_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_content_id_fkey" FOREIGN KEY ("reported_content_id") REFERENCES "contents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_livestream_id_fkey" FOREIGN KEY ("reported_livestream_id") REFERENCES "livestreams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_message_id_fkey" FOREIGN KEY ("reported_message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_assigned_moderator_id_fkey" FOREIGN KEY ("assigned_moderator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "moderation_cases" ADD CONSTRAINT "moderation_cases_source_report_id_fkey" FOREIGN KEY ("source_report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "moderation_cases" ADD CONSTRAINT "moderation_cases_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "moderation_cases" ADD CONSTRAINT "moderation_cases_assigned_moderator_id_fkey" FOREIGN KEY ("assigned_moderator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_livestream_id_fkey" FOREIGN KEY ("livestream_id") REFERENCES "livestreams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_creator_profile_id_fkey" FOREIGN KEY ("creator_profile_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_winning_user_id_fkey" FOREIGN KEY ("winning_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "game_rewards" ADD CONSTRAINT "game_rewards_game_session_id_fkey" FOREIGN KEY ("game_session_id") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "game_rewards" ADD CONSTRAINT "game_rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
