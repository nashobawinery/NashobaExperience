const { Client } = require('pg');

// Tables where dev has more/newer data that should be synced to prod
// We'll sync by checking if records exist (by primary key) and inserting missing ones
const TABLES_TO_SYNC = [
  // Tables where dev has significantly more data
  { name: 'group_feature_permissions', pk: 'id' },
  { name: 'guest_sessions', pk: 'id' },
  { name: 'trivia_scores', pk: 'id' },
  { name: 'compliance_task_history', pk: 'id' },
  { name: 'module_features', pk: 'id' },
  { name: 'trivia_questions', pk: 'id' },
  { name: 'view_history', pk: 'id' },
  { name: 'resy_users', pk: 'id' },
  { name: 'resy_time_slots', pk: 'id' },
  { name: 'cart_items', pk: 'id' },
  { name: 'resy_location_holidays', pk: 'id' },
  { name: 'favorites', pk: 'id' },
  { name: 'resy_turn_time_settings', pk: 'id' },
  { name: 'resy_reservations', pk: 'id' },
  { name: 'trivia_attempts', pk: 'id' },
  { name: 'product_media', pk: 'id' },
  { name: 'product_notes', pk: 'id' },
  { name: 'resy_ticketed_event_timeslots', pk: 'id' },
  { name: 'compliance_tasks', pk: 'id' },
  { name: 'daily_procedure_templates', pk: 'id' },
  { name: 'spot_inventory_areas', pk: 'id' },
  { name: 'spot_inventory_locations', pk: 'id' },
];

async function getTableColumns(client, tableName) {
  const result = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  return result.rows;
}

async function syncTable(devClient, prodClient, tableName, pkColumn) {
  console.log(`\n--- Syncing ${tableName} ---`);
  
  try {
    // Get columns from both databases
    const devCols = await getTableColumns(devClient, tableName);
    const prodCols = await getTableColumns(prodClient, tableName);
    
    if (devCols.length === 0) {
      console.log(`  Table ${tableName} doesn't exist in dev, skipping`);
      return { synced: 0, errors: 0 };
    }
    
    if (prodCols.length === 0) {
      console.log(`  Table ${tableName} doesn't exist in prod, skipping`);
      return { synced: 0, errors: 0 };
    }
    
    // Find common columns
    const prodColNames = new Set(prodCols.map(c => c.column_name));
    const commonCols = devCols
      .filter(c => prodColNames.has(c.column_name))
      .map(c => c.column_name);
    
    if (!commonCols.includes(pkColumn)) {
      console.log(`  Primary key ${pkColumn} not found in common columns, skipping`);
      return { synced: 0, errors: 0 };
    }
    
    // Get existing PKs in prod
    const existingPks = await prodClient.query(
      `SELECT "${pkColumn}" FROM "${tableName}"`
    );
    const existingPkSet = new Set(existingPks.rows.map(r => String(r[pkColumn])));
    
    // Get all rows from dev
    const colList = commonCols.map(c => `"${c}"`).join(', ');
    const devRows = await devClient.query(`SELECT ${colList} FROM "${tableName}"`);
    
    // Find rows that don't exist in prod
    const newRows = devRows.rows.filter(r => !existingPkSet.has(String(r[pkColumn])));
    
    if (newRows.length === 0) {
      console.log(`  No new rows to sync (${devRows.rows.length} in dev, ${existingPks.rows.length} in prod)`);
      return { synced: 0, errors: 0 };
    }
    
    console.log(`  Found ${newRows.length} new rows to sync`);
    
    // Insert new rows
    let synced = 0;
    let errors = 0;
    
    for (const row of newRows) {
      const values = commonCols.map(c => row[c]);
      const placeholders = commonCols.map((_, i) => `$${i + 1}`).join(', ');
      
      try {
        await prodClient.query(
          `INSERT INTO "${tableName}" (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          values
        );
        synced++;
      } catch (err) {
        console.log(`  Error inserting row: ${err.message}`);
        errors++;
      }
    }
    
    console.log(`  Synced ${synced} rows, ${errors} errors`);
    return { synced, errors };
    
  } catch (err) {
    console.log(`  Error syncing ${tableName}: ${err.message}`);
    return { synced: 0, errors: 1 };
  }
}

async function main() {
  console.log('=== SYNCING DEV DATA TO PRODUCTION ===\n');
  console.log('This will copy new rows from dev to prod (not overwrite existing data)\n');
  
  const devClient = new Client({ connectionString: process.env.DATABASE_URL });
  const prodClient = new Client({ connectionString: process.env.PROD_DATABASE_URL });
  
  try {
    await devClient.connect();
    await prodClient.connect();
    
    const devUrl = new URL(process.env.DATABASE_URL);
    const prodUrl = new URL(process.env.PROD_DATABASE_URL);
    console.log('Source (dev):', devUrl.host);
    console.log('Target (prod):', prodUrl.host);
    
    let totalSynced = 0;
    let totalErrors = 0;
    
    for (const table of TABLES_TO_SYNC) {
      const result = await syncTable(devClient, prodClient, table.name, table.pk);
      totalSynced += result.synced;
      totalErrors += result.errors;
    }
    
    console.log('\n=== SYNC COMPLETE ===');
    console.log(`Total rows synced: ${totalSynced}`);
    console.log(`Total errors: ${totalErrors}`);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await devClient.end();
    await prodClient.end();
  }
}

main().catch(console.error);
