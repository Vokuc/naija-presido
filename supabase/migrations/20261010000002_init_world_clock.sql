-- 20261010000002_init_world_clock.sql
-- Initializes the authoritative world clock for Naija Presido MVP

INSERT INTO wrld_clock (
  epoch_real,
  epoch_game,
  scale_factor,
  paused,
  updated_at
) VALUES (
  now(),
  now(), -- Game time starts at real time initially
  60.0,  -- 60x scale: 1 real minute = 1 game hour
  false,
  now()
) ON CONFLICT DO NOTHING;
