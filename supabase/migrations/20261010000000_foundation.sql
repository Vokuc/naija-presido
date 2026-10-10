-- NAIJA PRESIDO MVP DATABASE SCHEMA
-- Implementation of Master Architecture Document Version 0.2

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SECTION 1: ACCOUNT / IDENTITY DOMAIN (acct_)
-- ============================================================================

CREATE TABLE acct_account (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL UNIQUE, -- References auth.users(id) - assuming Supabase Auth
  username    text UNIQUE NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned'))
);

-- ============================================================================
-- SECTION 2: CHARACTER DOMAIN (chr_)
-- ============================================================================

CREATE TABLE chr_character (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    uuid REFERENCES acct_account(id) ON DELETE SET NULL, -- Null for NPCs
  is_npc        boolean NOT NULL DEFAULT false,
  display_name  text NOT NULL,
  avatar_config jsonb DEFAULT '{}',
  bio           text,
  born_at       timestamptz,          -- Game-time birth date
  status        text DEFAULT 'alive' CHECK (status IN ('alive', 'deceased')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Active character pointer
CREATE TABLE acct_active_character (
  account_id      uuid PRIMARY KEY REFERENCES acct_account(id) ON DELETE CASCADE,
  character_id    uuid NOT NULL REFERENCES chr_character(id) ON DELETE CASCADE,
  switched_at     timestamptz NOT NULL DEFAULT now()
);

-- RLS Helper Function (defined early so it can be used in policies)
CREATE OR REPLACE FUNCTION public.current_character_id()
RETURNS uuid AS $$
  SELECT ac.character_id
  FROM public.acct_active_character ac
  JOIN public.acct_account a ON ac.account_id = a.id
  WHERE a.user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- SECTION 3: GEOGRAPHY DOMAIN (geo_)
-- ============================================================================

CREATE TABLE geo_location (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   uuid REFERENCES geo_location(id),
  type        text NOT NULL CHECK (type IN ('world', 'country', 'state', 'city', 'district', 'neighbourhood', 'zone')),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  description text,
  metadata    jsonb DEFAULT '{}'
);

-- ============================================================================
-- SECTION 4: PHYSICAL WORLD DOMAIN (phys_)
-- ============================================================================

CREATE TABLE phys_venue (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id     uuid REFERENCES geo_location(id),
  name        text NOT NULL,
  type        text NOT NULL,
  capacity    integer,
  is_public   boolean DEFAULT true,
  metadata    jsonb DEFAULT '{}'
);

-- Character State (depends on Geography and Physical World)
CREATE TABLE chr_character_state (
  character_id  uuid PRIMARY KEY REFERENCES chr_character(id) ON DELETE CASCADE,
  location_id   uuid REFERENCES geo_location(id),
  venue_id      uuid REFERENCES phys_venue(id),
  status        text DEFAULT 'active' CHECK (status IN ('active', 'offline', 'sleeping')),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chr_state_location ON chr_character_state(location_id);
CREATE INDEX idx_chr_state_venue ON chr_character_state(venue_id);

-- Character Stats
CREATE TABLE chr_character_stats (
  character_id    uuid PRIMARY KEY REFERENCES chr_character(id) ON DELETE CASCADE,
  energy          numeric NOT NULL DEFAULT 100 CHECK (energy >= 0 AND energy <= 100),
  hunger          numeric NOT NULL DEFAULT 0 CHECK (hunger >= 0 AND hunger <= 100),
  health          numeric NOT NULL DEFAULT 100 CHECK (health >= 0 AND health <= 100),
  education_level text DEFAULT 'none',
  job_title       text,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- SECTION 5: WORLD / TIME DOMAIN (wrld_)
-- ============================================================================

CREATE TABLE wrld_clock (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  epoch_real    timestamptz NOT NULL,
  epoch_game    timestamptz NOT NULL,
  scale_factor  numeric NOT NULL CHECK (scale_factor > 0),
  paused        boolean NOT NULL DEFAULT false,
  paused_at     timestamptz,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- SECTION 6: ECONOMY DOMAIN (eco_)
-- ============================================================================

CREATE TABLE eco_asset (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type    text NOT NULL, -- 'venue', 'business', 'vehicle', 'real_estate', 'item'
  asset_id      uuid NOT NULL, -- Polymorphic relation to specific entity IDs
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(asset_type, asset_id)
);

CREATE TABLE eco_asset_ownership (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id         uuid NOT NULL REFERENCES eco_asset(id) ON DELETE CASCADE,
  owner_type       text NOT NULL CHECK (owner_type IN ('character', 'organization', 'government')),
  owner_id         uuid NOT NULL, -- Polymorphic relation to characters/orgs
  share_percentage numeric NOT NULL DEFAULT 100 CHECK (share_percentage > 0 AND share_percentage <= 100),
  status           text DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'seized', 'bankrupt')),
  acquired_at      timestamptz NOT NULL DEFAULT now(),
  relinquished_at  timestamptz
);
CREATE INDEX idx_eco_asset_ownership_owner ON eco_asset_ownership(owner_type, owner_id);

CREATE TABLE eco_wallet (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id  uuid UNIQUE NOT NULL REFERENCES chr_character(id) ON DELETE CASCADE,
  balance       numeric NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency      text NOT NULL DEFAULT 'NGN',
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE eco_transaction (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id           uuid REFERENCES chr_character(id), -- NULL = system source
  to_id             uuid REFERENCES chr_character(id), -- NULL = system sink
  amount            numeric NOT NULL CHECK (amount > 0),
  currency          text NOT NULL DEFAULT 'NGN',
  source_type       text NOT NULL, -- 'employment', 'purchase', 'transfer', 'system_grant', 'tax'
  source_id         uuid, -- Polymorphic relation to job_id, business_id, etc.
  reason            text,
  idempotency_key   uuid UNIQUE NOT NULL,
  game_timestamp    timestamptz NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_eco_txn_from ON eco_transaction(from_id, created_at);
CREATE INDEX idx_eco_txn_to ON eco_transaction(to_id, created_at);
CREATE INDEX idx_eco_txn_idemp ON eco_transaction(idempotency_key);

CREATE TABLE eco_employment (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    uuid NOT NULL REFERENCES chr_character(id) ON DELETE CASCADE,
  employer_id     uuid NOT NULL REFERENCES chr_character(id),
  venue_id        uuid REFERENCES phys_venue(id) ON DELETE SET NULL,
  job_title       text NOT NULL,
  hourly_rate     numeric NOT NULL CHECK (hourly_rate >= 0),
  started_at_game timestamptz NOT NULL,
  started_at_real timestamptz NOT NULL,
  ended_at_real   timestamptz,
  status          text DEFAULT 'active' CHECK (status IN ('active', 'terminated', 'resigned', 'suspended'))
);
CREATE INDEX idx_eco_employment_char ON eco_employment(character_id, status);

CREATE TABLE eco_work_session (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    uuid NOT NULL REFERENCES chr_character(id) ON DELETE CASCADE,
  employment_id   uuid NOT NULL REFERENCES eco_employment(id) ON DELETE CASCADE,
  started_at_real timestamptz NOT NULL,
  started_at_game timestamptz NOT NULL,
  ended_at_real   timestamptz,
  ended_at_game   timestamptz,
  game_hours      numeric,
  earned          numeric,
  idempotency_key uuid UNIQUE NOT NULL
);
CREATE INDEX idx_eco_work_session_char ON eco_work_session(character_id, ended_at_real);

-- Atomic money transfer function
CREATE OR REPLACE FUNCTION public.eco_transfer_funds(
  p_from_id         uuid,
  p_to_id           uuid,
  p_amount          numeric,
  p_source_type     text,
  p_source_id       uuid,
  p_reason          text,
  p_idempotency_key uuid,
  p_game_timestamp  timestamptz
) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  -- Idempotency check
  IF EXISTS (SELECT 1 FROM public.eco_transaction WHERE idempotency_key = p_idempotency_key) THEN
    RETURN;
  END IF;

  -- Deduct with lock + balance check in one statement (if from_id is not null)
  IF p_from_id IS NOT NULL THEN
    UPDATE public.eco_wallet
    SET balance = balance - p_amount, updated_at = now()
    WHERE character_id = p_from_id AND balance >= p_amount;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'insufficient_funds';
    END IF;
  END IF;

  -- Credit (if to_id is not null)
  IF p_to_id IS NOT NULL THEN
    UPDATE public.eco_wallet
    SET balance = balance + p_amount, updated_at = now()
    WHERE character_id = p_to_id;
  END IF;

  -- Immutable ledger entry
  INSERT INTO public.eco_transaction (
    id, from_id, to_id, amount, currency,
    source_type, source_id, reason,
    idempotency_key, game_timestamp, created_at
  ) VALUES (
    gen_random_uuid(), p_from_id, p_to_id, p_amount, 'NGN',
    p_source_type, p_source_id, p_reason,
    p_idempotency_key, p_game_timestamp, now()
  );
END;
$$;

-- ============================================================================
-- SECTION 7: SOCIAL DOMAIN (soc_)
-- ============================================================================

CREATE TABLE soc_relationship (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid NOT NULL REFERENCES chr_character(id) ON DELETE CASCADE,
  target_id   uuid NOT NULL REFERENCES chr_character(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('friend', 'rival', 'family', 'colleague', 'enemy')),
  strength    numeric NOT NULL DEFAULT 0 CHECK (strength >= -100 AND strength <= 100),
  formed_at   timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_id, target_id, type)
);

CREATE TABLE soc_reputation (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id  uuid NOT NULL REFERENCES chr_character(id) ON DELETE CASCADE,
  scope_type    text NOT NULL CHECK (scope_type IN ('neighbourhood', 'city', 'state', 'national', 'organization')),
  scope_id      uuid, -- Polymorphic relation to specific scopes
  dimension     text NOT NULL CHECK (dimension IN ('popularity', 'trust', 'competence', 'notoriety', 'influence')),
  score         numeric NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (character_id, scope_type, scope_id, dimension)
);
CREATE INDEX idx_soc_reputation_lookup ON soc_reputation(character_id, scope_type, dimension);

-- ============================================================================
-- SECTION 8: EVENTS DOMAIN (evt_)
-- ============================================================================

CREATE TABLE evt_event (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type           text NOT NULL,
  category       text NOT NULL CHECK (category IN ('action', 'consequence', 'world', 'system')),
  significance   text NOT NULL CHECK (significance IN ('trivial', 'minor', 'significant', 'historic')),
  actor_id       uuid REFERENCES chr_character(id) ON DELETE SET NULL,
  location_id    uuid REFERENCES geo_location(id) ON DELETE SET NULL,
  venue_id       uuid REFERENCES phys_venue(id) ON DELETE SET NULL,
  payload        jsonb NOT NULL DEFAULT '{}',
  caused_by      uuid REFERENCES evt_event(id) ON DELETE SET NULL,
  game_timestamp timestamptz NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_evt_event_actor ON evt_event(actor_id, created_at);
CREATE INDEX idx_evt_event_location ON evt_event(location_id, significance);

CREATE TABLE evt_effect (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES evt_event(id) ON DELETE CASCADE,
  target_type   text NOT NULL CHECK (target_type IN ('character', 'venue', 'organization', 'location')),
  target_id     uuid NOT NULL, -- Polymorphic relation
  attribute     text NOT NULL,
  delta         jsonb NOT NULL,
  applied_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_evt_effect_target ON evt_effect(target_type, target_id);

-- ============================================================================
-- SECTION 9: NOTIFICATIONS DOMAIN (ntf_)
-- ============================================================================

CREATE TABLE ntf_notification (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id  uuid NOT NULL REFERENCES chr_character(id) ON DELETE CASCADE,
  type          text NOT NULL,
  title         text NOT NULL,
  body          text,
  payload       jsonb DEFAULT '{}',
  read          boolean DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ntf_notification_char ON ntf_notification(character_id, read, created_at);

-- ============================================================================
-- SECTION 10: OBSERVABILITY DOMAIN (obs_)
-- ============================================================================

CREATE TABLE obs_command_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  command_type     text NOT NULL,
  actor_id         uuid REFERENCES chr_character(id) ON DELETE SET NULL,
  status           text NOT NULL CHECK (status IN ('accepted', 'rejected', 'error')),
  rejection_reason text,
  idempotency_key  uuid,
  duration_ms      integer,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_obs_cmd_actor ON obs_command_log(actor_id, created_at);
CREATE INDEX idx_obs_cmd_type ON obs_command_log(command_type, created_at);

CREATE TABLE obs_tick_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tick_type           text NOT NULL,
  started_at          timestamptz NOT NULL,
  completed_at        timestamptz,
  entities_processed  integer,
  errors              jsonb DEFAULT '[]'
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) FOUNDATIONS
-- ============================================================================

ALTER TABLE acct_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE acct_active_character ENABLE ROW LEVEL SECURITY;
ALTER TABLE chr_character ENABLE ROW LEVEL SECURITY;
ALTER TABLE chr_character_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE chr_character_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_location ENABLE ROW LEVEL SECURITY;
ALTER TABLE phys_venue ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrld_clock ENABLE ROW LEVEL SECURITY;
ALTER TABLE eco_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE eco_transaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE soc_relationship ENABLE ROW LEVEL SECURITY;
ALTER TABLE soc_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE ntf_notification ENABLE ROW LEVEL SECURITY;

-- 1. Account Access: Users can only see/modify their own account and active char
CREATE POLICY "own_account_read" ON acct_account FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "own_active_char_all" ON acct_active_character FOR ALL USING (account_id IN (SELECT id FROM acct_account WHERE user_id = auth.uid()));

-- 2. Character Data: Public read for general data, specific writes
CREATE POLICY "public_char_read" ON chr_character FOR SELECT USING (true);
CREATE POLICY "own_char_update" ON chr_character FOR UPDATE USING (id = current_character_id());

CREATE POLICY "public_char_state_read" ON chr_character_state FOR SELECT USING (true);
CREATE POLICY "own_char_state_update" ON chr_character_state FOR UPDATE USING (character_id = current_character_id());

CREATE POLICY "public_char_stats_read" ON chr_character_stats FOR SELECT USING (true);
-- Stats are mutated by system/service-role mostly, but maybe self-update for certain fields? Left restricted for now.

-- 3. Geography & Physical World: Public read-only
CREATE POLICY "public_geo_read" ON geo_location FOR SELECT USING (true);
CREATE POLICY "public_venue_read" ON phys_venue FOR SELECT USING (true);
CREATE POLICY "public_clock_read" ON wrld_clock FOR SELECT USING (true);

-- 4. Economy: Private wallets and transactions
CREATE POLICY "own_wallet_read" ON eco_wallet FOR SELECT USING (character_id = current_character_id());
-- No INSERT/UPDATE policy on eco_wallet for authenticated users. All modifications go through eco_transfer_funds / service role.
CREATE POLICY "own_txn_read" ON eco_transaction FOR SELECT USING (from_id = current_character_id() OR to_id = current_character_id());

-- 5. Social: Public read, writes controlled by system
CREATE POLICY "public_rel_read" ON soc_relationship FOR SELECT USING (true);
CREATE POLICY "public_rep_read" ON soc_reputation FOR SELECT USING (true);

-- 6. Notifications: Private read/update
CREATE POLICY "own_notification_read" ON ntf_notification FOR SELECT USING (character_id = current_character_id());
CREATE POLICY "own_notification_update" ON ntf_notification FOR UPDATE USING (character_id = current_character_id());

-- Note: Events and Observability tables can remain without explicit RLS enable for now, 
-- or we can enable it to deny all client access and only allow server access.
ALTER TABLE evt_event ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_event_read" ON evt_event FOR SELECT USING (true);
ALTER TABLE evt_effect ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_effect_read" ON evt_effect FOR SELECT USING (true);

ALTER TABLE obs_command_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE obs_tick_log ENABLE ROW LEVEL SECURITY;
-- No client access to observability logs
