-- Optional per-day labels for the public food truck calendar (independent of truck events).
CREATE TABLE IF NOT EXISTS media_food_truck_day_banners (
  id SERIAL PRIMARY KEY,
  banner_date VARCHAR(10) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_truck_day_banner_date ON media_food_truck_day_banners(banner_date);

-- Rollback (run only if removing this feature): DROP TABLE IF EXISTS media_food_truck_day_banners;
