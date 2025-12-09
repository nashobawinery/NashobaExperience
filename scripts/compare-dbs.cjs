const { Client } = require('pg');

async function compare() {
  // Dev database
  const devClient = new Client({ connectionString: process.env.DATABASE_URL });
  await devClient.connect();
  const devCount = await devClient.query('SELECT COUNT(*) FROM resy_experiences');
  console.log('Dev experiences:', devCount.rows[0].count);
  
  // Check the actual connection string (just the host part for comparison)
  const devUrl = new URL(process.env.DATABASE_URL);
  console.log('Dev host:', devUrl.host);
  
  // Prod database
  if (process.env.PROD_DATABASE_URL) {
    const prodClient = new Client({ connectionString: process.env.PROD_DATABASE_URL });
    await prodClient.connect();
    const prodCount = await prodClient.query('SELECT COUNT(*) FROM resy_experiences');
    console.log('Prod experiences:', prodCount.rows[0].count);
    
    const prodUrl = new URL(process.env.PROD_DATABASE_URL);
    console.log('Prod host:', prodUrl.host);
    
    await prodClient.end();
  } else {
    console.log('PROD_DATABASE_URL not set');
  }
  
  await devClient.end();
}
compare().catch(console.error);
