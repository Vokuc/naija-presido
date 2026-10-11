-- ============================================================================
-- Migration: 20261011000002_economy_foundation.sql
-- Description: Enhances the economy domain for the first playable economy loop.
--              Enables polymorphic employers (businesses, organizations, characters),
--              supports atomic money operations with idempotency, polymorphic
--              transaction counterparts, and an initial item catalog.
-- ============================================================================

-- 1. Support polymorphic employers in eco_employment (allowing future businesses to employ characters)
ALTER TABLE eco_employment
  DROP CONSTRAINT IF EXISTS eco_employment_employer_id_fkey;

ALTER TABLE eco_employment
  ADD COLUMN IF NOT EXISTS employer_type text NOT NULL DEFAULT 'character'
    CHECK (employer_type IN ('character', 'business', 'organization', 'government'));

CREATE INDEX IF NOT EXISTS idx_eco_employment_employer
  ON eco_employment(employer_type, employer_id);

-- 2. Support polymorphic source and target entities in eco_transaction
ALTER TABLE eco_transaction
  DROP CONSTRAINT IF EXISTS eco_transaction_from_id_fkey,
  DROP CONSTRAINT IF EXISTS eco_transaction_to_id_fkey;

ALTER TABLE eco_transaction
  ADD COLUMN IF NOT EXISTS from_type text DEFAULT 'character'
    CHECK (from_type IN ('character', 'business', 'organization', 'government', 'system')),
  ADD COLUMN IF NOT EXISTS to_type text DEFAULT 'character'
    CHECK (to_type IN ('character', 'business', 'organization', 'government', 'system'));

-- 3. Support wallet ownership polymorphism
ALTER TABLE eco_wallet
  ADD COLUMN IF NOT EXISTS owner_type text NOT NULL DEFAULT 'character'
    CHECK (owner_type IN ('character', 'business', 'organization', 'government'));

CREATE INDEX IF NOT EXISTS idx_eco_wallet_owner
  ON eco_wallet(character_id, owner_type);

-- 4. Initial catalog of purchasable/consumable items for the first economy loop
CREATE TABLE IF NOT EXISTS eco_item_catalog (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL UNIQUE,
  category     text NOT NULL CHECK (category IN ('food', 'drink', 'transport', 'tool', 'general')),
  price        numeric NOT NULL CHECK (price >= 0),
  energy_delta numeric NOT NULL DEFAULT 0,
  hunger_delta numeric NOT NULL DEFAULT 0,
  is_durable   boolean NOT NULL DEFAULT false,
  description  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Seed initial test items if not already present
INSERT INTO eco_item_catalog (name, category, price, energy_delta, hunger_delta, is_durable, description)
VALUES
  ('Jollof Rice & Chicken', 'food', 1500, 30, -50, false, 'Hot smokey party jollof with fried chicken'),
  ('Cold Pure Water', 'drink', 100, 10, -15, false, 'Chilled sachet water to quench thirst'),
  ('Molue Transit Ticket', 'transport', 300, -5, 0, false, 'Bus fare ticket for quick transit across town'),
  ('Work Boots', 'tool', 4500, 0, 0, true, 'Durable boots suitable for market and construction work')
ON CONFLICT (name) DO NOTHING;

-- 5. Enhanced atomic transfer function with polymorphic entities and idempotency check
CREATE OR REPLACE FUNCTION public.eco_transfer_funds(
  p_from_id         uuid,
  p_to_id           uuid,
  p_amount          numeric,
  p_source_type     text,
  p_source_id       uuid,
  p_reason          text,
  p_idempotency_key uuid,
  p_game_timestamp  timestamptz,
  p_from_type       text DEFAULT 'character',
  p_to_type         text DEFAULT 'character'
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_txn_id uuid;
  v_from_balance numeric;
  v_to_balance numeric;
BEGIN
  -- 1. Strict Idempotency Check: if transaction key already exists, return existing transaction info
  IF EXISTS (SELECT 1 FROM public.eco_transaction WHERE idempotency_key = p_idempotency_key) THEN
    SELECT id INTO v_txn_id FROM public.eco_transaction WHERE idempotency_key = p_idempotency_key;
    RETURN json_build_object(
      'status', 'idempotent_replay',
      'transaction_id', v_txn_id,
      'amount', p_amount
    )::jsonb;
  END IF;

  -- 2. Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount: amount must be strictly greater than 0';
  END IF;

  -- 3. Atomic Debit (if from_id is not null)
  IF p_from_id IS NOT NULL THEN
    -- Lock and check wallet with atomic check
    UPDATE public.eco_wallet
    SET balance = balance - p_amount, updated_at = now()
    WHERE character_id = p_from_id AND balance >= p_amount
    RETURNING balance INTO v_from_balance;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'insufficient_funds';
    END IF;
  END IF;

  -- 4. Atomic Credit (if to_id is not null)
  IF p_to_id IS NOT NULL THEN
    INSERT INTO public.eco_wallet (character_id, owner_type, balance, currency, updated_at)
    VALUES (p_to_id, p_to_type, p_amount, 'NGN', now())
    ON CONFLICT (character_id)
    DO UPDATE SET balance = eco_wallet.balance + p_amount, updated_at = now()
    RETURNING balance INTO v_to_balance;
  END IF;

  -- 5. Record immutable ledger entry in eco_transaction
  v_txn_id := gen_random_uuid();
  INSERT INTO public.eco_transaction (
    id, from_id, to_id, amount, currency,
    source_type, source_id, reason,
    idempotency_key, game_timestamp, created_at,
    from_type, to_type
  ) VALUES (
    v_txn_id, p_from_id, p_to_id, p_amount, 'NGN',
    p_source_type, p_source_id, p_reason,
    p_idempotency_key, p_game_timestamp, now(),
    p_from_type, p_to_type
  );

  RETURN json_build_object(
    'status', 'success',
    'transaction_id', v_txn_id,
    'amount', p_amount,
    'from_balance', v_from_balance,
    'to_balance', v_to_balance
  )::jsonb;
END;
$$;

COMMENT ON TABLE eco_item_catalog IS 'Authoritative catalog of consumable and purchasable items in the economy.';
COMMENT ON FUNCTION public.eco_transfer_funds IS 'Authoritative atomic fund transfer with idempotency, row-level locking, and ledger recording.';
