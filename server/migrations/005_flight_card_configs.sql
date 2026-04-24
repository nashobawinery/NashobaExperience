-- flight_card_configs: Flight Card Printer saved presets (see shared/schema.ts).
-- Safe to re-run: CREATE TABLE IF NOT EXISTS; only print_orientation and item_overrides are added via ALTER.

CREATE TABLE IF NOT EXISTS flight_card_configs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  header TEXT,
  footer TEXT,
  product_ids TEXT NOT NULL DEFAULT '',
  template VARCHAR(50) DEFAULT 'classic',
  paper_size VARCHAR(20) DEFAULT 'a6',
  print_orientation VARCHAR(20) DEFAULT 'portrait',
  show_price BOOLEAN DEFAULT TRUE,
  show_description BOOLEAN DEFAULT TRUE,
  show_vintage BOOLEAN DEFAULT TRUE,
  show_varietal BOOLEAN DEFAULT TRUE,
  show_alcohol BOOLEAN DEFAULT FALSE,
  show_tasting_lines BOOLEAN DEFAULT FALSE,
  font_scale INTEGER DEFAULT 100,
  show_on_staff_board BOOLEAN DEFAULT FALSE,
  item_overrides TEXT DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE flight_card_configs ADD COLUMN IF NOT EXISTS print_orientation VARCHAR(20) DEFAULT 'portrait';
ALTER TABLE flight_card_configs ADD COLUMN IF NOT EXISTS item_overrides TEXT DEFAULT '{}';
