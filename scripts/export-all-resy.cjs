const { Client } = require('pg');

async function exportData() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const escape = (val) => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'number') return val;
    if (val instanceof Date) return `'${val.toISOString()}'`;
    // Remove apostrophes and newlines for simpler SQL
    return `'${String(val).replace(/'/g, '').replace(/[\n\r]+/g, ' ').trim()}'`;
  };

  const exportTable = async (table, skipIds = []) => {
    let query = `SELECT * FROM ${table}`;
    const rows = await client.query(query);
    
    console.log(`-- ${table} (${rows.rows.length} rows)`);
    rows.rows.forEach(r => {
      if (skipIds.includes(r.id)) return;
      const cols = Object.keys(r).filter(k => r[k] !== null);
      const vals = cols.map(c => escape(r[c]));
      console.log(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')});`);
    });
    console.log('');
  };

  // Export experiences (all, no skips)
  await exportTable('resy_experiences');
  
  // Export other tables
  await exportTable('resy_meal_periods');
  await exportTable('resy_clubs');
  await exportTable('resy_operating_hours');
  await exportTable('resy_site_settings');

  await client.end();
}
exportData().catch(console.error);
