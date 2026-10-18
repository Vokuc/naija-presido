-- ============================================================================
-- Migration: 20261018000000_audit_hardening.sql
-- Description: Indexes and constraints introduced as part of the engineering audit.
--              Adds foreign key performance indexes on character accounts,
--              work sessions, and anti-spam domain event lookups.
-- ============================================================================

-- 1. Index on chr_character(account_id) to eliminate full table sequential scans
CREATE INDEX IF NOT EXISTS idx_chr_character_account
  ON chr_character(account_id);

-- 2. Composite index on eco_work_session for active session lookups
CREATE INDEX IF NOT EXISTS idx_eco_work_session_active
  ON eco_work_session(character_id, ended_at_real, employment_id);

-- 3. Composite index on evt_event for anti-spam / cooldown queries
CREATE INDEX IF NOT EXISTS idx_evt_event_actor_type_time
  ON evt_event(actor_id, type, created_at DESC);

COMMENT ON INDEX idx_chr_character_account IS 'Accelerates account character resolution during auth and character selection.';
COMMENT ON INDEX idx_eco_work_session_active IS 'Accelerates active work session lookups preventing duplicate shift starts.';
COMMENT ON INDEX idx_evt_event_actor_type_time IS 'Accelerates social action cooldown and anti-spam verification.';
