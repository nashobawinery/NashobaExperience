import { neon } from '@neondatabase/serverless';

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

async function validateSchema() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found. Cannot validate schema.');
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  
  console.log('\n🔍 SCHEMA VALIDATION TOOL');
  console.log('━'.repeat(60));
  console.log('Comparing database structure to Drizzle schema...\n');

  try {
    // Get all tables from the database
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const dbTables = tablesResult.map((r: any) => r.table_name);
    
    // Get column info for all tables
    const columnsResult = await sql`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `;

    // Group columns by table
    const tableColumns: Record<string, ColumnInfo[]> = {};
    for (const col of columnsResult) {
      if (!tableColumns[col.table_name]) {
        tableColumns[col.table_name] = [];
      }
      tableColumns[col.table_name].push({
        column_name: col.column_name,
        data_type: col.data_type,
        is_nullable: col.is_nullable,
        column_default: col.column_default
      });
    }

    // Read the Drizzle schema
    const fs = await import('fs');
    const path = await import('path');
    const schemaPath = path.join(process.cwd(), 'shared', 'schema.ts');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

    // Extract table names from pgTable definitions
    const tableRegex = /pgTable\s*\(\s*["']([^"']+)["']/g;
    const schemaTables: string[] = [];
    let match;
    while ((match = tableRegex.exec(schemaContent)) !== null) {
      schemaTables.push(match[1]);
    }

    // Parse columns from schema more thoroughly
    // Look for patterns like: columnName: type("db_column_name")
    const schemaTableColumns: Record<string, string[]> = {};
    
    // Split schema into table blocks
    const lines = schemaContent.split('\n');
    let currentTable: string | null = null;
    let braceDepth = 0;
    let inTable = false;
    
    for (const line of lines) {
      // Check for table start
      const tableMatch = line.match(/pgTable\s*\(\s*["']([^"']+)["']/);
      if (tableMatch) {
        currentTable = tableMatch[1];
        schemaTableColumns[currentTable] = [];
        inTable = true;
        braceDepth = 0;
      }
      
      if (inTable && currentTable) {
        // Count braces to know when table ends
        braceDepth += (line.match(/\{/g) || []).length;
        braceDepth -= (line.match(/\}/g) || []).length;
        
        // Look for column definitions - various patterns
        // Pattern 1: columnName: type("db_name")
        // Pattern 2: columnName: type("db_name", ...)
        // Pattern 3: columnName: type("db_name").method()
        const colPatterns = [
          /^\s*(\w+):\s*\w+\s*\(\s*["']([^"']+)["']/,
          /^\s*(\w+):\s*\w+Enum\s*\(\s*["']([^"']+)["']/,
        ];
        
        for (const pattern of colPatterns) {
          const colMatch = line.match(pattern);
          if (colMatch) {
            const dbColumnName = colMatch[2];
            if (!schemaTableColumns[currentTable].includes(dbColumnName)) {
              schemaTableColumns[currentTable].push(dbColumnName);
            }
            break;
          }
        }
        
        // End of table definition
        if (braceDepth <= 0 && line.includes('});')) {
          inTable = false;
          currentTable = null;
        }
      }
    }

    // Compare tables
    const missingInSchema = dbTables.filter((t: string) => !schemaTables.includes(t));
    const missingInDb = schemaTables.filter(t => !dbTables.includes(t));

    let hasIssues = false;
    let criticalIssues = false;

    // Report tables in database but not in schema
    if (missingInSchema.length > 0) {
      hasIssues = true;
      criticalIssues = true;
      console.log('⛔ TABLES IN DATABASE BUT NOT IN SCHEMA:');
      console.log('   (These will cause "delete table" warnings when publishing)');
      console.log('   ─'.repeat(30));
      for (const table of missingInSchema) {
        console.log(`   📋 ${table}`);
      }
      console.log('');
    }

    // Report tables in schema but not in database (info only, not critical)
    if (missingInDb.length > 0) {
      console.log('ℹ️  TABLES IN SCHEMA BUT NOT IN DATABASE:');
      console.log('   (These will be created - this is OK)');
      console.log('   ─'.repeat(30));
      for (const table of missingInDb) {
        console.log(`   📋 ${table}`);
      }
      console.log('');
    }

    // Compare columns for tables that exist in both
    const commonTables = dbTables.filter((t: string) => schemaTables.includes(t));
    const columnMismatches: { table: string; inDbOnly: string[]; inSchemaOnly: string[] }[] = [];

    for (const table of commonTables) {
      const dbCols = tableColumns[table]?.map(c => c.column_name) || [];
      const schemaCols = schemaTableColumns[table] || [];
      
      // Only flag columns in DB but not in schema (these get deleted)
      const inDbOnly = dbCols.filter(c => !schemaCols.includes(c));
      const inSchemaOnly = schemaCols.filter(c => !dbCols.includes(c));
      
      if (inDbOnly.length > 0) {
        columnMismatches.push({ table, inDbOnly, inSchemaOnly });
      }
    }

    if (columnMismatches.length > 0) {
      hasIssues = true;
      criticalIssues = true;
      console.log('⛔ COLUMNS IN DATABASE BUT NOT IN SCHEMA:');
      console.log('   (These will be DELETED on publish!)');
      console.log('   ─'.repeat(30));
      
      for (const mismatch of columnMismatches) {
        console.log(`\n   📋 Table: ${mismatch.table}`);
        for (const col of mismatch.inDbOnly) {
          console.log(`      - ${col}`);
        }
      }
      console.log('');
    }

    // Summary
    console.log('━'.repeat(60));
    if (criticalIssues) {
      console.log('⛔ SCHEMA VALIDATION FAILED - DO NOT PUBLISH');
      console.log('');
      console.log('To fix:');
      console.log('  1. Add missing tables/columns to shared/schema.ts');
      console.log('  2. Restart the application');
      console.log('  3. Run: npx tsx scripts/validate-schema.ts');
      console.log('');
      console.log('Only publish when validation passes.');
      process.exit(1);
    } else if (hasIssues) {
      console.log('⚠️  SCHEMA VALIDATION PASSED WITH WARNINGS');
      console.log('   Minor differences found but safe to publish.');
      process.exit(0);
    } else {
      console.log('✅ SCHEMA VALIDATION PASSED');
      console.log('   Database structure matches Drizzle schema.');
      console.log('   Safe to publish!');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Error during validation:', error);
    process.exit(1);
  }
}

validateSchema();
