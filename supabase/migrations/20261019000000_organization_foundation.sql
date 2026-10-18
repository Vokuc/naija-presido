-- ============================================================================
-- NAIJA PRESIDO — Stage 1: Organizations & Enterprise Substrate
-- Migration: 20261019000000_organization_foundation.sql
-- Description: Establishes collective institutional entities in Naija Presido:
--              Businesses, Trade Unions, Civic Associations, and Cultural Bodies.
--              Includes membership, hierarchical roles, bylaws, collective treasuries,
--              and commercial enterprise linking.
-- ============================================================================

-- 1. Organizations Table
CREATE TABLE IF NOT EXISTS org_organization (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL UNIQUE,
  slug          text NOT NULL UNIQUE,
  type          text NOT NULL CHECK (type IN (
    'business',
    'trade_union',
    'civic_association',
    'cultural_group',
    'political_party',
    'religious_society'
  )),
  description   text,
  founder_id    uuid REFERENCES chr_character(id) ON DELETE SET NULL,
  location_id   uuid REFERENCES geo_location(id) ON DELETE SET NULL,
  venue_id      uuid REFERENCES phys_venue(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'dissolved')),
  metadata      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_type ON org_organization(type);
CREATE INDEX IF NOT EXISTS idx_org_location ON org_organization(location_id);
CREATE INDEX IF NOT EXISTS idx_org_venue ON org_organization(venue_id);

-- 2. Organization Hierarchical Roles
CREATE TABLE IF NOT EXISTS org_role (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES org_organization(id) ON DELETE CASCADE,
  name          text NOT NULL,
  rank          integer NOT NULL DEFAULT 1 CHECK (rank >= 1 AND rank <= 100),
  permissions   jsonb NOT NULL DEFAULT '{
    "can_hire": false,
    "can_expel": false,
    "can_withdraw": false,
    "can_set_dues": false,
    "can_speak_publicly": false
  }',
  base_salary   numeric NOT NULL DEFAULT 0 CHECK (base_salary >= 0),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_role_name UNIQUE (org_id, name)
);

CREATE INDEX IF NOT EXISTS idx_org_role_org ON org_role(org_id, rank DESC);

-- 3. Organization Membership
CREATE TABLE IF NOT EXISTS org_member (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES org_organization(id) ON DELETE CASCADE,
  character_id      uuid NOT NULL REFERENCES chr_character(id) ON DELETE CASCADE,
  role_id           uuid REFERENCES org_role(id) ON DELETE SET NULL,
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'probation', 'suspended', 'expelled')),
  dues_paid_until   timestamptz,
  reputation_in_org numeric NOT NULL DEFAULT 10 CHECK (reputation_in_org >= -100 AND reputation_in_org <= 100),
  joined_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_character UNIQUE (org_id, character_id)
);

CREATE INDEX IF NOT EXISTS idx_org_member_char ON org_member(character_id, status);
CREATE INDEX IF NOT EXISTS idx_org_member_org ON org_member(org_id, status);

-- 4. Organization Dues & Levy Schedule
CREATE TABLE IF NOT EXISTS org_dues_schedule (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES org_organization(id) ON DELETE CASCADE,
  name          text NOT NULL,
  amount        numeric NOT NULL CHECK (amount >= 0),
  interval_type text NOT NULL CHECK (interval_type IN ('daily', 'weekly', 'monthly', 'per_trip', 'one_off')),
  is_mandatory  boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 5. Seed Canonical Port Harcourt D-Line Organizations & Businesses
-- Mama Tarila Bole Enterprises
INSERT INTO org_organization (id, name, slug, type, description, founder_id, location_id, venue_id)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  'Mama Tarila Bole Enterprises',
  'mama-tarila-bole',
  'business',
  'Port Harcourt food service enterprise specializing in original street-grilled Bole and Fish delicacies.',
  (SELECT id FROM chr_character WHERE id = '00000000-0000-0000-0000-0000000000a1'), -- Mama Tarila
  (SELECT id FROM geo_location WHERE id = '10000000-0000-0000-0000-000000000004'),  -- Olu Obasanjo Road
  (SELECT id FROM phys_venue WHERE id = '10000000-0000-0000-0000-000000000021')    -- Mama Tarila Bole Joint
) ON CONFLICT (id) DO UPDATE SET
  founder_id = EXCLUDED.founder_id,
  location_id = EXCLUDED.location_id,
  venue_id = EXCLUDED.venue_id;

-- Garden City Commercial Ventures Ltd
INSERT INTO org_organization (id, name, slug, type, description, founder_id, location_id, venue_id)
VALUES (
  '20000000-0000-0000-0000-000000000002',
  'Garden City Commercial Ventures Ltd',
  'garden-city-commercial',
  'business',
  'Commercial real estate, retail plaza leasing, and regional logistics warehousing enterprise.',
  NULL,
  (SELECT id FROM geo_location WHERE id = '10000000-0000-0000-0000-000000000004'), -- Olu Obasanjo Road
  (SELECT id FROM phys_venue WHERE id = '10000000-0000-0000-0000-000000000023')    -- Garden City Plaza
) ON CONFLICT (id) DO UPDATE SET
  location_id = EXCLUDED.location_id,
  venue_id = EXCLUDED.venue_id;

-- D-Line Transport & Keke Drivers Union
INSERT INTO org_organization (id, name, slug, type, description, founder_id, location_id, venue_id)
VALUES (
  '20000000-0000-0000-0000-000000000003',
  'D-Line Transport & Keke Drivers Union',
  'dline-keke-union',
  'trade_union',
  'Grassroots union regulating tricycle transit, route allocations, driver welfare, and terminal order across Garrison & Waterlines.',
  (SELECT id FROM chr_character WHERE id = '00000000-0000-0000-0000-0000000000a2'), -- Elder Tamuno
  (SELECT id FROM geo_location WHERE id = '10000000-0000-0000-0000-000000000004'),  -- Olu Obasanjo Road
  (SELECT id FROM phys_venue WHERE id = '10000000-0000-0000-0000-000000000022')    -- Garrison Junction Keke Park
) ON CONFLICT (id) DO UPDATE SET
  founder_id = EXCLUDED.founder_id,
  location_id = EXCLUDED.location_id,
  venue_id = EXCLUDED.venue_id;

-- Olu Obasanjo Road Traders & Landlords Association
INSERT INTO org_organization (id, name, slug, type, description, founder_id, location_id, venue_id)
VALUES (
  '20000000-0000-0000-0000-000000000004',
  'Olu Obasanjo Road Traders & Landlords Association',
  'obasanjo-traders-association',
  'civic_association',
  'Civic association of shop owners, property titleholders, and business operators along Olu Obasanjo Road.',
  NULL,
  (SELECT id FROM geo_location WHERE id = '10000000-0000-0000-0000-000000000004'),
  NULL
) ON CONFLICT (id) DO UPDATE SET
  location_id = EXCLUDED.location_id;

-- Seed Roles for the Keke Union
INSERT INTO org_role (id, org_id, name, rank, permissions, base_salary)
VALUES 
  ('21000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'Unit Chairman', 100, '{"can_hire": true, "can_expel": true, "can_withdraw": true, "can_set_dues": true, "can_speak_publicly": true}', 1500),
  ('21000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', 'Financial Secretary', 80, '{"can_hire": false, "can_expel": false, "can_withdraw": true, "can_set_dues": true, "can_speak_publicly": false}', 1000),
  ('21000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'Terminal Marshal', 50, '{"can_hire": false, "can_expel": false, "can_withdraw": false, "can_set_dues": false, "can_speak_publicly": false}', 750),
  ('21000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000003', 'Registered Driver Member', 10, '{"can_hire": false, "can_expel": false, "can_withdraw": false, "can_set_dues": false, "can_speak_publicly": false}', 0)
ON CONFLICT (id) DO NOTHING;

-- Seed Roles for Traders Association
INSERT INTO org_role (id, org_id, name, rank, permissions, base_salary)
VALUES 
  ('21000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000004', 'President-General', 100, '{"can_hire": true, "can_expel": true, "can_withdraw": true, "can_set_dues": true, "can_speak_publicly": true}', 0),
  ('21000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000004', 'Commercial Member', 10, '{"can_hire": false, "can_expel": false, "can_withdraw": false, "can_set_dues": false, "can_speak_publicly": false}', 0)
ON CONFLICT (id) DO NOTHING;

-- Seed Elder Tamuno as Unit Chairman of Keke Union (only if Elder Tamuno character exists)
INSERT INTO org_member (org_id, character_id, role_id, status, reputation_in_org)
SELECT 
  '20000000-0000-0000-0000-000000000003',
  id,
  '21000000-0000-0000-0000-000000000001', -- Unit Chairman
  'active',
  85
FROM chr_character
WHERE id = '00000000-0000-0000-0000-0000000000a2'
ON CONFLICT (org_id, character_id) DO NOTHING;

-- 6. Support Polymorphic Corporate Wallets
-- Ensure eco_wallet allows corporate/business wallet owners without strict FK on chr_character
ALTER TABLE eco_wallet DROP CONSTRAINT IF EXISTS eco_wallet_character_id_fkey;

-- Provision Institutional Wallets for Seeded Organizations
INSERT INTO eco_wallet (character_id, owner_type, balance, currency, updated_at)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'business', 150000, 'NGN', now()),     -- Mama Tarila Catering
  ('20000000-0000-0000-0000-000000000002', 'business', 1250000, 'NGN', now()),    -- Garden City Commercial Ltd
  ('20000000-0000-0000-0000-000000000003', 'organization', 350000, 'NGN', now()), -- Keke Drivers Union Treasury
  ('20000000-0000-0000-0000-000000000004', 'organization', 480000, 'NGN', now())  -- Traders Association Treasury
ON CONFLICT (character_id) DO UPDATE SET
  balance = EXCLUDED.balance,
  updated_at = now();

-- 7. RLS Hardening for Organizations Domain
ALTER TABLE org_organization ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_org_read" ON org_organization;
CREATE POLICY "public_org_read" ON org_organization FOR SELECT USING (true);

ALTER TABLE org_role ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_org_role_read" ON org_role;
CREATE POLICY "public_org_role_read" ON org_role FOR SELECT USING (true);

ALTER TABLE org_member ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_org_member_read" ON org_member;
CREATE POLICY "public_org_member_read" ON org_member FOR SELECT USING (true);

ALTER TABLE org_dues_schedule ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_org_dues_read" ON org_dues_schedule;
CREATE POLICY "public_org_dues_read" ON org_dues_schedule FOR SELECT USING (true);

COMMENT ON TABLE org_organization IS 'Collective institutional entities: businesses, unions, civic groups, and political parties.';
COMMENT ON TABLE org_role IS 'Hierarchical roles with granular permissions and base stipends within an organization.';
COMMENT ON TABLE org_member IS 'Citizens holding active or probationary membership in an organization.';
