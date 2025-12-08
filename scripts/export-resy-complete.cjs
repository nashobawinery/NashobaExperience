const { Client } = require('pg');

async function exportResyData() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Order tables by dependency (parents first)
  const tables = [
    'resy_locations',
    'resy_clubs', 
    'resy_meal_periods',
    'resy_experiences',
    'resy_customers',
    'resy_operating_hours',
    'resy_special_dates',
    'resy_location_tables',
    'resy_flow_controls',
    'resy_turn_time_settings',
    'resy_time_slots',
    'resy_experience_discounts',
    'resy_club_experience_discounts',
    'resy_private_events',
    'resy_site_settings',
    'resy_footer_links',
    'resy_location_holidays',
    'resy_ticketed_event_definitions',
    'resy_ticketed_event_timeslots',
    'resy_reservations',
    'resy_waitlist',
    'resy_customer_visits',
  ];

  for (const table of tables) {
    try {
      const result = await client.query(`SELECT * FROM ${table}`);
      for (const row of result.rows) {
        const columns = Object.keys(row).filter(k => row[k] !== null);
        const values = columns.map(col => {
          const val = row[col];
          if (val === null) return 'NULL';
          if (typeof val === 'boolean') return val ? 'true' : 'false';
          if (typeof val === 'number') return val;
          if (val instanceof Date) return `'${val.toISOString()}'`;
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          return `'${String(val).replace(/'/g, "''")}'`;
        });
        console.log(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;`);
      }
    } catch (err) {
      // Table might not exist, skip
    }
  }
  await client.end();
}
exportResyData().catch(console.error);
