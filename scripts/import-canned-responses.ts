import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { db } from '../server/db';
import { supportCannedResponses } from '../shared/schema';

async function importCannedResponses() {
  const csvPath = 'attached_assets/canned_responses-January-15-2026-18_46_1768502986529.csv';
  
  console.log('Reading CSV file...');
  const csvContent = readFileSync(csvPath, 'utf-8');
  
  console.log('Parsing CSV...');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true
  });
  
  console.log(`Found ${records.length} canned responses to import`);
  
  let imported = 0;
  let skipped = 0;
  
  for (const record of records) {
    const title = record['Title']?.trim();
    const content = record['Content']?.trim();
    const category = record['Folder Name']?.trim() || 'General';
    
    if (!title || !content) {
      console.log(`Skipping record - missing title or content`);
      skipped++;
      continue;
    }
    
    try {
      await db.insert(supportCannedResponses).values({
        title,
        answer: content,
        category,
        isActive: true,
        usageCount: 0
      });
      imported++;
      console.log(`Imported: ${title} (${category})`);
    } catch (error: any) {
      console.error(`Error importing "${title}":`, error.message);
      skipped++;
    }
  }
  
  console.log(`\nImport complete!`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);
  
  process.exit(0);
}

importCannedResponses().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
