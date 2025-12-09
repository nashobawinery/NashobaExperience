const { Client } = require('pg');

async function check() {
  const client = new Client({ connectionString: process.env.PROD_DATABASE_URL });
  await client.connect();
  
  // Check special_dates columns
  const cols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'resy_special_dates' 
    ORDER BY ordinal_position
  `);
  console.log('resy_special_dates columns:');
  cols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
  
  // Check actual data
  console.log('\nSpecial dates data:');
  const data = await client.query('SELECT * FROM resy_special_dates');
  console.log(JSON.stringify(data.rows, null, 2));
  
  await client.end();
}
check().catch(console.error);
