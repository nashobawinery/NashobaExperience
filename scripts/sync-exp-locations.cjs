const { Client } = require('pg');

async function fix() {
  const prodClient = new Client({ connectionString: process.env.PROD_DATABASE_URL });
  const devClient = new Client({ connectionString: process.env.DATABASE_URL });
  await prodClient.connect();
  await devClient.connect();
  
  // Get ALL dev experiences
  const devExp = await devClient.query('SELECT id, name, location_id, location FROM resy_experiences');
  console.log('Dev experiences:');
  devExp.rows.forEach(r => console.log(`  ${r.name}: location_id=${r.location_id}, location=${r.location}`));
  
  // Update prod with dev values
  console.log('\nUpdating prod with dev location_id values...');
  for (const exp of devExp.rows) {
    const result = await prodClient.query(
      'UPDATE resy_experiences SET location_id = $1 WHERE id = $2',
      [exp.location_id, exp.id]
    );
    if (result.rowCount > 0) {
      console.log(`  Updated ${exp.name}: location_id=${exp.location_id}`);
    }
  }
  
  // Verify
  console.log('\nFinal production experiences:');
  const prodExp = await prodClient.query('SELECT name, is_active, location_id FROM resy_experiences');
  prodExp.rows.forEach(r => console.log(`  ${r.name}: active=${r.is_active}, location_id=${r.location_id}`));
  
  await prodClient.end();
  await devClient.end();
}
fix().catch(console.error);
