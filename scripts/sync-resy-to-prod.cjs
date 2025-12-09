const { Client } = require('pg');

async function sync() {
  const devClient = new Client({ connectionString: process.env.DATABASE_URL });
  const prodClient = new Client({ connectionString: process.env.PROD_DATABASE_URL });
  
  await devClient.connect();
  await prodClient.connect();
  
  // Check what prod has now
  const prodHost = new URL(process.env.PROD_DATABASE_URL).host;
  console.log('Syncing to production database:', prodHost.substring(0, 25) + '...');
  
  // Sync experiences
  const devExp = await devClient.query('SELECT * FROM resy_experiences');
  console.log(`\nSyncing ${devExp.rows.length} experiences...`);
  
  for (const exp of devExp.rows) {
    try {
      // Check if exists
      const exists = await prodClient.query('SELECT id FROM resy_experiences WHERE id = $1', [exp.id]);
      if (exists.rows.length === 0) {
        await prodClient.query(`
          INSERT INTO resy_experiences (
            id, name, description, location_id, location, duration, price, capacity,
            is_active, display_order, image_url, gallery_urls, reservation_type,
            min_guests, max_guests, min_advance_hours, max_advance_days, require_payment,
            deposit_amount, cancellation_policy, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        `, [
          exp.id, exp.name, exp.description, exp.location_id, exp.location, exp.duration, exp.price, exp.capacity,
          exp.is_active, exp.display_order, exp.image_url, exp.gallery_urls, exp.reservation_type,
          exp.min_guests, exp.max_guests, exp.min_advance_hours, exp.max_advance_days, exp.require_payment,
          exp.deposit_amount, exp.cancellation_policy, exp.created_at, exp.updated_at
        ]);
        console.log(`  + Added: ${exp.name}`);
      } else {
        console.log(`  = Exists: ${exp.name}`);
      }
    } catch (err) {
      console.log(`  ! Error ${exp.name}: ${err.message}`);
    }
  }
  
  // Sync meal periods
  const devMeals = await devClient.query('SELECT * FROM resy_meal_periods');
  console.log(`\nSyncing ${devMeals.rows.length} meal periods...`);
  for (const meal of devMeals.rows) {
    try {
      const exists = await prodClient.query('SELECT id FROM resy_meal_periods WHERE id = $1', [meal.id]);
      if (exists.rows.length === 0) {
        await prodClient.query(`
          INSERT INTO resy_meal_periods (id, name, start_time, end_time, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [meal.id, meal.name, meal.start_time, meal.end_time, meal.is_active, meal.created_at, meal.updated_at]);
        console.log(`  + Added: ${meal.name}`);
      } else {
        console.log(`  = Exists: ${meal.name}`);
      }
    } catch (err) {
      console.log(`  ! Error ${meal.name}: ${err.message}`);
    }
  }
  
  // Sync operating hours
  const devHours = await devClient.query('SELECT * FROM resy_operating_hours');
  console.log(`\nSyncing ${devHours.rows.length} operating hours...`);
  let hoursAdded = 0;
  for (const hour of devHours.rows) {
    try {
      const exists = await prodClient.query('SELECT id FROM resy_operating_hours WHERE id = $1', [hour.id]);
      if (exists.rows.length === 0) {
        await prodClient.query(`
          INSERT INTO resy_operating_hours (id, location_id, day_of_week, meal_period_id, is_open, open_time, close_time, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [hour.id, hour.location_id, hour.day_of_week, hour.meal_period_id, hour.is_open, hour.open_time, hour.close_time, hour.created_at, hour.updated_at]);
        hoursAdded++;
      }
    } catch (err) {
      // Skip silently
    }
  }
  console.log(`  + Added ${hoursAdded} operating hours`);
  
  // Sync location tables
  const devTables = await devClient.query('SELECT * FROM resy_location_tables');
  console.log(`\nSyncing ${devTables.rows.length} location tables...`);
  let tablesAdded = 0;
  for (const table of devTables.rows) {
    try {
      const exists = await prodClient.query('SELECT id FROM resy_location_tables WHERE id = $1', [table.id]);
      if (exists.rows.length === 0) {
        await prodClient.query(`
          INSERT INTO resy_location_tables (id, location_id, table_label, capacity, min_capacity, max_capacity, is_communal, combinable_with, priority, is_active, is_paused, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [table.id, table.location_id, table.table_label, table.capacity, table.min_capacity, table.max_capacity, table.is_communal, table.combinable_with, table.priority, table.is_active, table.is_paused, table.created_at, table.updated_at]);
        tablesAdded++;
      }
    } catch (err) {
      // Skip silently
    }
  }
  console.log(`  + Added ${tablesAdded} location tables`);
  
  // Sync site settings
  const devSettings = await devClient.query('SELECT * FROM resy_site_settings');
  console.log(`\nSyncing ${devSettings.rows.length} site settings...`);
  for (const setting of devSettings.rows) {
    try {
      const exists = await prodClient.query('SELECT id FROM resy_site_settings WHERE id = $1', [setting.id]);
      if (exists.rows.length === 0) {
        await prodClient.query(`
          INSERT INTO resy_site_settings (id, site_name, tagline, logo_url, phone, email, address, business_hours, social_links, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [setting.id, setting.site_name, setting.tagline, setting.logo_url, setting.phone, setting.email, setting.address, setting.business_hours, setting.social_links, setting.created_at, setting.updated_at]);
        console.log(`  + Added site settings`);
      } else {
        console.log(`  = Site settings exist`);
      }
    } catch (err) {
      console.log(`  ! Error: ${err.message}`);
    }
  }
  
  // Final counts
  console.log('\n=== PRODUCTION DATABASE AFTER SYNC ===');
  const counts = await prodClient.query(`
    SELECT 
      (SELECT COUNT(*) FROM resy_locations) as locations,
      (SELECT COUNT(*) FROM resy_experiences) as experiences,
      (SELECT COUNT(*) FROM resy_meal_periods) as meal_periods,
      (SELECT COUNT(*) FROM resy_location_tables) as tables,
      (SELECT COUNT(*) FROM resy_operating_hours) as hours,
      (SELECT COUNT(*) FROM resy_site_settings) as settings
  `);
  console.log(counts.rows[0]);
  
  await devClient.end();
  await prodClient.end();
}

sync().catch(console.error);
