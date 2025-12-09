const { Client } = require('pg');

async function verify() {
  const client = new Client({ connectionString: process.env.PROD_DATABASE_URL });
  await client.connect();
  
  // Check experiences with locations
  const exp = await client.query('SELECT id, name, is_active, location_id, location FROM resy_experiences');
  console.log('Production Experiences:');
  exp.rows.forEach(r => console.log(`  ${r.name}: active=${r.is_active}, location_id=${r.location_id || r.location || 'none'}`));
  
  // Check location tables
  const tables = await client.query('SELECT id, table_label, location_id, capacity FROM resy_location_tables');
  console.log('\nProduction Location Tables:');
  tables.rows.forEach(r => console.log(`  ${r.table_label}: location=${r.location_id}, capacity=${r.capacity}`));
  
  // Final counts
  console.log('\n=== FINAL PRODUCTION COUNTS ===');
  const counts = await client.query(`
    SELECT 
      (SELECT COUNT(*) FROM resy_locations) as locations,
      (SELECT COUNT(*) FROM resy_experiences) as experiences,
      (SELECT COUNT(*) FROM resy_meal_periods) as meal_periods,
      (SELECT COUNT(*) FROM resy_location_tables) as tables,
      (SELECT COUNT(*) FROM resy_operating_hours) as hours,
      (SELECT COUNT(*) FROM resy_special_dates) as special_dates,
      (SELECT COUNT(*) FROM resy_site_settings) as settings
  `);
  console.log(counts.rows[0]);
  
  await client.end();
}
verify().catch(console.error);
