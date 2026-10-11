-- ============================================================================
-- Migration: 20261011000006_port_harcourt_geography_npc.sql
-- Description: Establishes Port Harcourt (Rivers State) as the canonical game setting.
--              Seeds Port Harcourt geography, D-Line neighborhood, Olu Obasanjo Road,
--              venues (Bole joints, Keke park, Plaza), and configures Port Harcourt NPCs.
-- ============================================================================

-- 1. Seed Port Harcourt Geography and Physical World
DO $$
DECLARE
  v_country_id uuid;
  v_state_id uuid := '10000000-0000-0000-0000-000000000001'::uuid;
  v_city_id uuid := '10000000-0000-0000-0000-000000000002'::uuid;
  v_hood_id uuid := '10000000-0000-0000-0000-000000000003'::uuid;
  v_zone_id uuid := '10000000-0000-0000-0000-000000000004'::uuid;

  v_plot_id uuid := '10000000-0000-0000-0000-000000000010'::uuid;
  v_bldg_id uuid := '10000000-0000-0000-0000-000000000011'::uuid;
  v_floor_id uuid := '10000000-0000-0000-0000-000000000012'::uuid;
  v_room_id uuid := '10000000-0000-0000-0000-000000000013'::uuid;

  v_bole_venue_id uuid := '10000000-0000-0000-0000-000000000021'::uuid;
  v_junction_venue_id uuid := '10000000-0000-0000-0000-000000000022'::uuid;
  v_tech_venue_id uuid := '10000000-0000-0000-0000-000000000023'::uuid;

  v_mama_id uuid := '00000000-0000-0000-0000-0000000000a1'::uuid;
  v_tamuno_id uuid := '00000000-0000-0000-0000-0000000000a2'::uuid;
  v_friday_id uuid := '00000000-0000-0000-0000-0000000000a3'::uuid;
BEGIN
  -- Look up Nigeria country ID or fallback
  SELECT id INTO v_country_id FROM geo_location WHERE type = 'country' AND slug = 'ng' LIMIT 1;
  IF v_country_id IS NULL THEN
    v_country_id := gen_random_uuid();
    INSERT INTO geo_location (id, parent_id, type, name, slug)
    VALUES (v_country_id, NULL, 'country', 'Nigeria', 'ng')
    ON CONFLICT (slug) DO NOTHING;
  END IF;

  -- 1. Insert Rivers State -> Port Harcourt -> D-Line -> Olu Obasanjo Road
  INSERT INTO geo_location (id, parent_id, type, name, slug)
  VALUES (v_state_id, v_country_id, 'state', 'Rivers State', 'ng-ri')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

  INSERT INTO geo_location (id, parent_id, type, name, slug)
  VALUES (v_city_id, v_state_id, 'city', 'Port Harcourt', 'ng-ri-ph')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

  INSERT INTO geo_location (id, parent_id, type, name, slug)
  VALUES (v_hood_id, v_city_id, 'neighbourhood', 'D-Line', 'ph-d-line')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

  INSERT INTO geo_location (id, parent_id, type, name, slug)
  VALUES (v_zone_id, v_hood_id, 'zone', 'Olu Obasanjo Road', 'ph-olu-obasanjo-road')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

  -- 2. Physical hierarchy in Port Harcourt
  INSERT INTO phys_plot (id, zone_id, name)
  VALUES (v_plot_id, v_zone_id, 'Plot 12, Olu Obasanjo Road')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  INSERT INTO phys_building (id, plot_id, name, type)
  VALUES (v_bldg_id, v_plot_id, 'Garden City Plaza', 'commercial')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  INSERT INTO phys_floor (id, building_id, level, name)
  VALUES (v_floor_id, v_bldg_id, 1, 'Ground Floor')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  INSERT INTO phys_room (id, floor_id, name, type)
  VALUES (v_room_id, v_floor_id, 'Shop 4B', 'retail_space')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  -- 3. Port Harcourt Venues
  -- Venue 1: Mama Tarila Bole Joint (Iconic Port Harcourt Roasted Plantain & Fish)
  INSERT INTO phys_venue (id, zone_id, plot_id, name, type, capacity)
  VALUES (v_bole_venue_id, v_zone_id, v_plot_id, 'Mama Tarila Bole Joint', 'restaurant', 35)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, zone_id = EXCLUDED.zone_id;

  -- Venue 2: Garrison Junction Keke Park (Bustling transport and junction hub)
  INSERT INTO phys_venue (id, zone_id, name, type, capacity)
  VALUES (v_junction_venue_id, v_zone_id, 'Garrison Junction Keke Park', 'public_space', 120)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, zone_id = EXCLUDED.zone_id;

  -- Venue 3: Garden City Tech & Gadgets (Tech retail shop)
  INSERT INTO phys_venue (id, zone_id, room_id, building_id, plot_id, name, type, capacity)
  VALUES (v_tech_venue_id, v_zone_id, v_room_id, v_bldg_id, v_plot_id, 'Garden City Tech & Gadgets', 'shop', 15)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, zone_id = EXCLUDED.zone_id;

  -- 4. Port Harcourt Authentic Food & Drink Catalog
  INSERT INTO eco_item_catalog (name, category, price, energy_delta, hunger_delta, is_durable, description)
  VALUES
    ('Port Harcourt Bole & Fish', 'food', 1500, 35, -50, false, 'Famous Port Harcourt roasted plantain, dry spicy croaker fish, and palm oil pepper sauce'),
    ('Cold Zobo Drink', 'drink', 200, 15, -20, false, 'Chilled spicy ginger zobo drink to cool down from the Port Harcourt sun'),
    ('Keke Transit Ticket', 'transport', 200, -5, 0, false, 'Standard Keke Napep fare along Olu Obasanjo Road to Garrison')
  ON CONFLICT (name) DO UPDATE SET
    price = EXCLUDED.price,
    energy_delta = EXCLUDED.energy_delta,
    hunger_delta = EXCLUDED.hunger_delta,
    description = EXCLUDED.description;

  -- 5. Seed / Update Port Harcourt NPCs
  -- NPC 1: Mama Tarila (Food Vendor / Bole Queen)
  INSERT INTO chr_character (id, account_id, is_npc, display_name, bio, status)
  VALUES (
    v_mama_id,
    NULL,
    true,
    'Mama Tarila (Tarilaere Briggs)',
    'The undisputed Bole queen of D-Line, Port Harcourt. Serves hot roasted plantain, pepper sauce, and spicy croaker fish.',
    'alive'
  ) ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, bio = EXCLUDED.bio;

  INSERT INTO chr_character_state (character_id, location_id, venue_id, status)
  VALUES (v_mama_id, v_zone_id, v_bole_venue_id, 'active')
  ON CONFLICT (character_id) DO UPDATE SET location_id = EXCLUDED.location_id, venue_id = EXCLUDED.venue_id;

  INSERT INTO chr_character_stats (character_id, energy, hunger, health, job_title)
  VALUES (v_mama_id, 95, 10, 100, 'Bole & Fish Proprietress')
  ON CONFLICT (character_id) DO UPDATE SET job_title = EXCLUDED.job_title;

  INSERT INTO npc_profile (
    character_id, role, schedule_type, home_venue_id, work_venue_id, current_activity,
    routine, dialogue, metadata
  ) VALUES (
    v_mama_id,
    'food_vendor',
    'standard_shift',
    v_bole_venue_id,
    v_bole_venue_id,
    'working',
    '[
      {"startHour": 0, "endHour": 6, "activity": "sleeping", "venueName": "Mama Tarila Bole Joint"},
      {"startHour": 6, "endHour": 8, "activity": "commuting", "venueName": "Mama Tarila Bole Joint", "actionHint": "roasting_plantain"},
      {"startHour": 8, "endHour": 13, "activity": "working", "venueName": "Mama Tarila Bole Joint", "actionHint": "serving_bole_and_fish"},
      {"startHour": 13, "endHour": 14, "activity": "eating", "venueName": "Mama Tarila Bole Joint", "actionHint": "lunch_break"},
      {"startHour": 14, "endHour": 18, "activity": "working", "venueName": "Mama Tarila Bole Joint", "actionHint": "evening_rush"},
      {"startHour": 18, "endHour": 21, "activity": "socializing", "venueName": "Garrison Junction Keke Park", "actionHint": "dline_banter"},
      {"startHour": 21, "endHour": 24, "activity": "sleeping", "venueName": "Mama Tarila Bole Joint"}
    ]'::jsonb,
    '{
      "greeting": ["Welcome, my person! Correct Port Harcourt Bole and fish dey hot!", "Oya sit down make I serve you better plantain with spicy sauce."],
      "farewell": ["Thank you o! Greet everybody for your yard!", "Come back tomorrow with your friends!"],
      "buy_food": ["Take your hot Bole and fresh croaker fish. Enjoy am!"],
      "busy": ["Wait small, fish still dey ontop grill."]
    }'::jsonb,
    '{"specialtyItem": "Port Harcourt Bole & Fish", "cookSkill": 92, "city": "Port Harcourt"}'::jsonb
  ) ON CONFLICT (character_id) DO UPDATE SET
    role = EXCLUDED.role,
    home_venue_id = EXCLUDED.home_venue_id,
    work_venue_id = EXCLUDED.work_venue_id,
    routine = EXCLUDED.routine,
    dialogue = EXCLUDED.dialogue,
    metadata = EXCLUDED.metadata;

  -- NPC 2: Elder Tamuno (Commercial Keke Operator)
  INSERT INTO chr_character (id, account_id, is_npc, display_name, bio, status)
  VALUES (
    v_tamuno_id,
    NULL,
    true,
    'Elder Tamuno (Tamunominabo Peters)',
    'Veteran Keke Napep operator in Port Harcourt, shuttling commuters between Garrison Junction, Olu Obasanjo Road, and Waterlines.',
    'alive'
  ) ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, bio = EXCLUDED.bio;

  INSERT INTO chr_character_state (character_id, location_id, venue_id, status)
  VALUES (v_tamuno_id, v_zone_id, v_junction_venue_id, 'active')
  ON CONFLICT (character_id) DO UPDATE SET location_id = EXCLUDED.location_id, venue_id = EXCLUDED.venue_id;

  INSERT INTO chr_character_stats (character_id, energy, hunger, health, job_title)
  VALUES (v_tamuno_id, 90, 25, 95, 'Commercial Keke Operator')
  ON CONFLICT (character_id) DO UPDATE SET job_title = EXCLUDED.job_title;

  INSERT INTO npc_profile (
    character_id, role, schedule_type, home_venue_id, work_venue_id, current_activity,
    routine, dialogue, metadata
  ) VALUES (
    v_tamuno_id,
    'transport_rider',
    'standard_shift',
    v_junction_venue_id,
    v_junction_venue_id,
    'working',
    '[
      {"startHour": 0, "endHour": 6, "activity": "sleeping", "venueName": "Garrison Junction Keke Park"},
      {"startHour": 6, "endHour": 7, "activity": "commuting", "venueName": "Garrison Junction Keke Park"},
      {"startHour": 7, "endHour": 13, "activity": "working", "venueName": "Garrison Junction Keke Park", "actionHint": "shuttling_dline"},
      {"startHour": 13, "endHour": 14, "activity": "eating", "venueName": "Mama Tarila Bole Joint", "actionHint": "buy_bole_lunch"},
      {"startHour": 14, "endHour": 18, "activity": "working", "venueName": "Garrison Junction Keke Park", "actionHint": "waterlines_runs"},
      {"startHour": 18, "endHour": 21, "activity": "socializing", "venueName": "Garrison Junction Keke Park", "actionHint": "union_banter"},
      {"startHour": 21, "endHour": 24, "activity": "sleeping", "venueName": "Garrison Junction Keke Park"}
    ]'::jsonb,
    '{
      "greeting": ["Waterlines straight! 200 naira per drop!", "Garrison inside! Enter with your change o!"],
      "farewell": ["Drop gently o, hold your phone tight!", "Safe journey, my brother!"],
      "request_ride": ["Enter front seat make we move!"],
      "busy": ["Only one space left, enter sharp-sharp!"]
    }'::jsonb,
    '{"vehicleType": "keke_napep", "tripsCompleted": 28, "city": "Port Harcourt"}'::jsonb
  ) ON CONFLICT (character_id) DO UPDATE SET
    role = EXCLUDED.role,
    home_venue_id = EXCLUDED.home_venue_id,
    work_venue_id = EXCLUDED.work_venue_id,
    routine = EXCLUDED.routine,
    dialogue = EXCLUDED.dialogue,
    metadata = EXCLUDED.metadata;

  -- NPC 3: Inspector Friday (Community Patrol / Garden City Watch)
  INSERT INTO chr_character (id, account_id, is_npc, display_name, bio, status)
  VALUES (
    v_friday_id,
    NULL,
    true,
    'Inspector Friday (Friday Amadi)',
    'Disciplined Port Harcourt community safety officer keeping Olu Obasanjo Road and D-Line secure and peaceful.',
    'alive'
  ) ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, bio = EXCLUDED.bio;

  INSERT INTO chr_character_state (character_id, location_id, venue_id, status)
  VALUES (v_friday_id, v_zone_id, v_junction_venue_id, 'active')
  ON CONFLICT (character_id) DO UPDATE SET location_id = EXCLUDED.location_id, venue_id = EXCLUDED.venue_id;

  INSERT INTO chr_character_stats (character_id, energy, hunger, health, job_title)
  VALUES (v_friday_id, 100, 15, 100, 'Community Safety Officer')
  ON CONFLICT (character_id) DO UPDATE SET job_title = EXCLUDED.job_title;

  INSERT INTO npc_profile (
    character_id, role, schedule_type, home_venue_id, work_venue_id, current_activity,
    routine, dialogue, metadata
  ) VALUES (
    v_friday_id,
    'community_patrol',
    'standard_shift',
    v_junction_venue_id,
    v_junction_venue_id,
    'patrolling',
    '[
      {"startHour": 0, "endHour": 7, "activity": "sleeping", "venueName": "Garrison Junction Keke Park"},
      {"startHour": 7, "endHour": 8, "activity": "commuting", "venueName": "Garrison Junction Keke Park"},
      {"startHour": 8, "endHour": 12, "activity": "patrolling", "venueName": "Garrison Junction Keke Park", "actionHint": "junction_patrol"},
      {"startHour": 12, "endHour": 13, "activity": "patrolling", "venueName": "Mama Tarila Bole Joint", "actionHint": "safety_checkin"},
      {"startHour": 13, "endHour": 14, "activity": "eating", "venueName": "Mama Tarila Bole Joint", "actionHint": "bole_break"},
      {"startHour": 14, "endHour": 18, "activity": "patrolling", "venueName": "Garden City Tech & Gadgets", "actionHint": "plaza_security"},
      {"startHour": 18, "endHour": 20, "activity": "socializing", "venueName": "Garrison Junction Keke Park", "actionHint": "evening_briefing"},
      {"startHour": 20, "endHour": 24, "activity": "sleeping", "venueName": "Garrison Junction Keke Park"}
    ]'::jsonb,
    '{
      "greeting": ["Good day my brother. Garden City dey calm and secured.", "Peace and safety na our priority for Port Harcourt."],
      "farewell": ["Stay alert. If you see something, say something.", "Take care of yourself for road."],
      "busy": ["Routine patrol, carry on with your hustle."]
    }'::jsonb,
    '{"vigilanceRating": 92, "badgeNumber": "PH-501", "city": "Port Harcourt"}'::jsonb
  ) ON CONFLICT (character_id) DO UPDATE SET
    role = EXCLUDED.role,
    home_venue_id = EXCLUDED.home_venue_id,
    work_venue_id = EXCLUDED.work_venue_id,
    routine = EXCLUDED.routine,
    dialogue = EXCLUDED.dialogue,
    metadata = EXCLUDED.metadata;

END $$;
