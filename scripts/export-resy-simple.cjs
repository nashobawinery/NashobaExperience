const { Client } = require('pg');

async function exportResyData() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const validMealPeriodIds = (await client.query('SELECT id FROM resy_meal_periods')).rows.map(r => r.id);
  const validLocationIds = (await client.query('SELECT id FROM resy_locations')).rows.map(r => r.id);
  const validExperienceIds = (await client.query('SELECT id FROM resy_experiences')).rows.map(r => r.id);

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
    // Simple INSERT without ON CONFLICT - for initial data load
    console.log(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});`);
  };

  // Export in dependency order
  (await client.query('SELECT * FROM resy_locations')).rows.forEach(r => outputRow('resy_locations', r));
  (await client.query('SELECT * FROM resy_clubs')).rows.forEach(r => outputRow('resy_clubs', r));
  (await client.query('SELECT * FROM resy_meal_periods WHERE location_id = ANY($1)', [validLocationIds])).rows.forEach(r => outputRow('resy_meal_periods', r));
  (await client.query('SELECT * FROM resy_experiences')).rows.forEach(r => outputRow('resy_experiences', r));
  (await client.query('SELECT * FROM resy_operating_hours WHERE meal_period_id = ANY($1)', [validMealPeriodIds])).rows.forEach(r => outputRow('resy_operating_hours', r));
  (await client.query('SELECT * FROM resy_time_slots WHERE experience_id = ANY($1)', [validExperienceIds])).rows.forEach(r => outputRow('resy_time_slots', r));
  (await client.query('SELECT * FROM resy_location_tables WHERE location_id = ANY($1)', [validLocationIds])).rows.forEach(r => outputRow('resy_location_tables', r));
  (await client.query('SELECT * FROM resy_site_settings')).rows.forEach(r => outputRow('resy_site_settings', r));
  (await client.query('SELECT * FROM resy_footer_links')).rows.forEach(r => outputRow('resy_footer_links', r));
  (await client.query('SELECT * FROM resy_ticketed_event_definitions')).rows.forEach(r => outputRow('resy_ticketed_event_definitions', r));
  (await client.query('SELECT * FROM resy_ticketed_event_timeslots')).rows.forEach(r => outputRow('resy_ticketed_event_timeslots', r));
  (await client.query('SELECT * FROM resy_special_dates')).rows.forEach(r => outputRow('resy_special_dates', r));

  await client.end();
}
exportResyData().catch(console.error);
