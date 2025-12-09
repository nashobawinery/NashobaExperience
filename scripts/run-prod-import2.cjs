const { Client } = require('pg');

async function runImport() {
  const client = new Client({ connectionString: process.env.PROD_DATABASE_URL });
  await client.connect();

  // Get clubs from dev
  const devClient = new Client({ connectionString: process.env.DATABASE_URL });
  await devClient.connect();
  
  const clubs = await devClient.query('SELECT * FROM resy_clubs');
  const hours = await devClient.query('SELECT * FROM resy_operating_hours');
  
  let success = 0, skipped = 0;
  
  // Insert clubs
  console.log('=== CLUBS ===');
  for (const r of clubs.rows) {
    const cols = Object.keys(r).filter(k => r[k] !== null);
    const vals = cols.map(c => {
      const v = r[c];
      if (typeof v === 'boolean') return v;
      if (typeof v === 'number') return v;
      if (v instanceof Date) return v.toISOString();
      return String(v).replace(/'/g, '');
    });
    const placeholders = cols.map((_, i) => `$${i+1}`).join(', ');
    try {
      await client.query(`INSERT INTO resy_clubs (${cols.join(', ')}) VALUES (${placeholders})`, vals);
      console.log(`✓ ${r.name}`);
      success++;
    } catch (err) {
      if (err.code === '23505') {
        console.log(`⊘ Already exists: ${r.name}`);
        skipped++;
      } else {
        console.log(`✗ ${r.name}: ${err.message}`);
      }
    }
  }
  
  // Insert operating hours
  console.log('\n=== OPERATING HOURS ===');
  for (const r of hours.rows) {
    const cols = Object.keys(r).filter(k => r[k] !== null);
    const vals = cols.map(c => {
      const v = r[c];
      if (typeof v === 'boolean') return v;
      if (typeof v === 'number') return v;
      if (v instanceof Date) return v.toISOString();
      return String(v).replace(/'/g, '');
    });
    const placeholders = cols.map((_, i) => `$${i+1}`).join(', ');
    try {
      await client.query(`INSERT INTO resy_operating_hours (${cols.join(', ')}) VALUES (${placeholders})`, vals);
      success++;
    } catch (err) {
      if (err.code === '23505') skipped++;
      else console.log(`✗ Error: ${err.message}`);
    }
  }
  console.log(`Operating hours: inserted ${success - clubs.rows.length}, skipped duplicates`);
  
  // Final counts
  const clubCount = await client.query('SELECT COUNT(*) FROM resy_clubs');
  const hoursCount = await client.query('SELECT COUNT(*) FROM resy_operating_hours');
  
  console.log(`\n=== PRODUCTION COUNTS ===`);
  console.log(`Clubs: ${clubCount.rows[0].count}`);
  console.log(`Operating Hours: ${hoursCount.rows[0].count}`);
  
  await devClient.end();
  await client.end();
}

runImport().catch(console.error);
