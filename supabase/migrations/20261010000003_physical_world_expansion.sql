-- 20261010000003_physical_world_expansion.sql
-- Expands the Physical World domain and seeds the first slice (Computer Village)

CREATE TABLE phys_plot (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id     uuid NOT NULL REFERENCES geo_location(id),
  name        text NOT NULL,
  metadata    jsonb DEFAULT '{}'
);
ALTER TABLE phys_plot ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_plot_read" ON phys_plot FOR SELECT USING (true);

CREATE TABLE phys_building (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id     uuid NOT NULL REFERENCES phys_plot(id),
  name        text NOT NULL,
  type        text NOT NULL,
  metadata    jsonb DEFAULT '{}'
);
ALTER TABLE phys_building ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_building_read" ON phys_building FOR SELECT USING (true);

CREATE TABLE phys_floor (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES phys_building(id),
  level       integer NOT NULL,
  name        text NOT NULL,
  metadata    jsonb DEFAULT '{}'
);
ALTER TABLE phys_floor ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_floor_read" ON phys_floor FOR SELECT USING (true);

CREATE TABLE phys_room (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id    uuid NOT NULL REFERENCES phys_floor(id),
  name        text NOT NULL,
  type        text NOT NULL,
  metadata    jsonb DEFAULT '{}'
);
ALTER TABLE phys_room ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_room_read" ON phys_room FOR SELECT USING (true);

-- Update phys_venue to optionally reference the specific physical hierarchy
ALTER TABLE phys_venue 
  ADD COLUMN plot_id uuid REFERENCES phys_plot(id),
  ADD COLUMN building_id uuid REFERENCES phys_building(id),
  ADD COLUMN room_id uuid REFERENCES phys_room(id);


-- SEED GEOGRAPHY HIERARCHY
DO $$
DECLARE
  v_world_id uuid := gen_random_uuid();
  v_country_id uuid := gen_random_uuid();
  v_state_id uuid := gen_random_uuid();
  v_city_id uuid := gen_random_uuid();
  v_hood_id uuid := gen_random_uuid();
  v_zone_id uuid := gen_random_uuid();
  
  v_plot_id uuid := gen_random_uuid();
  v_bldg_id uuid := gen_random_uuid();
  v_floor_id uuid := gen_random_uuid();
  v_room_id uuid := gen_random_uuid();
BEGIN
  -- 1. Insert Geography
  INSERT INTO geo_location (id, parent_id, type, name, slug) VALUES 
    (v_world_id, NULL, 'world', 'Earth', 'earth'),
    (v_country_id, v_world_id, 'country', 'Nigeria', 'ng'),
    (v_state_id, v_country_id, 'state', 'Lagos State', 'ng-la'),
    (v_city_id, v_state_id, 'city', 'Ikeja', 'ng-la-ikeja'),
    (v_hood_id, v_city_id, 'neighbourhood', 'Computer Village', 'computer-village'),
    (v_zone_id, v_hood_id, 'zone', 'Otigba Street', 'otigba-street');

  -- 2. Insert Physical World Hierarchy
  INSERT INTO phys_plot (id, zone_id, name) 
    VALUES (v_plot_id, v_zone_id, 'Plot 4, Otigba');
    
  INSERT INTO phys_building (id, plot_id, name, type) 
    VALUES (v_bldg_id, v_plot_id, 'K-Tech Plaza', 'commercial');
    
  INSERT INTO phys_floor (id, building_id, level, name) 
    VALUES (v_floor_id, v_bldg_id, 1, 'Ground Floor');
    
  INSERT INTO phys_room (id, floor_id, name, type) 
    VALUES (v_room_id, v_floor_id, 'Shop G1', 'retail_space');

  -- 3. Insert Venues
  -- Venue 1: A phone shop inside a specific room
  INSERT INTO phys_venue (zone_id, room_id, building_id, plot_id, name, type, capacity)
    VALUES (v_zone_id, v_room_id, v_bldg_id, v_plot_id, 'Emeka Phones & Accessories', 'shop', 10);
    
  -- Venue 2: A Bukka (Restaurant) on the plot but not in the main building
  INSERT INTO phys_venue (zone_id, plot_id, name, type, capacity)
    VALUES (v_zone_id, v_plot_id, 'Mama Put Otigba', 'restaurant', 25);
    
  -- Venue 3: Street Corner (Just tied to the zone)
  INSERT INTO phys_venue (zone_id, name, type, capacity)
    VALUES (v_zone_id, 'Otigba Junction', 'public_space', 100);

END $$;
