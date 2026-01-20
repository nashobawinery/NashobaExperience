const { Client } = require('pg');

async function compare() {
  console.log('=== DATABASE COMPARISON ===\n');
  
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
    
    // Get all tables from both databases
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
    
    // Find tables only in dev
    const devOnly = [...devTableNames].filter(t => !prodTableNames.has(t));
    if (devOnly.length > 0) {
      console.log('Tables ONLY in Dev:', devOnly.length);
      devOnly.forEach(t => console.log('  - ' + t));
      console.log('');
    }
    
    // Find tables only in prod
    const prodOnly = [...prodTableNames].filter(t => !devTableNames.has(t));
    if (prodOnly.length > 0) {
      console.log('Tables ONLY in Prod:', prodOnly.length);
      prodOnly.forEach(t => console.log('  - ' + t));
      console.log('');
    }
    
    // Compare row counts for tables in both
    const commonTables = [...devTableNames].filter(t => prodTableNames.has(t));
    console.log(`Comparing ${commonTables.length} common tables:\n`);
    
    const differences = [];
    const devOnlyData = [];
    const prodOnlyData = [];
    
    for (const table of commonTables) {
      try {
        const devCount = await devClient.query(`SELECT COUNT(*) as count FROM "${table}"`);
        const prodCount = await prodClient.query(`SELECT COUNT(*) as count FROM "${table}"`);
        
        const dev = parseInt(devCount.rows[0].count);
        const prod = parseInt(prodCount.rows[0].count);
        
        if (dev !== prod) {
          const diff = { table, dev, prod, diff: dev - prod };
          differences.push(diff);
          
          if (dev > prod) {
            devOnlyData.push(diff);
          } else {
            prodOnlyData.push(diff);
          }
        }
      } catch (err) {
        console.log(`  Error comparing ${table}: ${err.message}`);
      }
    }
    
    if (differences.length === 0) {
      console.log('All common tables have identical row counts!');
    } else {
      console.log('TABLES WITH DIFFERENT ROW COUNTS:\n');
      console.log('Table'.padEnd(50) + 'Dev'.padEnd(10) + 'Prod'.padEnd(10) + 'Diff');
      console.log('-'.repeat(80));
      
      differences.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
      
      for (const d of differences) {
        const sign = d.diff > 0 ? '+' : '';
        console.log(
          d.table.padEnd(50) + 
          String(d.dev).padEnd(10) + 
          String(d.prod).padEnd(10) + 
          sign + d.diff
        );
      }
      
      console.log('\n--- SUMMARY ---');
      console.log(`Tables with more data in DEV: ${devOnlyData.length}`);
      console.log(`Tables with more data in PROD: ${prodOnlyData.length}`);
      
      if (devOnlyData.length > 0) {
        console.log('\nDev has more data in:');
        devOnlyData.forEach(d => console.log(`  ${d.table}: +${d.diff} rows`));
      }
      
      if (prodOnlyData.length > 0) {
        console.log('\nProd has more data in:');
        prodOnlyData.forEach(d => console.log(`  ${d.table}: +${Math.abs(d.diff)} rows`));
      }
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await devClient.end();
    await prodClient.end();
  }
}

compare().catch(console.error);
