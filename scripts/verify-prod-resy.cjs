const { Client } = require('pg');

async function verify() {
  const client = new Client({ connectionString: process.env.PROD_DATABASE_URL });
  await client.connect();
  
  const tables = [
    'resy_locations',
    'resy_experiences', 
    'resy_meal_periods',
    'resy_operating_hours',
    'resy_clubs',
    'resy_customers',
    'resy_site_settings',
    'resy_time_slots',
    'resy_reservations'
  ];
  
  console.log('=== PRODUCTION RESY DATA ===\n');
  for (const t of tables) {
    try {
      const res = await client.query(`SELECT COUNT(*) FROM ${t}`);
      console.log(`${t}: ${res.rows[0].count} rows`);
    } catch (err) {
      console.log(`${t}: table not found`);
    }
  }
  
  await client.end();
}

verify().catch(console.error);
