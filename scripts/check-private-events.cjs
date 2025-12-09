const { Client } = require('pg');

const PROD_URL = 'postgresql://neondb_owner:npg_ZwW7KqdEG6OA@ep-nameless-base-afdwzc1s.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function check() {
  const devClient = new Client({ connectionString: process.env.DATABASE_URL });
  const prodClient = new Client({ connectionString: PROD_URL });
  
  await devClient.connect();
  await prodClient.connect();
  
  // Check if table exists in prod
  const tableExists = await prodClient.query(`
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resy_private_events')
  `);
  console.log('Table resy_private_events exists in prod:', tableExists.rows[0].exists);
  
  if (tableExists.rows[0].exists) {
    // Check columns
    const prodCols = await prodClient.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'resy_private_events' ORDER BY ordinal_position
    `);
    console.log('\nProd columns:', prodCols.rows.map(r => r.column_name).join(', '));
  }
  
  // Check dev
  const devTableExists = await devClient.query(`
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resy_private_events')
  `);
  console.log('\nTable resy_private_events exists in dev:', devTableExists.rows[0].exists);
  
  if (devTableExists.rows[0].exists) {
    const devCols = await devClient.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'resy_private_events' ORDER BY ordinal_position
    `);
    console.log('Dev columns:', devCols.rows.map(r => r.column_name).join(', '));
    
    const devCount = await devClient.query('SELECT COUNT(*) FROM resy_private_events');
    console.log('Dev count:', devCount.rows[0].count);
  }
  
  await devClient.end();
  await prodClient.end();
}

check().catch(console.error);
