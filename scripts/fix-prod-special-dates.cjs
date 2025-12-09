const { Client } = require('pg');

async function fix() {
  const client = new Client({ connectionString: process.env.PROD_DATABASE_URL });
  await client.connect();
  
  // Delete the old incompatible special dates (they have null location_id and date)
  const result = await client.query(`
    DELETE FROM resy_special_dates 
    WHERE location_id IS NULL OR date IS NULL
    RETURNING id
  `);
  
  console.log(`Deleted ${result.rowCount} incompatible special dates records`);
  
  // Verify
  const remaining = await client.query('SELECT COUNT(*) FROM resy_special_dates');
  console.log(`Remaining special dates: ${remaining.rows[0].count}`);
  
  await client.end();
}
fix().catch(console.error);
