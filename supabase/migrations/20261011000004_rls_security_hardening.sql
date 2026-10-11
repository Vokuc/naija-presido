-- ============================================================================
-- Migration: 20261011000004_rls_security_hardening.sql
-- Description: Enables Row Level Security (RLS) on all remaining unrestricted
--              tables in the economy and social domains. Provides read policies
--              for clients while strictly locking all writes to authoritative
--              server commands (service role).
-- ============================================================================

-- 1. Economy Domain RLS Hardening

-- Asset Registry: Publicly readable so players can see game items and registered assets
ALTER TABLE eco_asset ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_asset_read" ON eco_asset;
CREATE POLICY "public_asset_read" ON eco_asset
  FOR SELECT USING (true);

-- Asset Ownership: Publicly readable so property title and business equity is visible in-world
ALTER TABLE eco_asset_ownership ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_ownership_read" ON eco_asset_ownership;
CREATE POLICY "public_ownership_read" ON eco_asset_ownership
  FOR SELECT USING (true);

-- Employment: Characters can view their own employment records or employees they hired
ALTER TABLE eco_employment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_employment_read" ON eco_employment;
CREATE POLICY "own_employment_read" ON eco_employment
  FOR SELECT USING (
    character_id = public.current_character_id()
    OR (employer_type = 'character' AND employer_id = public.current_character_id())
  );

-- Work Sessions: Characters can only inspect their own work sessions
ALTER TABLE eco_work_session ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_work_session_read" ON eco_work_session;
CREATE POLICY "own_work_session_read" ON eco_work_session
  FOR SELECT USING (character_id = public.current_character_id());

-- Item Catalog: Publicly readable price and catalog data (read-only for clients)
ALTER TABLE eco_item_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_item_catalog_read" ON eco_item_catalog;
CREATE POLICY "public_item_catalog_read" ON eco_item_catalog
  FOR SELECT USING (true);

-- 2. Social Domain Reference Tables RLS Hardening

-- Relationship Types: Publicly readable game dictionary
ALTER TABLE soc_relationship_type ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_rel_type_read" ON soc_relationship_type;
CREATE POLICY "public_rel_type_read" ON soc_relationship_type
  FOR SELECT USING (true);

-- Reputation Dimensions: Publicly readable dimension metadata
ALTER TABLE soc_reputation_dimension ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_rep_dim_read" ON soc_reputation_dimension;
CREATE POLICY "public_rep_dim_read" ON soc_reputation_dimension
  FOR SELECT USING (true);

-- Reputation Scopes: Publicly readable scope metadata
ALTER TABLE soc_reputation_scope ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_rep_scope_read" ON soc_reputation_scope;
CREATE POLICY "public_rep_scope_read" ON soc_reputation_scope
  FOR SELECT USING (true);

-- No INSERT, UPDATE, or DELETE policies are granted to the public/authenticated roles
-- on these tables. All state mutations MUST go through authoritative server commands
-- via the Next.js API (service role).
