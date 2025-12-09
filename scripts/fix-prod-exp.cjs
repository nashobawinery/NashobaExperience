const { Client } = require('pg');

async function fix() {
  const prodClient = new Client({ connectionString: process.env.PROD_DATABASE_URL });
  const devClient = new Client({ connectionString: process.env.DATABASE_URL });
  await prodClient.connect();
  await devClient.connect();
  
  // Get dev experiences with location_ids
  const devExp = await devClient.query('SELECT id, location_id FROM resy_experiences WHERE location_id IS NOT NULL');
  console.log('Updating production experiences with location_ids from dev...');
  
  for (const exp of devExp.rows) {
    try {
      const result = await prodClient.query(
        'UPDATE resy_experiences SET location_id = $1 WHERE id = $2',
        [exp.location_id, exp.id]
      );
      if (result.rowCount > 0) {
        console.log(`  Updated ${exp.id}`);
      }
    } catch (err) {
      console.log(`  Error updating ${exp.id}: ${err.message}`);
    }
  }
  
  // Check prod location_tables columns
  const cols = await prodClient.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'resy_location_tables'
  `);
  console.log('\nProduction location_tables columns:', cols.rows.map(r => r.column_name).join(', '));
  
  // Check dev location_tables columns
  const devCols = await devClient.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'resy_location_tables'
  `);
  console.log('Dev location_tables columns:', devCols.rows.map(r => r.column_name).join(', '));
  
  await prodClient.end();
  await devClient.end();
}
fix().catch(console.error);
