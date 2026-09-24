ALTER TABLE resy_locations ADD COLUMN IF NOT EXISTS show_on_master_page boolean NOT NULL DEFAULT true;
ALTER TABLE resy_experiences ADD COLUMN IF NOT EXISTS show_on_master_page boolean NOT NULL DEFAULT true;
ALTER TABLE resy_locations ADD COLUMN IF NOT EXISTS headline text;
ALTER TABLE resy_locations ADD COLUMN IF NOT EXISTS booking_details text;
