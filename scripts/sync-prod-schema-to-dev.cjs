const { Client } = require('pg');

async function syncSchema() {
  console.log('=== SYNCING PRODUCTION SCHEMA TO DEV ===\n');
  console.log('This will create missing tables in dev to match production.\n');
  
  const devClient = new Client({ connectionString: process.env.DATABASE_URL });
  const prodClient = new Client({ connectionString: process.env.PROD_DATABASE_URL });
  
  try {
    await devClient.connect();
    await prodClient.connect();
    
    const devUrl = new URL(process.env.DATABASE_URL);
    const prodUrl = new URL(process.env.PROD_DATABASE_URL);
    console.log('Dev host:', devUrl.host);
    console.log('Prod host:', prodUrl.host);
    console.log('');
    
    // Get tables from both databases
    const tableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    const devTables = await devClient.query(tableQuery);
    const prodTables = await prodClient.query(tableQuery);
    
    const devTableNames = new Set(devTables.rows.map(r => r.table_name));
    const prodTableNames = new Set(prodTables.rows.map(r => r.table_name));
    
    // Find tables only in prod that need to be created in dev
    const prodOnly = [...prodTableNames].filter(t => !devTableNames.has(t));
    
    if (prodOnly.length === 0) {
      console.log('All production tables already exist in dev!');
      return;
    }
    
    console.log(`Found ${prodOnly.length} tables to create in dev:`);
    prodOnly.forEach(t => console.log('  - ' + t));
    console.log('');
    
    // For each missing table, get the CREATE TABLE statement from prod
    for (const tableName of prodOnly) {
      console.log(`\nCreating table: ${tableName}`);
      
      try {
        // Get column definitions from prod
        const columnsQuery = `
          SELECT 
            column_name,
            data_type,
            character_maximum_length,
            is_nullable,
            column_default,
            udt_name
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `;
        const columns = await prodClient.query(columnsQuery, [tableName]);
        
        if (columns.rows.length === 0) {
          console.log(`  Skipping ${tableName} - no columns found`);
          continue;
        }
        
        // Build CREATE TABLE statement
        const columnDefs = columns.rows.map(col => {
          let def = `"${col.column_name}" `;
          
          // Handle data types
          if (col.data_type === 'ARRAY') {
            def += col.udt_name.replace('_', '') + '[]';
          } else if (col.data_type === 'character varying') {
            def += col.character_maximum_length 
              ? `varchar(${col.character_maximum_length})`
              : 'varchar';
          } else if (col.data_type === 'timestamp with time zone') {
            def += 'timestamptz';
          } else if (col.data_type === 'timestamp without time zone') {
            def += 'timestamp';
          } else if (col.data_type === 'USER-DEFINED') {
            def += col.udt_name;
          } else {
            def += col.data_type;
          }
          
          // Handle nullability
          if (col.is_nullable === 'NO') {
            def += ' NOT NULL';
          }
          
          // Handle defaults (but skip sequences for now as they might not exist)
          if (col.column_default && !col.column_default.includes('nextval')) {
            def += ` DEFAULT ${col.column_default}`;
          }
          
          return def;
        }).join(',\n  ');
        
        // Get primary key
        const pkQuery = `
          SELECT c.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
          JOIN information_schema.columns c 
            ON c.table_name = tc.table_name AND c.column_name = ccu.column_name
          WHERE tc.constraint_type = 'PRIMARY KEY' 
            AND tc.table_name = $1
            AND tc.table_schema = 'public'
        `;
        const pkResult = await prodClient.query(pkQuery, [tableName]);
        
        let pkConstraint = '';
        if (pkResult.rows.length > 0) {
          const pkCols = pkResult.rows.map(r => `"${r.column_name}"`).join(', ');
          pkConstraint = `,\n  PRIMARY KEY (${pkCols})`;
        }
        
        const createSql = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n  ${columnDefs}${pkConstraint}\n)`;
        
        // Execute on dev
        await devClient.query(createSql);
        console.log(`  ✓ Created ${tableName}`);
        
      } catch (err) {
        console.log(`  ✗ Error creating ${tableName}: ${err.message}`);
      }
    }
    
    console.log('\n=== SCHEMA SYNC COMPLETE ===');
    
    // Verify
    const verifyTables = await devClient.query(tableQuery);
    const verifySet = new Set(verifyTables.rows.map(r => r.table_name));
    const stillMissing = prodOnly.filter(t => !verifySet.has(t));
    
    if (stillMissing.length === 0) {
      console.log('All production tables now exist in dev!');
    } else {
      console.log(`Still missing: ${stillMissing.join(', ')}`);
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await devClient.end();
    await prodClient.end();
  }
}

syncSchema().catch(console.error);
