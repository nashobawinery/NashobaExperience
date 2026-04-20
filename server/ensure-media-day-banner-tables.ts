import { pool } from "./db";

/**
 * Creates Live Music and Special Events day-banner tables if they are missing.
 * Matches server/migrations/004_add_music_and_special_events_day_banners.sql so
 * environments that never ran the manual migration still work after deploy.
 */
export async function ensureMediaDayBannerTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS media_music_day_banners (
      id SERIAL PRIMARY KEY,
      banner_date VARCHAR(10) NOT NULL UNIQUE,
      label VARCHAR(255) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_music_day_banner_date ON media_music_day_banners(banner_date);`,
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS media_special_events_day_banners (
      id SERIAL PRIMARY KEY,
      banner_date VARCHAR(10) NOT NULL UNIQUE,
      label VARCHAR(255) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_special_events_day_banner_date ON media_special_events_day_banners(banner_date);`,
  );
}
