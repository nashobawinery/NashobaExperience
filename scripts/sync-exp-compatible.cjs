const { Client } = require('pg');

const PROD_URL = 'postgresql://neondb_owner:npg_ZwW7KqdEG6OA@ep-nameless-base-afdwzc1s.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function sync() {
  const devClient = new Client({ connectionString: process.env.DATABASE_URL });
  const prodClient = new Client({ connectionString: PROD_URL });
  
  await devClient.connect();
  await prodClient.connect();
  
  console.log('Syncing experiences with compatible columns...\n');
  
  // Sync experiences using only common columns
  const devExp = await devClient.query('SELECT * FROM resy_experiences');
  
  for (const exp of devExp.rows) {
    try {
      const exists = await prodClient.query('SELECT id FROM resy_experiences WHERE id = $1', [exp.id]);
      if (exists.rows.length === 0) {
        await prodClient.query(`
          INSERT INTO resy_experiences (
            id, name, description, image_url, reservation_type, price,
            display_order, is_active, location, location_id, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          exp.id, exp.name, exp.description, exp.image_url, exp.reservation_type, exp.price,
          exp.display_order, exp.is_active, exp.location, exp.location_id, exp.created_at, exp.updated_at
        ]);
        console.log(`+ Added: ${exp.name}`);
      } else {
        console.log(`= Exists: ${exp.name}`);
      }
    } catch (err) {
      console.log(`! Error ${exp.name}: ${err.message}`);
    }
  }
  
  // Sync site settings with compatible columns
  console.log('\nSyncing site settings...');
  const devSettings = await devClient.query('SELECT * FROM resy_site_settings LIMIT 1');
  if (devSettings.rows.length > 0) {
    const s = devSettings.rows[0];
    try {
      const exists = await prodClient.query('SELECT id FROM resy_site_settings WHERE id = $1', [s.id]);
      if (exists.rows.length === 0) {
        // Use prod columns: company_name instead of site_name, company_phone instead of phone, etc.
        await prodClient.query(`
          INSERT INTO resy_site_settings (id, logo_url, company_phone, company_email, company_address, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [s.id, s.logo_url, s.phone, s.email, s.address, s.created_at, s.updated_at]);
        console.log('+ Added site settings');
      } else {
        console.log('= Site settings exist');
      }
    } catch (err) {
      console.log(`! Error: ${err.message}`);
    }
  }
  
  // Final counts
  console.log('\n=== PRODUCTION DATABASE AFTER SYNC ===');
  const counts = await prodClient.query(`
    SELECT 
      (SELECT COUNT(*) FROM resy_locations) as locations,
      (SELECT COUNT(*) FROM resy_experiences) as experiences,
      (SELECT COUNT(*) FROM resy_meal_periods) as meal_periods,
      (SELECT COUNT(*) FROM resy_location_tables) as tables,
      (SELECT COUNT(*) FROM resy_operating_hours) as hours,
      (SELECT COUNT(*) FROM resy_site_settings) as settings
  `);
  console.log(counts.rows[0]);
  
  await devClient.end();
  await prodClient.end();
}

sync().catch(console.error);
