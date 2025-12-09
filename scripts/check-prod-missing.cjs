const { Client } = require('pg');

async function check() {
  const prodClient = new Client({ connectionString: process.env.PROD_DATABASE_URL });
  const devClient = new Client({ connectionString: process.env.DATABASE_URL });
  await prodClient.connect();
  await devClient.connect();
  
  // Check location_tables
  const prodTables = await prodClient.query('SELECT COUNT(*) FROM resy_location_tables');
  const devTables = await devClient.query('SELECT COUNT(*) FROM resy_location_tables');
  console.log('Location Tables - Dev:', devTables.rows[0].count, 'Prod:', prodTables.rows[0].count);
  
  // Check special_dates
  const prodSpecial = await prodClient.query('SELECT COUNT(*) FROM resy_special_dates');
  const devSpecial = await devClient.query('SELECT COUNT(*) FROM resy_special_dates');
  console.log('Special Dates - Dev:', devSpecial.rows[0].count, 'Prod:', prodSpecial.rows[0].count);
  
  // Check experiences with is_active
  const prodExp = await prodClient.query('SELECT id, name, is_active FROM resy_experiences');
  console.log('\nProduction Experiences:');
  prodExp.rows.forEach(r => console.log(`  ${r.name}: active=${r.is_active}`));
  
  await prodClient.end();
  await devClient.end();
}
check().catch(console.error);
