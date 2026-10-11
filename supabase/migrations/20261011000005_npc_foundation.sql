-- ============================================================================
-- Migration: 20261011000005_npc_foundation.sql
-- Description: Establishes the NPC character records, roles, deterministic schedules,
--              work profiles, and initial neighbourhood seed characters for Otigba Street.
-- ============================================================================

-- 1. NPC Profile & Scheduled Routine Table
CREATE TABLE IF NOT EXISTS npc_profile (
  character_id      uuid PRIMARY KEY REFERENCES chr_character(id) ON DELETE CASCADE,
  role              text NOT NULL CHECK (role IN ('food_vendor', 'transport_rider', 'community_patrol', 'artisan', 'trader')),
  schedule_type     text NOT NULL DEFAULT 'standard_shift',
  home_venue_id     uuid REFERENCES phys_venue(id) ON DELETE SET NULL,
  work_venue_id     uuid REFERENCES phys_venue(id) ON DELETE SET NULL,
  current_activity  text NOT NULL DEFAULT 'idle' CHECK (current_activity IN ('sleeping', 'commuting', 'working', 'eating', 'socializing', 'patrolling', 'idle')),
  routine           jsonb NOT NULL DEFAULT '[]',
  dialogue          jsonb NOT NULL DEFAULT '{}',
  metadata          jsonb NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- RLS: Publicly readable so clients and simulation can read NPC roles & active state
ALTER TABLE npc_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_npc_profile_read" ON npc_profile;
CREATE POLICY "public_npc_profile_read" ON npc_profile FOR SELECT USING (true);

-- No public insert/update/delete policies; only authoritative service-role writes allowed.

-- 2. Seed Initial Otigba Street NPC Trio
DO $$
DECLARE
  v_zone_id uuid;
  v_bukka_venue_id uuid;
  v_junction_venue_id uuid;
  v_plaza_venue_id uuid;
  
  v_mama_id uuid := '00000000-0000-0000-0000-0000000000a1'::uuid;
  v_musbau_id uuid := '00000000-0000-0000-0000-0000000000a2'::uuid;
  v_danladi_id uuid := '00000000-0000-0000-0000-0000000000a3'::uuid;
BEGIN
  -- Look up existing venues & zone seeded in migration 20261010000003
  SELECT id INTO v_zone_id FROM geo_location WHERE slug = 'otigba-street' LIMIT 1;
  SELECT id INTO v_bukka_venue_id FROM phys_venue WHERE name = 'Mama Put Otigba' LIMIT 1;
  SELECT id INTO v_junction_venue_id FROM phys_venue WHERE name = 'Otigba Junction' LIMIT 1;
  SELECT id INTO v_plaza_venue_id FROM phys_venue WHERE name = 'Emeka Phones & Accessories' LIMIT 1;

  -- Fallbacks if venues not yet created
  IF v_bukka_venue_id IS NULL THEN
    v_bukka_venue_id := gen_random_uuid();
    INSERT INTO phys_venue (id, zone_id, name, type, capacity)
    VALUES (v_bukka_venue_id, v_zone_id, 'Mama Put Otigba', 'restaurant', 25)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_junction_venue_id IS NULL THEN
    v_junction_venue_id := gen_random_uuid();
    INSERT INTO phys_venue (id, zone_id, name, type, capacity)
    VALUES (v_junction_venue_id, v_zone_id, 'Otigba Junction', 'public_space', 100)
    ON CONFLICT DO NOTHING;
  END IF;

  -- -------------------------------------------------------------------------
  -- NPC 1: Mama Nkechi (Food Vendor / Bukka Owner)
  -- -------------------------------------------------------------------------
  INSERT INTO chr_character (id, account_id, is_npc, display_name, bio, status)
  VALUES (
    v_mama_id,
    NULL,
    true,
    'Mama Nkechi (Chinyere Okonkwo)',
    'Beloved owner and chief cook of Mama Put Otigba. Feeds Computer Village with hot smoky jollof and plantain.',
    'alive'
  ) ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, bio = EXCLUDED.bio;

  INSERT INTO chr_character_state (character_id, location_id, venue_id, status)
  VALUES (v_mama_id, v_zone_id, v_bukka_venue_id, 'active')
  ON CONFLICT (character_id) DO UPDATE SET venue_id = EXCLUDED.venue_id;

  INSERT INTO chr_character_stats (character_id, energy, hunger, health, job_title)
  VALUES (v_mama_id, 95, 10, 100, 'Bukka Proprietress')
  ON CONFLICT (character_id) DO NOTHING;

  INSERT INTO eco_wallet (id, character_id, owner_type, balance, currency)
  VALUES ('00000000-0000-0000-0000-0000000000b1'::uuid, v_mama_id, 'character', 25000, 'NGN')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO npc_profile (
    character_id, role, schedule_type, home_venue_id, work_venue_id, current_activity,
    routine, dialogue, metadata
  ) VALUES (
    v_mama_id,
    'food_vendor',
    'standard_shift',
    v_bukka_venue_id,
    v_bukka_venue_id,
    'working',
    '[
      {"startHour": 0, "endHour": 6, "activity": "sleeping", "venueName": "Mama Put Otigba"},
      {"startHour": 6, "endHour": 8, "activity": "commuting", "venueName": "Mama Put Otigba"},
      {"startHour": 8, "endHour": 13, "activity": "working", "venueName": "Mama Put Otigba", "actionHint": "cooking_serving"},
      {"startHour": 13, "endHour": 14, "activity": "eating", "venueName": "Mama Put Otigba", "actionHint": "lunch_break"},
      {"startHour": 14, "endHour": 18, "activity": "working", "venueName": "Mama Put Otigba", "actionHint": "cooking_serving"},
      {"startHour": 18, "endHour": 21, "activity": "socializing", "venueName": "Otigba Junction", "actionHint": "market_banter"},
      {"startHour": 21, "endHour": 24, "activity": "sleeping", "venueName": "Mama Put Otigba"}
    ]'::jsonb,
    '{
      "greeting": ["Welcome, my customer! Hot jollof with fried dodo dey!", "Oya sit down, make I serve you proper food."],
      "farewell": ["Thank you o! Greet your people for me!", "Come back tomorrow o!"],
      "busy": ["Wait small, dodo still dey for fire."]
    }'::jsonb,
    '{"specialtyItem": "Jollof Rice & Chicken", "cookSkill": 85}'::jsonb
  ) ON CONFLICT (character_id) DO UPDATE SET
    role = EXCLUDED.role,
    routine = EXCLUDED.routine,
    dialogue = EXCLUDED.dialogue;

  -- -------------------------------------------------------------------------
  -- NPC 2: Baba Musbau (Keke Napep / Transport Rider)
  -- -------------------------------------------------------------------------
  INSERT INTO chr_character (id, account_id, is_npc, display_name, bio, status)
  VALUES (
    v_musbau_id,
    NULL,
    true,
    'Baba Musbau (Musbau Alabi)',
    'Veteran Keke Napep rider shuttling commuters between Otigba Junction and Ikeja Along.',
    'alive'
  ) ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, bio = EXCLUDED.bio;

  INSERT INTO chr_character_state (character_id, location_id, venue_id, status)
  VALUES (v_musbau_id, v_zone_id, v_junction_venue_id, 'active')
  ON CONFLICT (character_id) DO UPDATE SET venue_id = EXCLUDED.venue_id;

  INSERT INTO chr_character_stats (character_id, energy, hunger, health, job_title)
  VALUES (v_musbau_id, 90, 25, 95, 'Keke Napep Rider')
  ON CONFLICT (character_id) DO NOTHING;

  INSERT INTO eco_wallet (id, character_id, owner_type, balance, currency)
  VALUES ('00000000-0000-0000-0000-0000000000b2'::uuid, v_musbau_id, 'character', 5000, 'NGN')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO npc_profile (
    character_id, role, schedule_type, home_venue_id, work_venue_id, current_activity,
    routine, dialogue, metadata
  ) VALUES (
    v_musbau_id,
    'transport_rider',
    'standard_shift',
    v_junction_venue_id,
    v_junction_venue_id,
    'working',
    '[
      {"startHour": 0, "endHour": 6, "activity": "sleeping", "venueName": "Otigba Junction"},
      {"startHour": 6, "endHour": 7, "activity": "commuting", "venueName": "Otigba Junction"},
      {"startHour": 7, "endHour": 13, "activity": "working", "venueName": "Otigba Junction", "actionHint": "shuttling_passengers"},
      {"startHour": 13, "endHour": 14, "activity": "eating", "venueName": "Mama Put Otigba", "actionHint": "buy_lunch"},
      {"startHour": 14, "endHour": 18, "activity": "working", "venueName": "Otigba Junction", "actionHint": "shuttling_passengers"},
      {"startHour": 18, "endHour": 21, "activity": "socializing", "venueName": "Otigba Junction", "actionHint": "union_banter"},
      {"startHour": 21, "endHour": 24, "activity": "sleeping", "venueName": "Otigba Junction"}
    ]'::jsonb,
    '{
      "greeting": ["Otigba straight! Enter with your change o!", "Bros, na 300 naira per drop."],
      "farewell": ["Drop gently o, hold your phone tight!", "Safe journey!"],
      "busy": ["Only one space left, enter sharp-sharp!"]
    }'::jsonb,
    '{"vehicleType": "keke_napep", "tripsCompleted": 14}'::jsonb
  ) ON CONFLICT (character_id) DO UPDATE SET
    role = EXCLUDED.role,
    routine = EXCLUDED.routine,
    dialogue = EXCLUDED.dialogue;

  -- -------------------------------------------------------------------------
  -- NPC 3: Officer Danladi (Neighbourhood Community Patrol / Security)
  -- -------------------------------------------------------------------------
  INSERT INTO chr_character (id, account_id, is_npc, display_name, bio, status)
  VALUES (
    v_danladi_id,
    NULL,
    true,
    'Officer Danladi (Danladi Garba)',
    'Disciplined community watchman who knows every shop owner and keeps Otigba safe and peaceful.',
    'alive'
  ) ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, bio = EXCLUDED.bio;

  INSERT INTO chr_character_state (character_id, location_id, venue_id, status)
  VALUES (v_danladi_id, v_zone_id, v_junction_venue_id, 'active')
  ON CONFLICT (character_id) DO UPDATE SET venue_id = EXCLUDED.venue_id;

  INSERT INTO chr_character_stats (character_id, energy, hunger, health, job_title)
  VALUES (v_danladi_id, 100, 15, 100, 'Community Security Watch')
  ON CONFLICT (character_id) DO NOTHING;

  INSERT INTO eco_wallet (id, character_id, owner_type, balance, currency)
  VALUES ('00000000-0000-0000-0000-0000000000b3'::uuid, v_danladi_id, 'character', 8000, 'NGN')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO npc_profile (
    character_id, role, schedule_type, home_venue_id, work_venue_id, current_activity,
    routine, dialogue, metadata
  ) VALUES (
    v_danladi_id,
    'community_patrol',
    'standard_shift',
    v_junction_venue_id,
    v_junction_venue_id,
    'patrolling',
    '[
      {"startHour": 0, "endHour": 7, "activity": "sleeping", "venueName": "Otigba Junction"},
      {"startHour": 7, "endHour": 8, "activity": "commuting", "venueName": "Otigba Junction"},
      {"startHour": 8, "endHour": 12, "activity": "patrolling", "venueName": "Otigba Junction", "actionHint": "street_patrol"},
      {"startHour": 12, "endHour": 13, "activity": "patrolling", "venueName": "Mama Put Otigba", "actionHint": "security_checkin"},
      {"startHour": 13, "endHour": 14, "activity": "eating", "venueName": "Mama Put Otigba", "actionHint": "afternoon_break"},
      {"startHour": 14, "endHour": 18, "activity": "patrolling", "venueName": "Otigba Junction", "actionHint": "plaza_patrol"},
      {"startHour": 18, "endHour": 20, "activity": "socializing", "venueName": "Otigba Junction", "actionHint": "evening_briefing"},
      {"startHour": 20, "endHour": 24, "activity": "sleeping", "venueName": "Otigba Junction"}
    ]'::jsonb,
    '{
      "greeting": ["Good day my brother. Everything calm for here.", "Peace and order must reign for Otigba street."],
      "farewell": ["Stay vigilant. Report any funny movement.", "Take care of yourself."],
      "busy": ["Routine check, continue your business."]
    }'::jsonb,
    '{"vigilanceRating": 90, "badgeNumber": "CP-402"}'::jsonb
  ) ON CONFLICT (character_id) DO UPDATE SET
    role = EXCLUDED.role,
    routine = EXCLUDED.routine,
    dialogue = EXCLUDED.dialogue;

END $$;
