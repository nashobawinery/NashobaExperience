import { neon } from '@neondatabase/serverless';

const sourceUrl = 'postgresql://neondb_owner:npg_hHie6FSPA1MV@ep-winter-surf-ahug183e.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';
const targetUrl = process.env.DATABASE_URL;

if (!targetUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sourceDb = neon(sourceUrl);
const targetDb = neon(targetUrl);

function escapeValue(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "'{}'::text[]";
    return `ARRAY[${value.map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : escapeValue(v)).join(',')}]::text[]`;
  }
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function copyTable(tableName: string) {
  try {
    const selectQuery = `SELECT * FROM "${tableName}"`;
    const data: any[] = await sourceDb(selectQuery as any);
    
    if (data.length === 0) {
      console.log(`${tableName}: 0 rows (skipped)`);
      return 0;
    }
    
    const columns = Object.keys(data[0]);
    
    let inserted = 0;
    for (const row of data) {
      const values = columns.map(col => escapeValue(row[col]));
      const colNames = columns.map(c => `"${c}"`).join(', ');
      const valuesStr = values.join(', ');
      
      const insertQuery = `INSERT INTO "${tableName}" (${colNames}) VALUES (${valuesStr}) ON CONFLICT DO NOTHING`;
      
      try {
        await targetDb(insertQuery as any);
        inserted++;
      } catch (err: any) {
        console.error(`  Error inserting row in ${tableName}:`, err.message);
      }
    }
    
    console.log(`${tableName}: ${inserted}/${data.length} rows imported`);
    return inserted;
  } catch (error: any) {
    console.error(`Error copying ${tableName}:`, error.message);
    return 0;
  }
}

async function main() {
  const tables = [
    'resy_users',
    'resy_locations',
    'resy_experiences',
    'resy_clubs',
    'resy_customers',
    'resy_reservations',
    'resy_time_slots',
    'resy_waitlist',
    'resy_customer_visits',
    'resy_meal_periods',
    'resy_operating_hours',
    'resy_special_dates',
    'resy_location_tables',
    'resy_flow_controls',
    'resy_turn_time_settings',
    'resy_experience_discounts',
    'resy_club_experience_discounts',
    'resy_private_events',
    'resy_site_settings',
    'resy_footer_links',
    'resy_sessions'
  ];
  
  console.log('Starting data migration...\n');
  
  let totalImported = 0;
  for (const table of tables) {
    const count = await copyTable(table);
    totalImported += count;
  }
  
  console.log('\nMigration complete! Total rows imported: ' + totalImported);
}

main().catch(console.error);
