const { Client } = require('pg');

async function check() {
  const devUrl = new URL(process.env.DATABASE_URL);
  const prodUrl = new URL(process.env.PROD_DATABASE_URL);
  
  console.log('Dev database:', devUrl.pathname.slice(1));  // Remove leading /
  console.log('Prod database:', prodUrl.pathname.slice(1));
  
  console.log('\nDev username:', devUrl.username);
  console.log('Prod username:', prodUrl.username);
}
check().catch(console.error);
