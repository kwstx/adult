-- ============================================================================
-- AUTHORITATIVE POSTGRESQL DATABASE SCHEMA (DDL)
-- Production-Grade Relational Schema for Creator Streaming, Economy & Safety Platform
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS & SCHEMA CONFIGURATION
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ----------------------------------------------------------------------------
-- 2. DOMAIN ENUMS
-- ----------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM (
    'FAN',
    'CREATOR',
    'MODERATOR',
    'ADMIN',
    'AUDITOR'
);

CREATE TYPE kyc_status AS ENUM (
    'UNVERIFIED',
    'PENDING',
    'AGE_VERIFIED',
    'COMPLIANCE_2257_APPROVED',
    'REJECTED',
    'SUSPENDED'
);

CREATE TYPE gov_id_type AS ENUM (
    'PASSPORT',
    'DRIVERS_LICENSE',
    'NATIONAL_ID',
    'RESIDENCE_PERMIT'
);

CREATE TYPE verification_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'EXPIRED',
    'REVOKED'
);

CREATE TYPE follow_notify_tier AS ENUM (
    'ALL',
    'LIVE_ONLY',
    'NONE'
);

CREATE TYPE stream_mode AS ENUM (
    'PUBLIC_BROADCAST',
    'SUBSCRIBERS_ONLY',
    'TICKETED_PPV',
    'PRIVATE_1ON1',
    'VIP_GROUP'
);

CREATE TYPE stream_status AS ENUM (
    'SCHEDULED',
    'PREPARING',
    'LIVE',
    'PAUSED',
    'ENDED',
    'TERMINATED_SAFETY'
);

CREATE TYPE participant_stream_role AS ENUM (
    'VIEWER',
    'SUBSCRIBER',
    'VIP',
    'MODERATOR',
    'CO_HOST',
    'GUEST'
);

CREATE TYPE subscription_tier AS ENUM (
    'BASIC',
    'VIP',
    'DIAMOND',
    'CUSTOM'
);

CREATE TYPE subscription_status AS ENUM (
    'ACTIVE',
    'PAST_DUE',
    'CANCELED',
    'EXPIRED',
    'PAUSED'
);

CREATE TYPE product_type AS ENUM (
    'DIGITAL_DOWNLOAD',
    'PHYSICAL_MERCH',
    'CUSTOM_SERVICE',
    'SHOUTOUT',
    'VIP_PASS',
    'TOY_CONTROL_PASS'
);

CREATE TYPE content_type AS ENUM (
    'PHOTO',
    'VIDEO',
    'AUDIO',
    'ALBUM',
    'POST',
    'BUNDLE'
);

CREATE TYPE content_access_level AS ENUM (
    'PUBLIC',
    'FOLLOWERS_ONLY',
    'SUBSCRIBERS_ONLY',
    'PPV_PURCHASE',
    'TIER_VIP_ONLY'
);

CREATE TYPE conversation_type AS ENUM (
    'DIRECT_DM',
    'CREATOR_FAN_DM',
    'GROUP_CHAT',
    'SUPPORT_TICKET'
);

CREATE TYPE message_type AS ENUM (
    'TEXT',
    'IMAGE',
    'VIDEO',
    'AUDIO',
    'TIP_ATTACHED',
    'PPV_LOCKED_MEDIA',
    'SYSTEM_NOTICE'
);

CREATE TYPE credit_type AS ENUM (
    'PURCHASED',
    'PROMOTIONAL',
    'BONUS'
);

CREATE TYPE credit_lot_status AS ENUM (
    'ACTIVE',
    'DEPLETED',
    'EXPIRED',
    'REVOKED'
);

CREATE TYPE wallet_status AS ENUM (
    'ACTIVE',
    'FROZEN_SECURITY',
    'SUSPENDED_CHARGEBACK'
);

CREATE TYPE wallet_transaction_type AS ENUM (
    'DEPOSIT',
    'WITHDRAWAL',
    'LIVE_TIP',
    'PPV_PURCHASE',
    'SUBSCRIPTION_PAYMENT',
    'PRODUCT_PURCHASE',
    'INTERACTION_FEE',
    'PRIVATE_BOOKING',
    'GOAL_CONTRIBUTION',
    'GAME_ENTRY_FEE',
    'GAME_JACKPOT_WIN',
    'PLATFORM_FEE_RAKE',
    'REFUND',
    'CHARGEBACK_REVERSAL',
    'ADMIN_ADJUSTMENT',
    'PROMOTIONAL_GRANT',
    'BONUS_GRANT',
    'CREDIT_EXPIRATION'
);

CREATE TYPE transaction_direction AS ENUM (
    'DEBIT',
    'CREDIT',
    'TRANSFER'
);

CREATE TYPE wallet_transaction_status AS ENUM (
    'PENDING',
    'COMPLETED',
    'FAILED',
    'REVERSED'
);

CREATE TYPE payment_gateway AS ENUM (
    'CCBILL',
    'SEGPAY',
    'EPOCH',
    'STRIPE',
    'NOWPAYMENTS',
    'COINBASE_COMMERCE',
    'MANUAL_BANK'
);

CREATE TYPE payment_transaction_status AS ENUM (
    'INITIALIZED',
    'PENDING_WEBHOOK',
    'SUCCEEDED',
    'FAILED',
    'DISPUTED_CHARGEBACK',
    'REFUNDED'
);

CREATE TYPE earning_source_type AS ENUM (
    'LIVE_TIP',
    'SUBSCRIPTION',
    'PPV_CONTENT',
    'PRIVATE_SESSION',
    'PRODUCT_SALE',
    'INTERACTION',
    'GOAL_REWARD',
    'GAME_REWARD',
    'PLATFORM_BONUS'
);

CREATE TYPE earning_clearance_status AS ENUM (
    'PENDING_HOLD',
    'CLEARED',
    'PAID_OUT',
    'REVERSED_FRAUD'
);

CREATE TYPE payout_method AS ENUM (
    'SEPA_BANK',
    'ACH_DIRECT',
    'MASS_PAY',
    'PAXUM',
    'COSMO_PAY',
    'CRYPTO_USDT',
    'WIRE'
);

CREATE TYPE payout_status AS ENUM (
    'REQUESTED',
    'UNDER_COMPLIANCE_REVIEW',
    'PROCESSING',
    'COMPLETED',
    'REJECTED',
    'FAILED'
);

CREATE TYPE interaction_action_type AS ENUM (
    'TIP_ALERT',
    'SOUND_EFFECT',
    'VIBRATION_TOY',
    'WHEEL_SPIN',
    'DANCE_REQUEST',
    'COSTUME_CHANGE',
    'CHAT_PIN',
    'POLL_VOTE',
    'CUSTOM_ACTION'
);

CREATE TYPE interaction_purchase_status AS ENUM (
    'PAID',
    'QUEUED',
    'EXECUTING',
    'COMPLETED',
    'REJECTED',
    'REFUNDED'
);

CREATE TYPE queue_entry_status AS ENUM (
    'PENDING',
    'CURRENTLY_PLAYING',
    'COMPLETED',
    'SKIPPED',
    'CANCELLED'
);

CREATE TYPE goal_status AS ENUM (
    'ACTIVE',
    'REACHED',
    'EXPIRED',
    'CANCELLED'
);

CREATE TYPE relationship_tier AS ENUM (
    'STRANGER',
    'SUPPORTER',
    'SUPERFAN',
    'VIP_DEVOTEE',
    'SOULMATE',
    'ROYAL_PATRON'
);

CREATE TYPE relationship_xp_type AS ENUM (
    'LIVE_TIP',
    'CHAT_MESSAGE',
    'STREAM_WATCH_TIME',
    'PPV_PURCHASE',
    'SUBSCRIPTION_RENEWAL',
    'GOAL_CONTRIBUTION',
    'GAME_PARTICIPATION'
);

CREATE TYPE platform_xp_type AS ENUM (
    'DAILY_LOGIN',
    'FIRST_DEPOSIT',
    'WATCH_STREAM',
    'UNLOCK_ACHIEVEMENT',
    'WRITE_REVIEW',
    'COMMUNITY_QUEST',
    'LEVEL_UP_BONUS'
);

CREATE TYPE achievement_category AS ENUM (
    'FAN_LOYALTY',
    'SPENDING',
    'WATCH_TIME',
    'SOCIAL',
    'GAMING',
    'CREATOR_MILESTONE'
);

CREATE TYPE badge_tier AS ENUM (
    'BRONZE',
    'SILVER',
    'GOLD',
    'PLATINUM',
    'DIAMOND',
    'MYTHIC'
);

CREATE TYPE seat_tier AS ENUM (
    'VIP_FRONT_ROW',
    'VIP_BOX',
    'CO_HOST_STAGE',
    'GUEST_CAMERA',
    'MODERATOR_CHAIR'
);

CREATE TYPE leaderboard_scope AS ENUM (
    'GLOBAL_PLATFORM',
    'CREATOR_ROOM',
    'LIVESTREAM_SESSION'
);

CREATE TYPE leaderboard_timeframe AS ENUM (
    'ALL_TIME',
    'MONTHLY',
    'WEEKLY',
    'DAILY',
    'STREAM_SESSION'
);

CREATE TYPE booking_status AS ENUM (
    'PENDING_CREATOR_ACCEPT',
    'ACCEPTED',
    'REJECTED',
    'CANCELLED_BY_FAN',
    'CANCELLED_BY_CREATOR',
    'IN_PROGRESS',
    'COMPLETED',
    'NO_SHOW'
);

CREATE TYPE report_category AS ENUM (
    'UNDERAGE_SUSPICION',
    'NON_CONSENSUAL_CONTENT',
    'HARASSMENT_ABUSE',
    'VIOLENCE_THREATS',
    'COPYRIGHT_INFRINGEMENT',
    'FINANCIAL_FRAUD',
    'SPAM_SCAM',
    'TOY_SAFETY_VIOLATION',
    'OTHER'
);

CREATE TYPE report_status AS ENUM (
    'OPEN',
    'ASSIGNED_TO_MODERATOR',
    'UNDER_REVIEW',
    'ACTION_TAKEN',
    'RESOLVED_DISMISSED',
    'ESCALATED_LEGAL'
);

CREATE TYPE moderation_priority AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL_URGENT_UNDERAGE'
);

CREATE TYPE moderation_case_status AS ENUM (
    'OPEN',
    'INVESTIGATING',
    'AWAITING_ID_REAUTH',
    'ESCALATED_LEGAL',
    'CLOSED_RESOLVED'
);

CREATE TYPE moderation_action_type AS ENUM (
    'NONE',
    'WARNING_MESSAGE',
    'SHADOWBAN',
    'TEMPORARY_SUSPENSION',
    'PERMANENT_BAN',
    'COMPLIANCE_2257_REVOCATION',
    'NCMEC_LEGAL_ESCALATION'
);

CREATE TYPE notification_type AS ENUM (
    'CREATOR_WENT_LIVE',
    'TIP_RECEIVED',
    'NEW_SUBSCRIBER',
    'SUB_RENEWAL',
    'INTERACTION_QUEUED',
    'INTERACTION_EXECUTED',
    'GOAL_REACHED',
    'PRIVATE_BOOKING_REQUEST',
    'PRIVATE_BOOKING_CONFIRMED',
    'MODERATION_WARNING',
    'SYSTEM_ANNOUNCEMENT',
    'ACHIEVEMENT_UNLOCKED'
);

CREATE TYPE game_type AS ENUM (
    'SPIN_THE_WHEEL',
    'TRIVIA_ARENA',
    'MYSTERY_BOX',
    'PLINKO_DROP',
    'DUEL_CHALLENGE'
);

CREATE TYPE game_session_status AS ENUM (
    'LOBBY_WAITING',
    'ACTIVE_IN_PROGRESS',
    'CALCULATING_RESULTS',
    'COMPLETED',
    'CANCELLED'
);

CREATE TYPE game_reward_type AS ENUM (
    'CREDITS_JACKPOT',
    'PPV_CONTENT_FREE',
    'VIP_BADGE_PASS',
    'FREE_SUB_MONTH',
    'EXCLUSIVE_SHOUTOUT',
    'PHYSICAL_GIFT',
    'XP_BOOST'
);

-- ----------------------------------------------------------------------------
-- 3. HELPER FUNCTIONS & AUTOMATIC TIMESTAMP TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- TABLE 1: users
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(64) NOT NULL UNIQUE,
    display_name VARCHAR(128) NOT NULL,
    avatar_url TEXT,
    banner_url TEXT,
    bio TEXT,
    role user_role NOT NULL DEFAULT 'FAN',
    kyc_status kyc_status NOT NULL DEFAULT 'UNVERIFIED',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_banned BOOLEAN NOT NULL DEFAULT FALSE,
    ban_reason TEXT,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_kyc ON users(kyc_status);
CREATE INDEX idx_users_banned ON users(is_banned);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE 2: creator_profiles
-- ----------------------------------------------------------------------------
CREATE TABLE creator_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    stage_name VARCHAR(128),
    bio TEXT,
    banner_url TEXT,
    category VARCHAR(64),
    tags TEXT NOT NULL DEFAULT 'interactive,live',
    stream_key VARCHAR(128) NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
    ingest_url TEXT NOT NULL DEFAULT 'rtmp://live.platform.local/app',
    playback_hls_url TEXT,
    playback_whep_url TEXT,
    is_live BOOLEAN NOT NULL DEFAULT FALSE,
    total_followers INT NOT NULL DEFAULT 0 CHECK (total_followers >= 0),
    total_views INT NOT NULL DEFAULT 0 CHECK (total_views >= 0),
    total_earned_credits BIGINT NOT NULL DEFAULT 0 CHECK (total_earned_credits >= 0),
    default_min_tip INT NOT NULL DEFAULT 0 CHECK (default_min_tip >= 0),
    subscription_tier1_price INT NOT NULL DEFAULT 200 CHECK (subscription_tier1_price >= 0),
    subscription_tier2_price INT NOT NULL DEFAULT 500 CHECK (subscription_tier2_price >= 0),
    subscription_tier3_price INT NOT NULL DEFAULT 1500 CHECK (subscription_tier3_price >= 0),
    custom_rules TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_creator_profiles_is_live ON creator_profiles(is_live);
CREATE INDEX idx_creator_profiles_category ON creator_profiles(category);
CREATE INDEX idx_creator_profiles_followers ON creator_profiles(total_followers DESC);

CREATE TRIGGER trg_creator_profiles_updated_at
BEFORE UPDATE ON creator_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE 3: creator_verifications (18 U.S.C. 2257 Recordkeeping & Compliance)
-- ----------------------------------------------------------------------------
CREATE TABLE creator_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_profile_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    legal_first_name VARCHAR(128) NOT NULL,
    legal_last_name VARCHAR(128) NOT NULL,
    date_of_birth DATE NOT NULL,
    id_type gov_id_type NOT NULL,
    id_number_encrypted TEXT NOT NULL,
    id_document_front_url TEXT NOT NULL,
    id_document_back_url TEXT,
    selfie_with_id_url TEXT NOT NULL,
    secondary_custodian_name VARCHAR(255) DEFAULT 'Platform Legal Records Custodian',
    secondary_custodian_address TEXT DEFAULT '100 Compliance Way, Suite 400, Wilmington, DE',
    verification_status verification_status NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    verified_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    compliance_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_creator_verif_profile ON creator_verifications(creator_profile_id);
CREATE INDEX idx_creator_verif_user ON creator_verifications(user_id);
CREATE INDEX idx_creator_verif_status ON creator_verifications(verification_status);

CREATE TRIGGER trg_creator_verifications_updated_at
BEFORE UPDATE ON creator_verifications
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE: age_assurance_records (Age Gate & Verification Audit)
-- ----------------------------------------------------------------------------
CREATE TABLE age_assurance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method VARCHAR(64) NOT NULL,
    verification_token VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'APPROVED',
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    ip_hash VARCHAR(128),
    country_code VARCHAR(8) NOT NULL DEFAULT 'US'
);

CREATE INDEX idx_age_assurance_user ON age_assurance_records(user_id);

-- ----------------------------------------------------------------------------
-- TABLE 4: follows
-- ----------------------------------------------------------------------------
CREATE TABLE follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creator_profile_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    notification_tier follow_notify_tier NOT NULL DEFAULT 'ALL',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_follows UNIQUE (follower_id, creator_profile_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_creator ON follows(creator_profile_id);

-- ----------------------------------------------------------------------------
-- TABLE 5: livestreams
-- ----------------------------------------------------------------------------
CREATE TABLE livestreams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_profile_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(64) NOT NULL DEFAULT 'Entertainment',
    tags TEXT NOT NULL DEFAULT 'live,interactive',
    stream_mode stream_mode NOT NULL DEFAULT 'PUBLIC_BROADCAST',
    status stream_status NOT NULL DEFAULT 'SCHEDULED',
    ticket_price_credits INT NOT NULL DEFAULT 0 CHECK (ticket_price_credits >= 0),
    media_room_id VARCHAR(128),
    media_session_id VARCHAR(128),
    rtmp_ingest_url TEXT,
    whip_ingest_url TEXT,
    hls_playback_url TEXT,
    whep_playback_url TEXT,
    recording_url TEXT,
    current_viewer_count INT NOT NULL DEFAULT 0 CHECK (current_viewer_count >= 0),
    peak_viewer_count INT NOT NULL DEFAULT 0 CHECK (peak_viewer_count >= 0),
    total_unique_viewers INT NOT NULL DEFAULT 0 CHECK (total_unique_viewers >= 0),
    total_credits_earned INT NOT NULL DEFAULT 0 CHECK (total_credits_earned >= 0),
    scheduled_start_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_livestreams_creator_status ON livestreams(creator_profile_id, status);
CREATE INDEX idx_livestreams_status_started ON livestreams(status, started_at DESC);

CREATE TRIGGER trg_livestreams_updated_at
BEFORE UPDATE ON livestreams
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE 6: livestream_participants
-- ----------------------------------------------------------------------------
CREATE TABLE livestream_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    livestream_id UUID NOT NULL REFERENCES livestreams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_in_stream participant_stream_role NOT NULL DEFAULT 'VIEWER',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    watch_duration_seconds INT NOT NULL DEFAULT 0 CHECK (watch_duration_seconds >= 0),
    credits_spent INT NOT NULL DEFAULT 0 CHECK (credits_spent >= 0),
    chat_messages_count INT NOT NULL DEFAULT 0 CHECK (chat_messages_count >= 0),
    is_muted BOOLEAN NOT NULL DEFAULT FALSE,
    is_banned_from_room BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stream_participants_lookup ON livestream_participants(livestream_id, user_id);
CREATE INDEX idx_stream_participants_user ON livestream_participants(user_id, joined_at DESC);

CREATE TRIGGER trg_livestream_participants_updated_at
BEFORE UPDATE ON livestream_participants
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE 7: subscriptions
-- ----------------------------------------------------------------------------
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fan_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creator_profile_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
    tier subscription_tier NOT NULL DEFAULT 'VIP',
    status subscription_status NOT NULL DEFAULT 'ACTIVE',
    credit_price_monthly INT NOT NULL DEFAULT 200 CHECK (credit_price_monthly >= 0),
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
    canceled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_creator_sub UNIQUE (fan_id, creator_profile_id)
);

CREATE INDEX idx_subs_fan ON subscriptions(fan_id, status);
CREATE INDEX idx_subs_creator ON subscriptions(creator_profile_id, status);

CREATE TRIGGER trg_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE 8: products
-- ----------------------------------------------------------------------------
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_profile_id UUID REFERENCES creator_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    product_type product_type NOT NULL,
    price_credits INT NOT NULL CHECK (price_credits >= 0),
    price_fiat_cents INT CHECK (price_fiat_cents >= 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    inventory_count INT CHECK (inventory_count IS NULL OR inventory_count >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    thumbnail_url TEXT,
    media_urls TEXT NOT NULL DEFAULT '[]',
    metadata_json TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_creator ON products(creator_profile_id, is_active);
CREATE INDEX idx_products_type ON products(product_type);

CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE 9: contents
-- ----------------------------------------------------------------------------
CREATE TABLE contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_profile_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content_type content_type NOT NULL DEFAULT 'VIDEO',
    access_level content_access_level NOT NULL DEFAULT 'PPV_PURCHASE',
    price_credits INT NOT NULL DEFAULT 0 CHECK (price_credits >= 0),
    preview_url TEXT,
    media_url TEXT NOT NULL,
    media_duration_seconds INT CHECK (media_duration_seconds IS NULL OR media_duration_seconds >= 0),
    file_size_bytes BIGINT CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    view_count INT NOT NULL DEFAULT 0 CHECK (view_count >= 0),
    like_count INT NOT NULL DEFAULT 0 CHECK (like_count >= 0),
    purchase_count INT NOT NULL DEFAULT 0 CHECK (purchase_count >= 0),
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contents_creator ON contents(creator_profile_id, is_published);
CREATE INDEX idx_contents_access ON contents(access_level, published_at DESC);

CREATE TRIGGER trg_contents_updated_at
BEFORE UPDATE ON contents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE 13: wallets (Double-Entry Authoritative Ledger Account)
-- ----------------------------------------------------------------------------
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(16) NOT NULL DEFAULT 'CREDITS',
    balance INT NOT NULL DEFAULT 0 CHECK (balance >= 0),
    purchased_balance INT NOT NULL DEFAULT 0 CHECK (purchased_balance >= 0),
    promotional_balance INT NOT NULL DEFAULT 0 CHECK (promotional_balance >= 0),
    bonus_balance INT NOT NULL DEFAULT 0 CHECK (bonus_balance >= 0),
    locked_balance INT NOT NULL DEFAULT 0 CHECK (locked_balance >= 0),
    pending_balance INT NOT NULL DEFAULT 0 CHECK (pending_balance >= 0),
    lifetime_deposited_credits BIGINT NOT NULL DEFAULT 0 CHECK (lifetime_deposited_credits >= 0),
    lifetime_earned_credits BIGINT NOT NULL DEFAULT 0 CHECK (lifetime_earned_credits >= 0),
    lifetime_spent_credits BIGINT NOT NULL DEFAULT 0 CHECK (lifetime_spent_credits >= 0),
    lifetime_withdrawn_credits BIGINT NOT NULL DEFAULT 0 CHECK (lifetime_withdrawn_credits >= 0),
    status wallet_status NOT NULL DEFAULT 'ACTIVE',
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallets_user ON wallets(user_id, status);

CREATE TRIGGER trg_wallets_updated_at
BEFORE UPDATE ON wallets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE 13b: credit_lots (Granular Accounting Lots / Buckets per Credit Type)
-- ----------------------------------------------------------------------------
CREATE TABLE credit_lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    credit_type credit_type NOT NULL DEFAULT 'PURCHASED',
    original_amount INT NOT NULL CHECK (original_amount > 0),
    remaining_amount INT NOT NULL CHECK (remaining_amount >= 0),
    fiat_value_cents INT CHECK (fiat_value_cents >= 0),
    fiat_currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    expires_at TIMESTAMPTZ,
    grant_reason VARCHAR(255),
    payment_transaction_id VARCHAR(255),
    status credit_lot_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_lots_wallet_status ON credit_lots(wallet_id, status);
CREATE INDEX idx_credit_lots_wallet_expiry ON credit_lots(wallet_id, expires_at);
CREATE INDEX idx_credit_lots_type_status ON credit_lots(credit_type, status);

CREATE TRIGGER trg_credit_lots_updated_at
BEFORE UPDATE ON credit_lots
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE 14: wallet_transactions (Immutable Double-Entry Ledger Entries)
-- ----------------------------------------------------------------------------
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
    destination_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
    transaction_type wallet_transaction_type NOT NULL,
    direction transaction_direction NOT NULL DEFAULT 'TRANSFER',
    amount_credits INT NOT NULL CHECK (amount_credits > 0),
    primary_credit_type credit_type,
    platform_fee_credits INT NOT NULL DEFAULT 0 CHECK (platform_fee_credits >= 0),
    creator_net_credits INT NOT NULL DEFAULT 0 CHECK (creator_net_credits >= 0),
    source_balance_before INT,
    source_balance_after INT,
    dest_balance_before INT,
    dest_balance_after INT,
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    reference_type VARCHAR(64),
    reference_id VARCHAR(128),
    status wallet_transaction_status NOT NULL DEFAULT 'COMPLETED',
    note TEXT,
    metadata_json TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_tx_source ON wallet_transactions(source_wallet_id, created_at DESC);
CREATE INDEX idx_wallet_tx_dest ON wallet_transactions(destination_wallet_id, created_at DESC);
CREATE INDEX idx_wallet_tx_type ON wallet_transactions(transaction_type, created_at DESC);
CREATE INDEX idx_wallet_tx_ref ON wallet_transactions(reference_type, reference_id);

-- ----------------------------------------------------------------------------
-- TABLE 14b: credit_lot_deductions (Granular Lot Split Consumption Audit)
-- ----------------------------------------------------------------------------
CREATE TABLE credit_lot_deductions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_lot_id UUID NOT NULL REFERENCES credit_lots(id) ON DELETE CASCADE,
    wallet_transaction_id UUID NOT NULL REFERENCES wallet_transactions(id) ON DELETE CASCADE,
    amount_deducted INT NOT NULL CHECK (amount_deducted > 0),
    credit_type credit_type NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lot_deductions_lot ON credit_lot_deductions(credit_lot_id);
CREATE INDEX idx_lot_deductions_tx ON credit_lot_deductions(wallet_transaction_id);

-- ----------------------------------------------------------------------------
-- TABLE 10: content_purchases
-- ----------------------------------------------------------------------------
CREATE TABLE content_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    fan_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    price_credits_paid INT NOT NULL CHECK (price_credits_paid >= 0),
    platform_fee_credits INT NOT NULL DEFAULT 0 CHECK (platform_fee_credits >= 0),
    creator_net_credits INT NOT NULL DEFAULT 0 CHECK (creator_net_credits >= 0),
    wallet_transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
    access_granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_content_fan_purchase UNIQUE (content_id, fan_id)
);

CREATE INDEX idx_content_purchases_fan ON content_purchases(fan_id);
CREATE INDEX idx_content_purchases_content ON content_purchases(content_id);

-- ----------------------------------------------------------------------------
-- TABLE 11: conversations
-- ----------------------------------------------------------------------------
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_type conversation_type NOT NULL DEFAULT 'DIRECT_DM',
    title VARCHAR(255),
    creator_profile_id UUID REFERENCES creator_profiles(id) ON DELETE SET NULL,
    initiator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    last_message_id UUID,
    last_message_preview TEXT,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_initiator ON conversations(initiator_user_id, last_activity_at DESC);
CREATE INDEX idx_conversations_recipient ON conversations(recipient_user_id, last_activity_at DESC);
CREATE INDEX idx_conversations_creator ON conversations(creator_profile_id);

CREATE TRIGGER trg_conversations_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE 12: messages
-- ----------------------------------------------------------------------------
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message_type message_type NOT NULL DEFAULT 'TEXT',
    body TEXT,
    media_url TEXT,
    is_ppv_locked BOOLEAN NOT NULL DEFAULT FALSE,
    ppv_price_credits INT DEFAULT 0 CHECK (ppv_price_credits >= 0),
    is_ppv_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
    tip_credits INT DEFAULT 0 CHECK (tip_credits >= 0),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at ASC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient_unread ON messages(recipient_id, is_read);

CREATE TRIGGER trg_messages_updated_at
BEFORE UPDATE ON messages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE 15: payment_transactions (External Gateway Billing)
-- ----------------------------------------------------------------------------
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    payment_gateway payment_gateway NOT NULL,
    gateway_transaction_id VARCHAR(255),
    gateway_event_id VARCHAR(255),
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    amount_fiat_cents INT NOT NULL CHECK (amount_fiat_cents > 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    credits_purchased INT NOT NULL CHECK (credits_purchased > 0),
    bonus_credits INT NOT NULL DEFAULT 0 CHECK (bonus_credits >= 0),
    gateway_fee_cents INT NOT NULL DEFAULT 0 CHECK (gateway_fee_cents >= 0),
    payment_method VARCHAR(64),
    status payment_transaction_status NOT NULL DEFAULT 'INITIALIZED',
    risk_score INT,
    ip_address VARCHAR(45),
    country_code VARCHAR(8),
    raw_gateway_payload TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_tx_user ON payment_transactions(user_id, status);
CREATE INDEX idx_payment_tx_gateway ON payment_transactions(payment_gateway, gateway_transaction_id);

CREATE TRIGGER trg_payment_transactions_updated_at
BEFORE UPDATE ON payment_transactions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE 16: creator_earnings
-- ----------------------------------------------------------------------------
CREATE TABLE creator_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_profile_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
    wallet_transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
    earning_source earning_source_type NOT NULL,
    source_reference_id VARCHAR(128),
    gross_credits INT NOT NULL CHECK (gross_credits >= 0),
    platform_rake_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0.20,
    platform_fee_credits INT NOT NULL CHECK (platform_fee_credits >= 0),
    net_creator_credits INT NOT NULL CHECK (net_creator_credits >= 0),
    fiat_value_estimated_cents INT NOT NULL DEFAULT 0 CHECK (fiat_value_estimated_cents >= 0),
    clearance_status earning_clearance_status NOT NULL DEFAULT 'CLEARED',
    clears_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_creator_earnings_profile ON creator_earnings(creator_profile_id, clearance_status);
CREATE INDEX idx_creator_earnings_source ON creator_earnings(earning_source, created_at DESC);

-- ----------------------------------------------------------------------------
-- TABLE 17: payouts
-- ----------------------------------------------------------------------------
CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_profile_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
    amount_fiat_cents INT NOT NULL CHECK (amount_fiat_cents > 0),
    credits_deducted INT NOT NULL CHECK (credits_deducted > 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    payout_method payout_method NOT NULL,
    payout_beneficiary_info TEXT NOT NULL,
    status payout_status NOT NULL DEFAULT 'REQUESTED',
    gateway_reference_id VARCHAR(255),
    failure_reason TEXT,
    reviewed_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payouts_profile ON payouts(creator_profile_id, status);
CREATE INDEX idx_payouts_status ON payouts(status, requested_at DESC);

CREATE TRIGGER trg_payouts_updated_at
BEFORE UPDATE ON payouts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE 18: interaction_definitions
-- ----------------------------------------------------------------------------
CREATE TABLE interaction_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_profile_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
    title VARCHAR(128) NOT NULL,
    description TEXT,
    action_type interaction_action_type NOT NULL DEFAULT 'TIP_ALERT',
    price_credits INT NOT NULL CHECK (price_credits >= 0),
    duration_seconds INT NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
    intensity_level INT CHECK (intensity_level IS NULL OR (intensity_level >= 1 AND intensity_level <= 100)),
    toy_command_pattern VARCHAR(255),
    sound_asset_url TEXT,
    icon_url TEXT,
    cooldown_seconds INT NOT NULL DEFAULT 0 CHECK (cooldown_seconds >= 0),
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interaction_def_creator ON interaction_definitions(creator_profile_id, is_enabled);

CREATE TRIGGER trg_interaction_definitions_updated_at
BEFORE UPDATE ON interaction_definitions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE 19: interaction_purchases
-- ----------------------------------------------------------------------------
CREATE TABLE interaction_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    livestream_id UUID REFERENCES livestreams(id) ON DELETE SET NULL,
    creator_profile_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
    fan_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interaction_definition_id UUID NOT NULL REFERENCES interaction_definitions(id) ON DELETE CASCADE,
    price_credits_paid INT NOT NULL CHECK (price_credits_paid >= 0),
    custom_message TEXT,
    toy_intensity INT,
    status interaction_purchase_status NOT NULL DEFAULT 'PAID',
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interaction_purchases_stream ON interaction_purchases(livestream_id, status);
CREATE INDEX idx_interaction_purchases_creator ON interaction_purchases(creator_profile_id, created_at DESC);
CREATE INDEX idx_interaction_purchases_fan ON interaction_purchases(fan_id);

-- ----------------------------------------------------------------------------
-- TABLE 20: interaction_queue_entries
-- ----------------------------------------------------------------------------
CREATE TABLE interaction_queue_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    livestream_id UUID NOT NULL REFERENCES livestreams(id) ON DELETE CASCADE,
    interaction_purchase_id UUID NOT NULL UNIQUE REFERENCES interaction_purchases(id) ON DELETE CASCADE,
    queue_position INT NOT NULL CHECK (queue_position >= 0),
    status queue_entry_status NOT NULL DEFAULT 'PENDING',
    scheduled_execution_time TIMESTAMPTZ,
    started_playing_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_queue_stream_status ON interaction_queue_entries(livestream_id, status, queue_position);

CREATE TRIGGER trg_interaction_queue_updated_at
BEFORE UPDATE ON interaction_queue_entries
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE 21: collective_goals
-- ----------------------------------------------------------------------------
CREATE TABLE collective_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    livestream_id UUID REFERENCES livestreams(id) ON DELETE SET NULL,
    creator_profile_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    reward_description TEXT,
    target_credits INT NOT NULL CHECK (target_credits > 0),
    current_credits INT NOT NULL DEFAULT 0 CHECK (current_credits >= 0),
    contributor_count INT NOT NULL DEFAULT 0 CHECK (contributor_count >= 0),
    status goal_status NOT NULL DEFAULT 'ACTIVE',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    reached_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goals_creator ON collective_goals(creator_profile_id, status);
CREATE INDEX idx_goals_stream ON collective_goals(livestream_id, status);

CREATE TRIGGER trg_collective_goals_updated_at
BEFORE UPDATE ON collective_goals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE 22: goal_contributions
-- ----------------------------------------------------------------------------
CREATE TABLE goal_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collective_goal_id UUID NOT NULL REFERENCES collective_goals(id) ON DELETE CASCADE,
    livestream_id UUID REFERENCES livestreams(id) ON DELETE SET NULL,
    fan_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_credits INT NOT NULL CHECK (amount_credits > 0),
    message TEXT,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goal_contrib_goal ON goal_contributions(collective_goal_id, created_at DESC);
CREATE INDEX idx_goal_contrib_fan ON goal_contributions(fan_id);

-- ----------------------------------------------------------------------------
-- TABLE 23: creator_relationships
-- ----------------------------------------------------------------------------
CREATE TABLE creator_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fan_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creator_profile_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
    relationship_tier relationship_tier NOT NULL DEFAULT 'STRANGER',
    current_level INT NOT NULL DEFAULT 1 CHECK (current_level >= 1),
    total_xp BIGINT NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
    total_credits_spent BIGINT NOT NULL DEFAULT 0 CHECK (total_credits_spent >= 0),
    total_minutes_watched INT NOT NULL DEFAULT 0 CHECK (total_minutes_watched >= 0),
    current_streak_days INT NOT NULL DEFAULT 0 CHECK (current_streak_days >= 0),
    longest_streak_days INT NOT NULL DEFAULT 0 CHECK (longest_streak_days >= 0),
    last_interacted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    custom_nickname VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_fan_creator_rel UNIQUE (fan_id, creator_profile_id)
);

CREATE INDEX idx_creator_rel_fan ON creator_relationships(fan_id);
CREATE INDEX idx_creator_rel_creator_spend ON creator_relationships(creator_profile_id, total_credits_spent DESC);

CREATE TRIGGER trg_creator_relationships_updated_at
BEFORE UPDATE ON creator_relationships
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE 24: relationship_xp_events
-- ----------------------------------------------------------------------------
CREATE TABLE relationship_xp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_relationship_id UUID NOT NULL REFERENCES creator_relationships(id) ON DELETE CASCADE,
    fan_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creator_profile_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
    event_type relationship_xp_type NOT NULL,
    xp_awarded INT NOT NULL CHECK (xp_awarded >= 0),
    credits_multiplier REAL NOT NULL DEFAULT 1.0,
    metadata_json TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rel_xp_relationship ON relationship_xp_events(creator_relationship_id, created_at DESC);
CREATE INDEX idx_rel_xp_fan ON relationship_xp_events(fan_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- TABLE 25: platform_xp_events
-- ----------------------------------------------------------------------------
CREATE TABLE platform_xp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type platform_xp_type NOT NULL,
    xp_awarded INT NOT NULL CHECK (xp_awarded >= 0),
    user_level_after INT NOT NULL CHECK (user_level_after >= 1),
    metadata_json TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_platform_xp_user ON platform_xp_events(user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- TABLE 26: achievements
-- ----------------------------------------------------------------------------
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    description TEXT NOT NULL,
    category achievement_category NOT NULL DEFAULT 'FAN_LOYALTY',
    badge_icon_url TEXT NOT NULL,
    badge_tier badge_tier NOT NULL DEFAULT 'BRONZE',
    xp_reward INT NOT NULL DEFAULT 100 CHECK (xp_reward >= 0),
    credit_bonus_reward INT NOT NULL DEFAULT 0 CHECK (credit_bonus_reward >= 0),
    requirement_threshold INT NOT NULL DEFAULT 1 CHECK (requirement_threshold > 0),
    requirement_metric VARCHAR(64) NOT NULL DEFAULT 'TOTAL_CREDITS_SPENT',
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_achievements_cat ON achievements(category);

-- ----------------------------------------------------------------------------
-- TABLE: user_achievements
-- ----------------------------------------------------------------------------
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    current_progress INT NOT NULL DEFAULT 0 CHECK (current_progress >= 0),
    is_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
    unlocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_achievement UNIQUE (user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id, is_unlocked);

CREATE TRIGGER trg_user_achievements_updated_at
BEFORE UPDATE ON user_achievements
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE 27: seats
-- ----------------------------------------------------------------------------
CREATE TABLE seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    livestream_id UUID NOT NULL REFERENCES livestreams(id) ON DELETE CASCADE,
    seat_index INT NOT NULL CHECK (seat_index >= 0),
    seat_tier seat_tier NOT NULL DEFAULT 'VIP_FRONT_ROW',
    current_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    price_per_minute_credits INT NOT NULL DEFAULT 0 CHECK (price_per_minute_credits >= 0),
    minimum_bid_credits INT NOT NULL DEFAULT 0 CHECK (minimum_bid_credits >= 0),
    is_occupied BOOLEAN NOT NULL DEFAULT FALSE,
    occupied_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_stream_seat_idx UNIQUE (livestream_id, seat_index)
);

CREATE INDEX idx_seats_occupied ON seats(livestream_id, is_occupied);

CREATE TRIGGER trg_seats_updated_at
BEFORE UPDATE ON seats
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE 28: leaderboard_records
-- ----------------------------------------------------------------------------
CREATE TABLE leaderboard_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope leaderboard_scope NOT NULL,
    timeframe leaderboard_timeframe NOT NULL,
    period_key VARCHAR(64) NOT NULL,
    creator_profile_id UUID REFERENCES creator_profiles(id) ON DELETE CASCADE,
    livestream_id UUID REFERENCES livestreams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rank INT NOT NULL CHECK (rank >= 1),
    total_credits_contributed BIGINT NOT NULL DEFAULT 0 CHECK (total_credits_contributed >= 0),
    total_xp_earned BIGINT NOT NULL DEFAULT 0 CHECK (total_xp_earned >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_leaderboard_record UNIQUE (scope, timeframe, period_key, creator_profile_id, livestream_id, user_id)
);

CREATE INDEX idx_leaderboard_rank ON leaderboard_records(scope, timeframe, period_key, rank ASC);

CREATE TRIGGER trg_leaderboard_updated_at
BEFORE UPDATE ON leaderboard_records
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE 29: private_session_availabilities
-- ----------------------------------------------------------------------------
CREATE TABLE private_session_availabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_profile_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time_utc VARCHAR(8) NOT NULL,
    end_time_utc VARCHAR(8) NOT NULL,
    min_duration_minutes INT NOT NULL DEFAULT 10 CHECK (min_duration_minutes > 0),
    max_duration_minutes INT NOT NULL DEFAULT 60 CHECK (max_duration_minutes >= min_duration_minutes),
    credit_rate_per_minute INT NOT NULL DEFAULT 100 CHECK (credit_rate_per_minute > 0),
    buffer_time_minutes INT NOT NULL DEFAULT 5 CHECK (buffer_time_minutes >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_private_avail_creator ON private_session_availabilities(creator_profile_id, is_active);

CREATE TRIGGER trg_private_session_avail_updated_at
BEFORE UPDATE ON private_session_availabilities
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE 30: bookings
-- ----------------------------------------------------------------------------
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_profile_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
    fan_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduled_start_time TIMESTAMPTZ NOT NULL,
    scheduled_end_time TIMESTAMPTZ NOT NULL,
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    credit_rate_per_minute INT NOT NULL CHECK (credit_rate_per_minute > 0),
    total_credits_escrowed INT NOT NULL CHECK (total_credits_escrowed >= 0),
    status booking_status NOT NULL DEFAULT 'PENDING_CREATOR_ACCEPT',
    meeting_room_id VARCHAR(128),
    fan_notes TEXT,
    creator_notes TEXT,
    actual_started_at TIMESTAMPTZ,
    actual_ended_at TIMESTAMPTZ,
    actual_duration_seconds INT CHECK (actual_duration_seconds IS NULL OR actual_duration_seconds >= 0),
    wallet_transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_creator ON bookings(creator_profile_id, status);
CREATE INDEX idx_bookings_fan ON bookings(fan_id, status);
CREATE INDEX idx_bookings_schedule ON bookings(scheduled_start_time ASC);

CREATE TRIGGER trg_bookings_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE 31: reports
-- ----------------------------------------------------------------------------
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reported_creator_profile_id UUID REFERENCES creator_profiles(id) ON DELETE SET NULL,
    reported_content_id UUID REFERENCES contents(id) ON DELETE SET NULL,
    reported_livestream_id UUID REFERENCES livestreams(id) ON DELETE SET NULL,
    reported_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    category report_category NOT NULL,
    description TEXT NOT NULL,
    evidence_urls TEXT,
    status report_status NOT NULL DEFAULT 'OPEN',
    assigned_moderator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    moderator_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_status ON reports(status, created_at DESC);
CREATE INDEX idx_reports_target_user ON reports(reported_user_id);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);

CREATE TRIGGER trg_reports_updated_at
BEFORE UPDATE ON reports
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE 32: moderation_cases
-- ----------------------------------------------------------------------------
CREATE TABLE moderation_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(64) NOT NULL UNIQUE,
    source_report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_moderator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    priority moderation_priority NOT NULL DEFAULT 'MEDIUM',
    status moderation_case_status NOT NULL DEFAULT 'OPEN',
    action_taken moderation_action_type NOT NULL DEFAULT 'NONE',
    action_duration_hours INT CHECK (action_duration_hours IS NULL OR action_duration_hours > 0),
    summary_findings TEXT,
    internal_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mod_cases_status ON moderation_cases(status, priority);
CREATE INDEX idx_mod_cases_target ON moderation_cases(target_user_id);

CREATE TRIGGER trg_moderation_cases_updated_at
BEFORE UPDATE ON moderation_cases
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE 33: audit_events (Immutable Append-Only Audit Trail)
-- ----------------------------------------------------------------------------
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(128) NOT NULL,
    target_entity_type VARCHAR(64) NOT NULL,
    target_entity_id VARCHAR(128) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    old_values TEXT,
    new_values TEXT,
    metadata_json TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_events_target ON audit_events(target_entity_type, target_entity_id);
CREATE INDEX idx_audit_events_actor ON audit_events(actor_id, created_at DESC);
CREATE INDEX idx_audit_events_action ON audit_events(action, created_at DESC);

-- ----------------------------------------------------------------------------
-- TABLE 34: notifications
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    action_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    metadata_json TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- ----------------------------------------------------------------------------
-- TABLE 35: game_sessions
-- ----------------------------------------------------------------------------
CREATE TABLE game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    livestream_id UUID REFERENCES livestreams(id) ON DELETE SET NULL,
    creator_profile_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
    game_type game_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    status game_session_status NOT NULL DEFAULT 'LOBBY_WAITING',
    entry_cost_credits INT NOT NULL DEFAULT 0 CHECK (entry_cost_credits >= 0),
    total_prize_pool_credits INT NOT NULL DEFAULT 0 CHECK (total_prize_pool_credits >= 0),
    winning_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    game_state_json TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_game_sessions_creator ON game_sessions(creator_profile_id, status);
CREATE INDEX idx_game_sessions_stream ON game_sessions(livestream_id, status);

CREATE TRIGGER trg_game_sessions_updated_at
BEFORE UPDATE ON game_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE 36: game_rewards
-- ----------------------------------------------------------------------------
CREATE TABLE game_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward_type game_reward_type NOT NULL,
    reward_value_credits INT NOT NULL DEFAULT 0 CHECK (reward_value_credits >= 0),
    is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    claimed_at TIMESTAMPTZ,
    claim_metadata TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_game_rewards_session ON game_rewards(game_session_id);
CREATE INDEX idx_game_rewards_user ON game_rewards(user_id, is_claimed);

-- ============================================================================
-- END OF SCHEMA DDL
-- ============================================================================
