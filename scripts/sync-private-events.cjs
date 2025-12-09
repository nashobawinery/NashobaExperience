const { Client } = require('pg');

const PROD_URL = 'postgresql://neondb_owner:npg_ZwW7KqdEG6OA@ep-nameless-base-afdwzc1s.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function sync() {
  const devClient = new Client({ connectionString: process.env.DATABASE_URL });
  const prodClient = new Client({ connectionString: PROD_URL });
  
  await devClient.connect();
  await prodClient.connect();
  
  // Check prod count
  const prodCount = await prodClient.query('SELECT COUNT(*) FROM resy_private_events');
  console.log('Prod private events count:', prodCount.rows[0].count);
  
  // Sync from dev to prod
  const devEvents = await devClient.query('SELECT * FROM resy_private_events');
  console.log('Dev private events count:', devEvents.rows.length);
  
  for (const evt of devEvents.rows) {
    try {
      const exists = await prodClient.query('SELECT id FROM resy_private_events WHERE id = $1', [evt.id]);
      if (exists.rows.length === 0) {
        await prodClient.query(`
          INSERT INTO resy_private_events (
            id, experience_id, location_id, event_date, start_time, end_time,
            customer_name, customer_email, customer_phone, party_size, status, notes,
            created_at, updated_at, meal_period_id, date, message, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        `, [
          evt.id, evt.experience_id, evt.location_id, evt.event_date, evt.start_time, evt.end_time,
          evt.customer_name, evt.customer_email, evt.customer_phone, evt.party_size, evt.status, evt.notes,
          evt.created_at, evt.updated_at, evt.meal_period_id, evt.date, evt.message, evt.is_active
        ]);
        console.log(`+ Added: ${evt.customer_name}`);
      }
    } catch (err) {
      console.log(`! Error: ${err.message}`);
    }
  }
  
  // Final count
  const finalCount = await prodClient.query('SELECT COUNT(*) FROM resy_private_events');
  console.log('\nFinal prod count:', finalCount.rows[0].count);
  
  await devClient.end();
  await prodClient.end();
}

sync().catch(console.error);
