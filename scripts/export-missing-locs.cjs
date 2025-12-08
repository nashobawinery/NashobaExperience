const { Client } = require('pg');

async function exportData() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const formatValue = (val) => {
    if (val === null) return 'NULL';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'number') return val;
    if (val instanceof Date) return `'${val.toISOString()}'`;
    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    return `'${String(val).replace(/'/g, "''").replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ')}'`;
  };

  const outputRow = (table, row) => {
    const columns = Object.keys(row).filter(k => row[k] !== null);
    const values = columns.map(col => formatValue(row[col]));
    console.log(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});`);
  };

  // Get locations except The Knoll (name = 'The Knoll')
  const locs = await client.query("SELECT * FROM resy_locations WHERE name != 'The Knoll'");
  locs.rows.forEach(r => outputRow('resy_locations', r));

  await client.end();
}
exportData().catch(console.error);
