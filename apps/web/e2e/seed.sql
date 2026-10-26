-- Minimal data for the Playwright smoke tests. Run after migrations and the states seed,
-- and before `next build`: Cache Components prerender pages with whatever is in the database.
-- Idempotent, so it can be re-run against a local database.

INSERT INTO events (id, format, name, rank) VALUES
  ('333', 'time', '3x3x3 Cube', 10),
  ('222', 'time', '2x2x2 Cube', 20)
ON CONFLICT (id) DO NOTHING;

INSERT INTO round_types (id, name, cell_name, final, rank) VALUES
  ('f', 'Final', 'Final', true, 100)
ON CONFLICT (id) DO NOTHING;

INSERT INTO persons (wca_id, name, gender, state_id) VALUES
  ('2099SMOK01', 'Ana Smoke', 'f', 'JAL'),
  ('2099SMOK02', 'Beto Smoke', 'm', 'CMX')
ON CONFLICT (wca_id) DO NOTHING;

INSERT INTO teams (state_id, name) VALUES
  ('JAL', 'Cubing Jalisco')
ON CONFLICT (state_id) DO NOTHING;

INSERT INTO competitions (id, name, venue, city_name, country_id, state_id, cell_name, start_date, end_date) VALUES
  ('SmokeOpen2024', 'Smoke Open 2024', 'Venue', 'Guadalajara, Jalisco', 'Mexico', 'JAL', 'Smoke Open 2024',
   '2024-06-01', '2024-06-01')
ON CONFLICT (id) DO NOTHING;

INSERT INTO results (id, competition_id, event_id, person_id, format_id, round_type_id, pos, best, average) VALUES
  ('smoke-1', 'SmokeOpen2024', '333', '2099SMOK01', 'a', 'f', 1, 845, 932),
  ('smoke-2', 'SmokeOpen2024', '333', '2099SMOK02', 'a', 'f', 2, 1012, 1150),
  ('smoke-3', 'SmokeOpen2024', '222', '2099SMOK01', 'a', 'f', 1, 201, 288)
ON CONFLICT (id) DO NOTHING;

INSERT INTO ranks_single (person_id, event_id, best, world_rank, continent_rank, country_rank, state_rank) VALUES
  ('2099SMOK01', '333', 845, 1000, 100, 1, 1),
  ('2099SMOK02', '333', 1012, 2000, 200, 2, 1),
  ('2099SMOK01', '222', 201, 900, 90, 1, 1)
ON CONFLICT DO NOTHING;

INSERT INTO ranks_average (person_id, event_id, best, world_rank, continent_rank, country_rank, state_rank) VALUES
  ('2099SMOK01', '333', 932, 1000, 100, 1, 1),
  ('2099SMOK02', '333', 1150, 2000, 200, 2, 1)
ON CONFLICT DO NOTHING;
