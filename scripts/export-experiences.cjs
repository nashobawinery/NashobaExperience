const { Client } = require('pg');

async function exportData() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const rows = await client.query("SELECT * FROM resy_experiences");
  
  rows.rows.forEach(r => {
    // Build columns and values, skip nulls, escape strings
    const cols = [];
    const vals = [];
    for (const [k, v] of Object.entries(r)) {
      if (v === null) continue;
      cols.push(k);
      if (typeof v === 'boolean') vals.push(v ? 'true' : 'false');
      else if (typeof v === 'number') vals.push(v);
      else if (v instanceof Date) vals.push(`'${v.toISOString()}'`);
      else vals.push(`'${String(v).replace(/'/g, "''").replace(/[\n\r]+/g, ' ')}'`);
    }
    console.log(`INSERT INTO resy_experiences (${cols.join(', ')}) VALUES (${vals.join(', ')});`);
    console.log('');
  });

  await client.end();
}
exportData().catch(console.error);
