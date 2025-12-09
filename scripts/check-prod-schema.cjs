const { Client } = require('pg');

const PROD_URL = 'postgresql://neondb_owner:npg_ZwW7KqdEG6OA@ep-nameless-base-afdwzc1s.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function check() {
  const prodClient = new Client({ connectionString: PROD_URL });
  await prodClient.connect();
  
  // Check experiences columns
  const expCols = await prodClient.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'resy_experiences' ORDER BY ordinal_position
  `);
  console.log('resy_experiences columns:', expCols.rows.map(r => r.column_name).join(', '));
  
  // Check site settings columns
  const settingsCols = await prodClient.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'resy_site_settings' ORDER BY ordinal_position
  `);
  console.log('\nresy_site_settings columns:', settingsCols.rows.map(r => r.column_name).join(', '));
  
  await prodClient.end();
}

check().catch(console.error);
