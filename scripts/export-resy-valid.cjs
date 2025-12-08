const { Client } = require('pg');

async function exportResyData() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Get valid meal period IDs
  const mealPeriods = await client.query('SELECT id FROM resy_meal_periods');
  const validMealPeriodIds = new Set(mealPeriods.rows.map(r => r.id));
  
  // Get valid location IDs
  const locations = await client.query('SELECT id FROM resy_locations');
  const validLocationIds = new Set(locations.rows.map(r => r.id));
  
  // Get valid experience IDs  
  const experiences = await client.query('SELECT id FROM resy_experiences');
  const validExperienceIds = new Set(experiences.rows.map(r => r.id));

  const formatValue = (val) => {
    if (val === null) return 'NULL';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'number') return val;
    if (val instanceof Date) return `'${val.toISOString()}'`;
    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    return `'${String(val).replace(/'/g, "''")}'`;
  };

  const outputRow = (table, row) => {
    const columns = Object.keys(row).filter(k => row[k] !== null);
    const values = columns.map(col => formatValue(row[col]));
    console.log(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;`);
  };

  // 1. Locations (no dependencies)
  const locs = await client.query('SELECT * FROM resy_locations');
  locs.rows.forEach(r => outputRow('resy_locations', r));

  // 2. Clubs (no dependencies)
  const clubs = await client.query('SELECT * FROM resy_clubs');
  clubs.rows.forEach(r => outputRow('resy_clubs', r));

  // 3. Meal periods (depends on locations)
  const meals = await client.query('SELECT * FROM resy_meal_periods WHERE location_id = ANY($1)', [Array.from(validLocationIds)]);
  meals.rows.forEach(r => outputRow('resy_meal_periods', r));

  // 4. Experiences (depends on locations)
  const exps = await client.query('SELECT * FROM resy_experiences');
  exps.rows.forEach(r => outputRow('resy_experiences', r));

  // 5. Operating hours (depends on meal periods) - ONLY valid ones
  const ops = await client.query('SELECT * FROM resy_operating_hours WHERE meal_period_id = ANY($1)', [Array.from(validMealPeriodIds)]);
  ops.rows.forEach(r => outputRow('resy_operating_hours', r));

  // 6. Time slots (depends on experiences)
  const slots = await client.query('SELECT * FROM resy_time_slots WHERE experience_id = ANY($1)', [Array.from(validExperienceIds)]);
  slots.rows.forEach(r => outputRow('resy_time_slots', r));

  // 7. Location tables  
  const tables = await client.query('SELECT * FROM resy_location_tables WHERE location_id = ANY($1)', [Array.from(validLocationIds)]);
  tables.rows.forEach(r => outputRow('resy_location_tables', r));

  // 8. Site settings
  const settings = await client.query('SELECT * FROM resy_site_settings');
  settings.rows.forEach(r => outputRow('resy_site_settings', r));

  // 9. Footer links
  const links = await client.query('SELECT * FROM resy_footer_links');
  links.rows.forEach(r => outputRow('resy_footer_links', r));

  // 10. Ticketed event definitions
  const ticketDefs = await client.query('SELECT * FROM resy_ticketed_event_definitions');
  ticketDefs.rows.forEach(r => outputRow('resy_ticketed_event_definitions', r));

  // 11. Ticketed event timeslots
  const ticketSlots = await client.query('SELECT * FROM resy_ticketed_event_timeslots');
  ticketSlots.rows.forEach(r => outputRow('resy_ticketed_event_timeslots', r));

  // 12. Special dates
  const special = await client.query('SELECT * FROM resy_special_dates');
  special.rows.forEach(r => outputRow('resy_special_dates', r));

  await client.end();
}
exportResyData().catch(console.error);
