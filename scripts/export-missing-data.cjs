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
    return `E'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "''").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;
  };

  const outputRow = (table, row) => {
    const columns = Object.keys(row).filter(k => row[k] !== null);
    const values = columns.map(col => formatValue(row[col]));
    console.log(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});`);
  };

  // Skip the location that already exists (id = b8ab57a7-e755-4e2c-910f-439909a148b3)
  const existingLocationId = 'b8ab57a7-e755-4e2c-910f-439909a148b3';
  
  // Get locations except the one that exists
  const locs = await client.query('SELECT * FROM resy_locations WHERE id != $1', [existingLocationId]);
  console.log('-- Locations (6 missing)');
  locs.rows.forEach(r => outputRow('resy_locations', r));

  // All experiences
  console.log('\n-- Experiences (all 7)');
  const exps = await client.query('SELECT * FROM resy_experiences');
  exps.rows.forEach(r => outputRow('resy_experiences', r));

  // Meal periods
  console.log('\n-- Meal Periods');
  const meals = await client.query('SELECT * FROM resy_meal_periods');
  meals.rows.forEach(r => outputRow('resy_meal_periods', r));

  // Site settings  
  console.log('\n-- Site Settings');
  const settings = await client.query('SELECT * FROM resy_site_settings');
  settings.rows.forEach(r => outputRow('resy_site_settings', r));

  // Location tables
  console.log('\n-- Location Tables');
  const tables = await client.query('SELECT * FROM resy_location_tables');
  tables.rows.forEach(r => outputRow('resy_location_tables', r));

  // Time slots
  console.log('\n-- Time Slots');
  const slots = await client.query('SELECT * FROM resy_time_slots');
  slots.rows.forEach(r => outputRow('resy_time_slots', r));

  // Ticketed event definitions
  console.log('\n-- Ticketed Event Definitions');
  const defs = await client.query('SELECT * FROM resy_ticketed_event_definitions');
  defs.rows.forEach(r => outputRow('resy_ticketed_event_definitions', r));

  // Ticketed event timeslots
  console.log('\n-- Ticketed Event Timeslots');
  const tslots = await client.query('SELECT * FROM resy_ticketed_event_timeslots');
  tslots.rows.forEach(r => outputRow('resy_ticketed_event_timeslots', r));

  await client.end();
}
exportData().catch(console.error);
