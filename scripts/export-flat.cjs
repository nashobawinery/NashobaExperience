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
    // Replace newlines with spaces, escape quotes
    return `'${String(val).replace(/'/g, "''").replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ')}'`;
  };

  const outputRow = (table, row) => {
    const columns = Object.keys(row).filter(k => row[k] !== null);
    const values = columns.map(col => formatValue(row[col]));
    console.log(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});`);
  };

  const existingLocationId = 'b8ab57a7-e755-4e2c-910f-439909a148b3';
  
  (await client.query('SELECT * FROM resy_locations WHERE id != $1', [existingLocationId])).rows.forEach(r => outputRow('resy_locations', r));
  (await client.query('SELECT * FROM resy_experiences')).rows.forEach(r => outputRow('resy_experiences', r));
  (await client.query('SELECT * FROM resy_meal_periods')).rows.forEach(r => outputRow('resy_meal_periods', r));
  (await client.query('SELECT * FROM resy_site_settings')).rows.forEach(r => outputRow('resy_site_settings', r));
  (await client.query('SELECT * FROM resy_location_tables')).rows.forEach(r => outputRow('resy_location_tables', r));
  (await client.query('SELECT * FROM resy_time_slots')).rows.forEach(r => outputRow('resy_time_slots', r));
  (await client.query('SELECT * FROM resy_ticketed_event_definitions')).rows.forEach(r => outputRow('resy_ticketed_event_definitions', r));
  (await client.query('SELECT * FROM resy_ticketed_event_timeslots')).rows.forEach(r => outputRow('resy_ticketed_event_timeslots', r));

  await client.end();
}
exportData().catch(console.error);
