/**
 * Export Resy tables from dev database to SQL INSERT statements
 * These can then be run against production to seed initial data
 */

const { Client } = require('pg');

async function exportResyData() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  await client.connect();
  console.log('Connected to database\n');

  // Order tables by dependency (parents first)
  const tables = [
    'resy_locations',
    'resy_clubs',
    'resy_experiences',
    'resy_customers',
    'resy_meal_periods',
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

  console.log('-- Resy Data Export from Dev Database');
  console.log('-- Generated: ' + new Date().toISOString());
  console.log('-- Run these statements against production database');
  console.log('');
  console.log('-- IMPORTANT: Run in order to satisfy foreign key constraints');
  console.log('');

  for (const table of tables) {
    try {
      const result = await client.query(`SELECT * FROM ${table}`);
      
      if (result.rows.length === 0) {
        console.log(`-- ${table}: 0 rows (empty)`);
        console.log('');
        continue;
      }

      console.log(`-- ${table}: ${result.rows.length} rows`);
      
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
      console.log('');
    } catch (err) {
      console.log(`-- Error reading ${table}: ${err.message}`);
      console.log('');
    }
  }

  await client.end();
}

exportResyData().catch(console.error);
