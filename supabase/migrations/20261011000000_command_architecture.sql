-- ============================================================================
-- NAIJA PRESIDO — Authoritative Command Architecture Migration
-- Migration: 20261011000000_command_architecture.sql
-- ============================================================================

-- 1. Idempotency storage for consequential & state-changing commands
CREATE TABLE IF NOT EXISTS cmd_idempotency (
  idempotency_key  uuid PRIMARY KEY,
  command_type     text NOT NULL,
  character_id     uuid REFERENCES chr_character(id) ON DELETE SET NULL,
  user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  response_payload jsonb NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_cmd_idempotency_char ON cmd_idempotency(character_id);
CREATE INDEX IF NOT EXISTS idx_cmd_idempotency_expires ON cmd_idempotency(expires_at);

ALTER TABLE cmd_idempotency ENABLE ROW LEVEL SECURITY;
-- Default deny all client direct writes/reads; accessed via server client / service-role.

-- 2. Enhance obs_command_log with character and payload tracking
ALTER TABLE obs_command_log 
  ADD COLUMN IF NOT EXISTS character_id uuid REFERENCES chr_character(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS result_payload jsonb,
  ADD COLUMN IF NOT EXISTS execution_step text DEFAULT 'completed';

CREATE INDEX IF NOT EXISTS idx_obs_cmd_idempotency ON obs_command_log(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_obs_cmd_char ON obs_command_log(character_id, created_at);
