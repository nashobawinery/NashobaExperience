const { Client } = require('pg');

const PROD_URL = 'postgresql://neondb_owner:npg_ZwW7KqdEG6OA@ep-nameless-base-afdwzc1s.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function sync() {
  const devClient = new Client({ connectionString: process.env.DATABASE_URL });
  const prodClient = new Client({ connectionString: PROD_URL });
  
  await devClient.connect();
  await prodClient.connect();
  
  console.log('Syncing new column values to production...\n');
  
  // Update experiences with new column values
  const devExp = await devClient.query('SELECT * FROM resy_experiences');
  console.log(`Updating ${devExp.rows.length} experiences...`);
  
  for (const exp of devExp.rows) {
    try {
      await prodClient.query(`
        UPDATE resy_experiences SET
          duration = $1,
          capacity = $2,
          min_guests = $3,
          max_guests = $4,
          min_advance_hours = $5,
          max_advance_days = $6,
          require_payment = $7,
          deposit_amount = $8,
          cancellation_policy = $9,
          gallery_urls = $10
        WHERE id = $11
      `, [
        exp.duration, exp.capacity, exp.min_guests, exp.max_guests,
        exp.min_advance_hours, exp.max_advance_days, exp.require_payment,
        exp.deposit_amount, exp.cancellation_policy, exp.gallery_urls,
        exp.id
      ]);
      console.log(`  Updated: ${exp.name}`);
    } catch (err) {
      console.log(`  ! Error ${exp.name}: ${err.message}`);
    }
  }
  
  // Update site settings
  const devSettings = await devClient.query('SELECT * FROM resy_site_settings LIMIT 1');
  if (devSettings.rows.length > 0) {
    const s = devSettings.rows[0];
    console.log('\nUpdating site settings...');
    try {
      await prodClient.query(`
        UPDATE resy_site_settings SET
          site_name = $1,
          tagline = $2,
          phone = $3,
          email = $4,
          address = $5,
          business_hours = $6,
          social_links = $7
        WHERE id = $8
      `, [s.site_name, s.tagline, s.phone, s.email, s.address, 
          JSON.stringify(s.business_hours), JSON.stringify(s.social_links), s.id]);
      console.log('  Updated site settings');
    } catch (err) {
      console.log(`  ! Error: ${err.message}`);
    }
  }
  
  console.log('\nSync complete!');
  
  await devClient.end();
  await prodClient.end();
}

sync().catch(console.error);
