const { Client } = require('pg');

async function check() {
  const client = new Client({ connectionString: process.env.PROD_DATABASE_URL });
  await client.connect();
  
  // Check experiences
  const exp = await client.query('SELECT id, name, is_active, location_id FROM resy_experiences');
  console.log('Production Experiences:');
  exp.rows.forEach(r => console.log(`  ${r.name}: active=${r.is_active}, location_id=${r.location_id}`));
  
  // Check location-tables
  const tables = await client.query('SELECT id, name, location_id, capacity FROM resy_location_tables');
  console.log('\nProduction Location Tables:');
  tables.rows.forEach(r => console.log(`  ${r.name}: location_id=${r.location_id}, capacity=${r.capacity}`));
  
  await client.end();
}
check().catch(console.error);
