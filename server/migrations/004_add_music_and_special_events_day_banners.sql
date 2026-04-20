-- Per-day banner labels for public Live Music and Special Events calendars (same pattern as food trucks).

CREATE TABLE IF NOT EXISTS media_music_day_banners (
  id SERIAL PRIMARY KEY,
  banner_date VARCHAR(10) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_music_day_banner_date ON media_music_day_banners(banner_date);

CREATE TABLE IF NOT EXISTS media_special_events_day_banners (
  id SERIAL PRIMARY KEY,
  banner_date VARCHAR(10) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_special_events_day_banner_date ON media_special_events_day_banners(banner_date);
