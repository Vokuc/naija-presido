-- ============================================================================
-- Migration: 20261011000001_event_history_foundation.sql
-- Description: Enhances the evt_event and evt_effect tables for the hybrid
--              domain event foundation. Supports durable historical storytelling,
--              institutional memory, causal chains, and tiered retention.
-- ============================================================================

-- 1. Add retention tier and actor type to evt_event if not present
ALTER TABLE evt_event
  ADD COLUMN IF NOT EXISTS retention_tier text NOT NULL DEFAULT 'standard'
    CHECK (retention_tier IN ('ephemeral', 'standard', 'permanent')),
  ADD COLUMN IF NOT EXISTS actor_type text NOT NULL DEFAULT 'character'
    CHECK (actor_type IN ('character', 'account', 'system', 'organization'));

-- 2. Performance indexes for institutional memory and historical storytelling queries

-- Chronological timeline of the world in game time
CREATE INDEX IF NOT EXISTS idx_evt_event_game_timestamp
  ON evt_event(game_timestamp DESC);

-- Historical storytelling by significance (e.g., all historic / significant events for newspapers/chronicles)
CREATE INDEX IF NOT EXISTS idx_evt_event_significance_game_time
  ON evt_event(significance, game_timestamp DESC);

-- Query events by type across game time (e.g., all elections, property purchases, policy enactments)
CREATE INDEX IF NOT EXISTS idx_evt_event_type_game_time
  ON evt_event(type, game_timestamp DESC);

-- Character biographical timeline (life events in game time order)
CREATE INDEX IF NOT EXISTS idx_evt_event_actor_game_time
  ON evt_event(actor_id, game_timestamp DESC);

-- Location institutional memory (what happened at this neighbourhood/zone)
CREATE INDEX IF NOT EXISTS idx_evt_event_location_game_time
  ON evt_event(location_id, game_timestamp DESC);

-- Venue institutional memory (what happened at this specific venue)
CREATE INDEX IF NOT EXISTS idx_evt_event_venue_game_time
  ON evt_event(venue_id, game_timestamp DESC);

-- Causal graph traversal (tracing parent/caused_by event relationships)
CREATE INDEX IF NOT EXISTS idx_evt_event_caused_by
  ON evt_event(caused_by);

-- Retention maintenance (pruning or archiving ephemeral events by real time age)
CREATE INDEX IF NOT EXISTS idx_evt_event_retention
  ON evt_event(retention_tier, created_at);

-- 3. Indexes on evt_effect for polymorphic entity history lookup
CREATE INDEX IF NOT EXISTS idx_evt_effect_event_id
  ON evt_effect(event_id);

CREATE INDEX IF NOT EXISTS idx_evt_effect_target_applied
  ON evt_effect(target_type, target_id, applied_at DESC);

-- 4. Comments documenting the hybrid architectural purpose
COMMENT ON TABLE evt_event IS 'Authoritative immutable log of meaningful world events for institutional memory, storytelling, and audit trails. Fast current state remains in mutable gameplay tables.';
COMMENT ON TABLE evt_effect IS 'Polymorphic ledger of entity-level attribute mutations resulting from an event.';
COMMENT ON COLUMN evt_event.retention_tier IS 'ephemeral (short retention, e.g. movement), standard (daily interactions), permanent (historic institutional memory: elections, laws, businesses).';
COMMENT ON COLUMN evt_event.caused_by IS 'Pointer to parent event that triggered this event, forming a causal graph.';
