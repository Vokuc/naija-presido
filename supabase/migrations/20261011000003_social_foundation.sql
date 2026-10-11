-- ============================================================================
-- Migration: 20261011000003_social_foundation.sql
-- Description: Establishes the foundational social system for Naija Presido.
--              Enables directional typed relationships, data-driven relationship
--              types and states, and data-driven multi-dimensional scoped reputation.
-- ============================================================================

-- 1. Data-Driven Relationship Types Registry
CREATE TABLE IF NOT EXISTS soc_relationship_type (
  type             text PRIMARY KEY,
  name             text NOT NULL,
  description      text,
  default_strength numeric NOT NULL DEFAULT 0 CHECK (default_strength >= -100 AND default_strength <= 100),
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

INSERT INTO soc_relationship_type (type, name, description, default_strength)
VALUES
  ('friend', 'Friend', 'Mutual positive personal rapport and camaraderie', 25),
  ('rival', 'Rival', 'Competitive tension or rivalry over status, resources, or politics', -15),
  ('colleague', 'Colleague', 'Professional or workplace peer relationship', 10),
  ('ally', 'Political/Strategic Ally', 'Cooperative alignment for mutual social or political goals', 30),
  ('family', 'Kin/Family', 'Extended family or household kinship ties', 50),
  ('enemy', 'Adversary/Enemy', 'Hostile opposition and active distrust', -60),
  ('mentor', 'Mentor/Patron', 'Guidance, apprenticeship, or godfather relationship', 40),
  ('business_partner', 'Business Partner', 'Commercial and economic co-venture relationship', 20)
ON CONFLICT (type) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 2. Relax hardcoded CHECK on soc_relationship.type to allow data-driven types
ALTER TABLE soc_relationship
  DROP CONSTRAINT IF EXISTS soc_relationship_type_check;

ALTER TABLE soc_relationship
  ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'active'
    CHECK (state IN ('active', 'strained', 'dormant', 'broken')),
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}';

-- Performance indexes for directional social graph queries
CREATE INDEX IF NOT EXISTS idx_soc_rel_actor ON soc_relationship(actor_id, type);
CREATE INDEX IF NOT EXISTS idx_soc_rel_target ON soc_relationship(target_id, type);
CREATE INDEX IF NOT EXISTS idx_soc_rel_actor_target ON soc_relationship(actor_id, target_id);

-- 3. Data-Driven Reputation Scopes Registry
CREATE TABLE IF NOT EXISTS soc_reputation_scope (
  scope_type  text PRIMARY KEY,
  name        text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO soc_reputation_scope (scope_type, name, description)
VALUES
  ('neighbourhood', 'Neighbourhood', 'Local grassroots community (e.g. Surulere, Ikeja, Yaba)'),
  ('city', 'City / Town', 'Municipal / metropolitan level (e.g. Lagos, Kano, Port Harcourt)'),
  ('state', 'State', 'State federated level (e.g. Lagos State, Rivers State)'),
  ('national', 'National', 'Federal Nigerian national standing'),
  ('organization', 'Organization', 'Within a specific guild, political party, or enterprise'),
  ('global', 'Global', 'Default baseline world standing')
ON CONFLICT (scope_type) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 4. Data-Driven Reputation Dimensions Registry
CREATE TABLE IF NOT EXISTS soc_reputation_dimension (
  dimension   text PRIMARY KEY,
  name        text NOT NULL,
  description text,
  min_score   numeric NOT NULL DEFAULT -100,
  max_score   numeric NOT NULL DEFAULT 100,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO soc_reputation_dimension (dimension, name, description)
VALUES
  ('trust', 'Trust', 'Perception of reliability and honoring of agreements'),
  ('competence', 'Competence', 'Perception of capability, professional skill, and effectiveness'),
  ('honesty', 'Honesty', 'Reputation for truthfulness and resistance to corruption'),
  ('popularity', 'Popularity', 'Widespread affection, recognition, and crowd appeal'),
  ('notoriety', 'Notoriety', 'Infamy, feared reputation, or association with scandals'),
  ('influence', 'Influence', 'Ability to sway people, institutions, and civic decisions'),
  ('political_credibility', 'Political Credibility', 'Standing among voters, political leaders, and civic groups'),
  ('business_reputation', 'Business Reputation', 'Reliability in commercial deals, creditworthiness, and commerce'),
  ('reliability', 'Reliability', 'Consistency in showing up, keeping appointments, and working')
ON CONFLICT (dimension) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 5. Relax hardcoded CHECK on soc_reputation.dimension and soc_reputation.scope_type
ALTER TABLE soc_reputation
  DROP CONSTRAINT IF EXISTS soc_reputation_dimension_check,
  DROP CONSTRAINT IF EXISTS soc_reputation_scope_type_check;

-- Performance indexes for multi-dimensional and scoped queries
CREATE INDEX IF NOT EXISTS idx_soc_rep_char_dim ON soc_reputation(character_id, dimension);
CREATE INDEX IF NOT EXISTS idx_soc_rep_scope ON soc_reputation(scope_type, scope_id, dimension);
CREATE INDEX IF NOT EXISTS idx_soc_rep_leaderboard ON soc_reputation(scope_type, scope_id, dimension, score DESC);

COMMENT ON TABLE soc_relationship IS 'Directional, typed interpersonal relationships between characters with strength (-100 to 100) and state.';
COMMENT ON TABLE soc_reputation IS 'Multi-dimensional, scoped reputation tracking for characters across dimensions (trust, competence, etc.) and scopes (neighbourhood, state, etc.).';
