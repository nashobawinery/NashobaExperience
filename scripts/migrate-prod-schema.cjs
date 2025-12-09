const { Client } = require('pg');

const PROD_URL = 'postgresql://neondb_owner:npg_ZwW7KqdEG6OA@ep-nameless-base-afdwzc1s.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function migrate() {
  const client = new Client({ connectionString: PROD_URL });
  await client.connect();
  
  console.log('Adding missing columns to production database...\n');
  
  // Add missing columns to resy_experiences
  const expColumns = [
    { name: 'duration', sql: 'ALTER TABLE resy_experiences ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 60' },
    { name: 'capacity', sql: 'ALTER TABLE resy_experiences ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 10' },
    { name: 'min_guests', sql: 'ALTER TABLE resy_experiences ADD COLUMN IF NOT EXISTS min_guests INTEGER DEFAULT 1' },
    { name: 'max_guests', sql: 'ALTER TABLE resy_experiences ADD COLUMN IF NOT EXISTS max_guests INTEGER DEFAULT 10' },
    { name: 'min_advance_hours', sql: 'ALTER TABLE resy_experiences ADD COLUMN IF NOT EXISTS min_advance_hours INTEGER DEFAULT 24' },
    { name: 'max_advance_days', sql: 'ALTER TABLE resy_experiences ADD COLUMN IF NOT EXISTS max_advance_days INTEGER DEFAULT 30' },
    { name: 'require_payment', sql: 'ALTER TABLE resy_experiences ADD COLUMN IF NOT EXISTS require_payment BOOLEAN DEFAULT false' },
    { name: 'deposit_amount', sql: 'ALTER TABLE resy_experiences ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT 0' },
    { name: 'cancellation_policy', sql: 'ALTER TABLE resy_experiences ADD COLUMN IF NOT EXISTS cancellation_policy TEXT' },
    { name: 'gallery_urls', sql: 'ALTER TABLE resy_experiences ADD COLUMN IF NOT EXISTS gallery_urls TEXT[]' },
  ];
  
  console.log('Updating resy_experiences table...');
  for (const col of expColumns) {
    try {
      await client.query(col.sql);
      console.log(`  + Added: ${col.name}`);
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log(`  = Exists: ${col.name}`);
      } else {
        console.log(`  ! Error ${col.name}: ${err.message}`);
      }
    }
  }
  
  // Add missing columns to resy_site_settings
  const settingsColumns = [
    { name: 'site_name', sql: 'ALTER TABLE resy_site_settings ADD COLUMN IF NOT EXISTS site_name TEXT' },
    { name: 'tagline', sql: 'ALTER TABLE resy_site_settings ADD COLUMN IF NOT EXISTS tagline TEXT' },
    { name: 'phone', sql: 'ALTER TABLE resy_site_settings ADD COLUMN IF NOT EXISTS phone TEXT' },
    { name: 'email', sql: 'ALTER TABLE resy_site_settings ADD COLUMN IF NOT EXISTS email TEXT' },
    { name: 'address', sql: 'ALTER TABLE resy_site_settings ADD COLUMN IF NOT EXISTS address TEXT' },
    { name: 'business_hours', sql: 'ALTER TABLE resy_site_settings ADD COLUMN IF NOT EXISTS business_hours JSONB' },
    { name: 'social_links', sql: 'ALTER TABLE resy_site_settings ADD COLUMN IF NOT EXISTS social_links JSONB' },
  ];
  
  console.log('\nUpdating resy_site_settings table...');
  for (const col of settingsColumns) {
    try {
      await client.query(col.sql);
      console.log(`  + Added: ${col.name}`);
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log(`  = Exists: ${col.name}`);
      } else {
        console.log(`  ! Error ${col.name}: ${err.message}`);
      }
    }
  }
  
  // Verify columns were added
  console.log('\n=== VERIFICATION ===');
  const expCols = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'resy_experiences' 
    AND column_name IN ('duration', 'capacity', 'min_guests', 'max_guests', 'require_payment', 'deposit_amount')
    ORDER BY column_name
  `);
  console.log('Experience columns added:', expCols.rows.map(r => r.column_name).join(', '));
  
  const settingsCols = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'resy_site_settings' 
    AND column_name IN ('site_name', 'tagline', 'phone', 'email', 'address')
    ORDER BY column_name
  `);
  console.log('Settings columns added:', settingsCols.rows.map(r => r.column_name).join(', '));
  
  await client.end();
  console.log('\nSchema migration complete!');
}

migrate().catch(console.error);
