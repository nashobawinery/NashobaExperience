/**
 * Inspect the Resy Excel export to see what sheets and data are available
 */
const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'attached_assets/nashoba-dev-sync-2025-12-08_1765235887028.xlsx';

if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

const workbook = XLSX.readFile(filePath);

console.log('\n=== Excel Workbook Contents ===\n');
console.log('Sheet Names:', workbook.SheetNames);
console.log('\nSheet Details:\n');

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  console.log(`\n--- ${sheetName} ---`);
  console.log(`Row count: ${data.length}`);
  if (data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
    console.log('Sample row:', JSON.stringify(data[0], null, 2));
  }
}
