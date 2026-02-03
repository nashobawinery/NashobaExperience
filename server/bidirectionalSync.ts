import { db } from './db';
import { sql } from 'drizzle-orm';
import { SYNC_TABLES, SyncTableConfig, DataType, SyncModule } from './syncRegistry';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import crypto from 'crypto';

neonConfig.webSocketConstructor = ws;

export type SyncDirection = 'dev_to_prod' | 'prod_to_dev' | 'bidirectional';
export type RecordState = 'dev_newer' | 'prod_newer' | 'conflict' | 'identical' | 'dev_only' | 'prod_only';

export interface SyncRecord {
  tableId: string;
  businessKey: Record<string, any>;
  devData: Record<string, any> | null;
  prodData: Record<string, any> | null;
  devUpdatedAt: Date | null;
  prodUpdatedAt: Date | null;
  devHash: string | null;
  prodHash: string | null;
  state: RecordState;
  recommendation: 'keep_dev' | 'keep_prod' | 'manual_review';
  selected: 'dev' | 'prod' | 'skip';
}

export interface TableSyncSummary {
  tableId: string;
  tableName: string;
  module: SyncModule;
  dataType: DataType;
  devCount: number;
  prodCount: number;
  devNewer: number;
  prodNewer: number;
  conflicts: number;
  identical: number;
  devOnly: number;
  prodOnly: number;
  records: SyncRecord[];
}

export interface SyncScanResult {
  scanId: string;
  scannedAt: Date;
  tables: TableSyncSummary[];
  totalDevNewer: number;
  totalProdNewer: number;
  totalConflicts: number;
  totalIdentical: number;
}

export interface SyncApplyResult {
  success: boolean;
  appliedToDevCount: number;
  appliedToProdCount: number;
  errors: Array<{ tableId: string; error: string }>;
}

function computeContentHash(data: Record<string, any>, fields: string[], debugLabel?: string): string {
  // Normalize record keys to camelCase for consistent hashing
  const normalizedData = normalizeRecordKeys(data);
  const sortedData: Record<string, any> = {};
  for (const field of fields.sort()) {
    if (normalizedData[field] !== undefined) {
      sortedData[field] = normalizedData[field];
    }
  }
  const json = JSON.stringify(sortedData, (_, v) => {
    if (v instanceof Date) return v.toISOString();
    if (typeof v === 'bigint') return v.toString();
    return v;
  });
  const hash = crypto.createHash('md5').update(json).digest('hex');
  
  // Debug logging for conflict diagnosis
  if (debugLabel) {
    console.log(`[Sync Debug] ${debugLabel} hash=${hash.substring(0,8)} json=${json}`);
  }
  
  return hash;
}

// Convert snake_case to camelCase
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Convert camelCase to snake_case
function camelToSnake(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

// Normalize record keys to camelCase for consistent comparison
function normalizeRecordKeys(record: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  for (const [key, value] of Object.entries(record)) {
    const camelKey = snakeToCamel(key);
    normalized[camelKey] = value;
  }
  return normalized;
}

function getBusinessKeyValue(record: Record<string, any>, businessKeys: string[]): Record<string, any> {
  // First normalize the record keys to camelCase
  const normalizedRecord = normalizeRecordKeys(record);
  const keyValue: Record<string, any> = {};
  for (const key of businessKeys) {
    keyValue[key] = normalizedRecord[key];
  }
  return keyValue;
}

function businessKeyToString(keyValue: Record<string, any>): string {
  return JSON.stringify(keyValue, Object.keys(keyValue).sort());
}

function determineRecordState(
  devRecord: Record<string, any> | null,
  prodRecord: Record<string, any> | null,
  devHash: string | null,
  prodHash: string | null,
  devUpdatedAt: Date | null,
  prodUpdatedAt: Date | null
): RecordState {
  if (!devRecord && !prodRecord) return 'identical';
  if (!devRecord && prodRecord) return 'prod_only';
  if (devRecord && !prodRecord) return 'dev_only';
  
  if (devHash === prodHash) return 'identical';
  
  if (devUpdatedAt && prodUpdatedAt) {
    const devTime = devUpdatedAt.getTime();
    const prodTime = prodUpdatedAt.getTime();
    const threshold = 1000;
    
    if (Math.abs(devTime - prodTime) <= threshold) {
      return 'conflict';
    }
    return devTime > prodTime ? 'dev_newer' : 'prod_newer';
  }
  
  return 'conflict';
}

function getRecommendation(
  state: RecordState,
  dataType: DataType
): 'keep_dev' | 'keep_prod' | 'manual_review' {
  if (state === 'identical') return 'skip' as any;
  if (state === 'dev_only') return 'keep_dev';
  if (state === 'prod_only') return 'keep_prod';
  
  switch (dataType) {
    case 'reference':
      if (state === 'dev_newer') return 'keep_dev';
      if (state === 'prod_newer') return 'keep_prod';
      return 'manual_review';
    case 'configuration':
      return 'manual_review';
    case 'user_generated':
    case 'transactional':
      return state === 'prod_newer' ? 'keep_prod' : 'manual_review';
    default:
      return 'manual_review';
  }
}

function getDefaultSelection(
  state: RecordState,
  recommendation: 'keep_dev' | 'keep_prod' | 'manual_review'
): 'dev' | 'prod' | 'skip' {
  if (state === 'identical') return 'skip';
  if (recommendation === 'keep_dev') return 'dev';
  if (recommendation === 'keep_prod') return 'prod';
  return 'skip';
}

async function fetchTableData(
  tableName: string,
  fields: string[],
  businessKeys: string[]
): Promise<Record<string, any>[]> {
  const allFieldsSet = new Set([...fields, ...businessKeys, 'id', 'createdAt', 'updatedAt']);
  const allFields = Array.from(allFieldsSet);
  const validFields = allFields.filter(f => f);
  
  const tableNameSnake = tableName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  
  try {
    const result = await db.execute(sql.raw(`
      SELECT * FROM "${tableNameSnake}" LIMIT 10000
    `));
    return result.rows as Record<string, any>[];
  } catch (error: any) {
    if (error.message?.includes('does not exist')) {
      return [];
    }
    throw error;
  }
}

export async function scanForDifferences(
  tableIds?: string[]
): Promise<SyncScanResult> {
  const scanId = crypto.randomUUID();
  const tables: TableSyncSummary[] = [];
  
  let totalDevNewer = 0;
  let totalProdNewer = 0;
  let totalConflicts = 0;
  let totalIdentical = 0;
  
  const tablesToScan = tableIds 
    ? SYNC_TABLES.filter(t => tableIds.includes(t.id) && !t.excludeFromSync)
    : SYNC_TABLES.filter(t => !t.excludeFromSync);
  
  for (const tableConfig of tablesToScan) {
    try {
      const devRecords = await fetchTableData(
        tableConfig.id,
        tableConfig.exportFields,
        tableConfig.businessKey
      );
      
      const devByKey = new Map<string, Record<string, any>>();
      for (const record of devRecords) {
        const keyValue = getBusinessKeyValue(record, tableConfig.businessKey);
        const keyString = businessKeyToString(keyValue);
        devByKey.set(keyString, record);
      }
      
      const records: SyncRecord[] = [];
      let devNewer = 0, prodNewer = 0, conflicts = 0, identical = 0, devOnly = 0, prodOnly = 0;
      
      for (const [keyString, devRecord] of Array.from(devByKey.entries())) {
        const keyValue = getBusinessKeyValue(devRecord, tableConfig.businessKey);
        const devHash = computeContentHash(devRecord, tableConfig.exportFields);
        const devUpdatedAt = devRecord.updatedAt ? new Date(devRecord.updatedAt) : 
                             devRecord.createdAt ? new Date(devRecord.createdAt) : null;
        
        const state: RecordState = 'dev_only';
        devOnly++;
        
        const recommendation = getRecommendation(state, tableConfig.dataType);
        const selected = getDefaultSelection(state, recommendation);
        
        records.push({
          tableId: tableConfig.id,
          businessKey: keyValue,
          devData: devRecord,
          prodData: null,
          devUpdatedAt,
          prodUpdatedAt: null,
          devHash,
          prodHash: null,
          state,
          recommendation,
          selected,
        });
      }
      
      tables.push({
        tableId: tableConfig.id,
        tableName: tableConfig.name,
        module: tableConfig.module,
        dataType: tableConfig.dataType,
        devCount: devRecords.length,
        prodCount: 0,
        devNewer,
        prodNewer,
        conflicts,
        identical,
        devOnly,
        prodOnly,
        records,
      });
      
      totalDevNewer += devNewer;
      totalProdNewer += prodNewer;
      totalConflicts += conflicts;
      totalIdentical += identical;
      
    } catch (error: any) {
      console.error(`Error scanning table ${tableConfig.id}:`, error.message);
    }
  }
  
  return {
    scanId,
    scannedAt: new Date(),
    tables,
    totalDevNewer,
    totalProdNewer,
    totalConflicts,
    totalIdentical,
  };
}

export async function getTablePreview(
  tableId: string,
  limit: number = 100
): Promise<{
  tableConfig: SyncTableConfig | undefined;
  devRecords: Record<string, any>[];
  prodRecords: Record<string, any>[];
  comparison: SyncRecord[];
}> {
  const tableConfig = SYNC_TABLES.find(t => t.id === tableId);
  if (!tableConfig) {
    return { tableConfig: undefined, devRecords: [], prodRecords: [], comparison: [] };
  }
  
  const devRecords = await fetchTableData(
    tableConfig.id,
    tableConfig.exportFields,
    tableConfig.businessKey
  );
  
  const comparison: SyncRecord[] = devRecords.slice(0, limit).map(devRecord => {
    const keyValue = getBusinessKeyValue(devRecord, tableConfig.businessKey);
    const devHash = computeContentHash(devRecord, tableConfig.exportFields);
    const devUpdatedAt = devRecord.updatedAt ? new Date(devRecord.updatedAt) : 
                         devRecord.createdAt ? new Date(devRecord.createdAt) : null;
    
    return {
      tableId: tableConfig.id,
      businessKey: keyValue,
      devData: devRecord,
      prodData: null,
      devUpdatedAt,
      prodUpdatedAt: null,
      devHash,
      prodHash: null,
      state: 'dev_only' as RecordState,
      recommendation: 'keep_dev' as const,
      selected: 'dev' as const,
    };
  });
  
  return {
    tableConfig,
    devRecords: devRecords.slice(0, limit),
    prodRecords: [],
    comparison,
  };
}

export interface BidirectionalSyncConfig {
  prodDatabaseUrl: string;
  direction: SyncDirection;
  tableIds?: string[];
  dryRun?: boolean;
}

export async function connectToProductionDatabase(prodDatabaseUrl: string): Promise<boolean> {
  try {
    const pool = new Pool({ connectionString: prodDatabaseUrl });
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    await pool.end();
    return true;
  } catch (error: any) {
    console.error('Failed to connect to production database:', error.message);
    return false;
  }
}

// Helper to scan a single table with a fresh connection (prevents Neon timeouts)
async function scanSingleTable(
  tableConfig: typeof SYNC_TABLES[0],
  prodDatabaseUrl: string
): Promise<TableSyncSummary | null> {
  try {
    const devRecords = await fetchTableData(
      tableConfig.id,
      tableConfig.exportFields,
      tableConfig.businessKey
    );
    
    const tableNameSnake = tableConfig.id.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    
    let prodRecords: Record<string, any>[] = [];
    
    // Use a fresh short-lived connection for each table to prevent Neon timeouts
    const pool = new Pool({ 
      connectionString: prodDatabaseUrl,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 5000,
      max: 1
    });
    
    // Handle pool errors gracefully (prevents server crash)
    pool.on('error', (err) => {
      console.warn(`[Sync] Pool error for ${tableConfig.id}:`, err.message);
    });
    
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`SELECT * FROM "${tableNameSnake}" LIMIT 10000`);
        prodRecords = result.rows;
      } finally {
        client.release(true); // Force destroy connection
      }
    } catch (error: any) {
      if (!error.message?.includes('does not exist')) {
        console.warn(`[Sync] Warning: Could not read production table ${tableNameSnake}:`, error.message);
      }
    } finally {
      try { await pool.end(); } catch {} // Ignore end errors
    }
    
    const devByKey = new Map<string, Record<string, any>>();
    for (const record of devRecords) {
      const keyValue = getBusinessKeyValue(record, tableConfig.businessKey);
      const keyString = businessKeyToString(keyValue);
      devByKey.set(keyString, record);
    }
    
    // CRITICAL: Normalize production records from snake_case to camelCase before key extraction
    const normalizedProdRecords = prodRecords.map(r => normalizeRecordKeys(r));
    
    const prodByKey = new Map<string, Record<string, any>>();
    for (const record of normalizedProdRecords) {
      try {
        const keyValue = getBusinessKeyValue(record, tableConfig.businessKey);
        const keyString = businessKeyToString(keyValue);
        prodByKey.set(keyString, record);
      } catch (e: any) {
        // If business key extraction fails, log it for debugging
        console.warn(`[Sync] Failed to extract business key from prod record in ${tableConfig.id}:`, e.message);
      }
    }
    
    // SANITY CHECK: Log if row counts differ significantly
    if (devRecords.length !== prodRecords.length) {
      console.log(`[Sync] Row count mismatch in ${tableConfig.id}: dev=${devRecords.length}, prod=${prodRecords.length}`);
    }
    
    const allKeysSet = new Set([...Array.from(devByKey.keys()), ...Array.from(prodByKey.keys())]);
    const allKeys = Array.from(allKeysSet);
    const records: SyncRecord[] = [];
    let devNewer = 0, prodNewer = 0, conflicts = 0, identical = 0, devOnly = 0, prodOnly = 0;
    
    for (const keyString of allKeys) {
      const devRecord = devByKey.get(keyString) || null;
      const prodRecord = prodByKey.get(keyString) || null;
      
      const keyValue = devRecord 
        ? getBusinessKeyValue(devRecord, tableConfig.businessKey)
        : getBusinessKeyValue(prodRecord!, tableConfig.businessKey);
      
      const devHash = devRecord ? computeContentHash(devRecord, tableConfig.exportFields) : null;
      const prodHash = prodRecord ? computeContentHash(prodRecord, tableConfig.exportFields) : null;
      
      const devUpdatedAt = devRecord?.updatedAt ? new Date(devRecord.updatedAt) : 
                           devRecord?.createdAt ? new Date(devRecord.createdAt) : null;
      // prodRecord is now normalized to camelCase
      const prodUpdatedAt = prodRecord?.updatedAt ? new Date(prodRecord.updatedAt) : 
                            prodRecord?.createdAt ? new Date(prodRecord.createdAt) : null;
      
      const state = determineRecordState(devRecord, prodRecord, devHash, prodHash, devUpdatedAt, prodUpdatedAt);
      
      // Debug logging for meal periods conflicts
      if (tableConfig.id === 'resyMealPeriods' && state === 'conflict' && devHash && prodHash) {
        console.log(`[Sync Debug] ${tableConfig.id} key=${keyString} state=${state}`);
        computeContentHash(devRecord!, tableConfig.exportFields, `DEV ${keyString}`);
        computeContentHash(prodRecord!, tableConfig.exportFields, `PROD ${keyString}`);
      }
      
      switch (state) {
        case 'dev_newer': devNewer++; break;
        case 'prod_newer': prodNewer++; break;
        case 'conflict': conflicts++; break;
        case 'identical': identical++; break;
        case 'dev_only': devOnly++; break;
        case 'prod_only': prodOnly++; break;
      }
      
      const recommendation = getRecommendation(state, tableConfig.dataType);
      const selected = recommendation === 'keep_dev' ? 'dev' : 
                       recommendation === 'keep_prod' ? 'prod' : 'skip';
      
      records.push({
        tableId: tableConfig.id,
        businessKey: keyValue,
        state,
        recommendation,
        devUpdatedAt,
        prodUpdatedAt,
        devHash,
        prodHash,
        devData: devRecord,
        prodData: prodRecord,
        selected,
      });
    }
    
    // Log summary for tables with differences
    const hasDiff = devNewer > 0 || prodNewer > 0 || conflicts > 0 || devOnly > 0 || prodOnly > 0;
    if (hasDiff) {
      console.log(`[Sync] ${tableConfig.id}: dev=${devRecords.length}, prod=${prodRecords.length}, devNewer=${devNewer}, prodNewer=${prodNewer}, conflicts=${conflicts}, identical=${identical}, devOnly=${devOnly}, prodOnly=${prodOnly}`);
    }
    
    return {
      tableId: tableConfig.id,
      tableName: tableConfig.name,
      module: tableConfig.module,
      dataType: tableConfig.dataType,
      devCount: devRecords.length,
      prodCount: prodRecords.length,
      devNewer,
      prodNewer,
      conflicts,
      identical,
      devOnly,
      prodOnly,
      records: records.filter(r => r.state !== 'identical'),
    };
    
  } catch (error: any) {
    console.error(`[Sync] Error scanning table ${tableConfig.id}:`, error.message);
    return null;
  }
}

export async function scanBidirectional(
  config: BidirectionalSyncConfig
): Promise<SyncScanResult> {
  const scanId = crypto.randomUUID();
  const tables: TableSyncSummary[] = [];
  
  let totalDevNewer = 0;
  let totalProdNewer = 0;
  let totalConflicts = 0;
  let totalIdentical = 0;
  
  const tablesToScan = config.tableIds 
    ? SYNC_TABLES.filter(t => config.tableIds!.includes(t.id) && !t.excludeFromSync)
    : SYNC_TABLES.filter(t => !t.excludeFromSync);
  
  console.log(`[Sync] Scanning ${tablesToScan.length} tables in batches`);
  
  // Process tables in batches to prevent Neon connection timeouts
  const BATCH_SIZE = 5;
  for (let i = 0; i < tablesToScan.length; i += BATCH_SIZE) {
    const batch = tablesToScan.slice(i, i + BATCH_SIZE);
    console.log(`[Sync] Batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(tablesToScan.length/BATCH_SIZE)}: ${batch.map(t => t.id).join(', ')}`);
    
    // Process batch in parallel for speed
    const batchResults = await Promise.all(
      batch.map(tableConfig => scanSingleTable(tableConfig, config.prodDatabaseUrl))
    );
    
    for (const result of batchResults) {
      if (result) {
        tables.push(result);
        totalDevNewer += result.devNewer;
        totalProdNewer += result.prodNewer;
        totalConflicts += result.conflicts;
        totalIdentical += result.identical;
      }
    }
  }
  
  console.log(`[Sync] Scan complete: ${tables.length} tables scanned, ${totalDevNewer} dev newer, ${totalProdNewer} prod newer, ${totalConflicts} conflicts`);
  
  return {
    scanId,
    scannedAt: new Date(),
    tables,
    totalDevNewer,
    totalProdNewer,
    totalConflicts,
    totalIdentical,
  };
}

export async function applySync(
  config: BidirectionalSyncConfig,
  selections: Array<{
    tableId: string;
    businessKey: Record<string, any>;
    selected: 'dev' | 'prod' | 'skip';
  }>
): Promise<SyncApplyResult> {
  const { Pool } = await import('pg');
  const errors: Array<{ tableId: string; error: string }> = [];
  let appliedToDevCount = 0;
  let appliedToProdCount = 0;
  
  if (config.dryRun) {
    const toApplyToDev = selections.filter(s => s.selected === 'prod');
    const toApplyToProd = selections.filter(s => s.selected === 'dev');
    
    return {
      success: true,
      appliedToDevCount: toApplyToDev.length,
      appliedToProdCount: toApplyToProd.length,
      errors: [],
    };
  }
  
  // Use connection pool with better timeout settings for Neon serverless
  const prodPool = new Pool({ 
    connectionString: config.prodDatabaseUrl,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 3,
    allowExitOnIdle: true
  });
  
  try {
    for (const selection of selections) {
      if (selection.selected === 'skip') continue;
      
      const tableConfig = SYNC_TABLES.find(t => t.id === selection.tableId);
      if (!tableConfig) {
        errors.push({ tableId: selection.tableId, error: 'Table not found in registry' });
        continue;
      }
      
      try {
        if (selection.selected === 'prod') {
          appliedToDevCount++;
        } else if (selection.selected === 'dev') {
          appliedToProdCount++;
        }
      } catch (error: any) {
        errors.push({ tableId: selection.tableId, error: error.message });
      }
    }
    
  } finally {
    await prodPool.end();
  }
  
  return {
    success: errors.length === 0,
    appliedToDevCount,
    appliedToProdCount,
    errors,
  };
}

// Convert camelCase to snake_case for database column names
function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

// Convert snake_case to camelCase for reading from database
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Helper to safely escape identifiers (prevents SQL injection)
// Converts camelCase to snake_case for database columns
function escapeIdentifier(name: string): string {
  // Convert camelCase to snake_case for database
  const snakeName = toSnakeCase(name);
  // Validate: only allow alphanumeric and underscore
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(snakeName)) {
    throw new Error(`Invalid identifier: ${name}`);
  }
  return `"${snakeName}"`;
}

// Get the snake_case version of a field name for database operations
function getDbColumnName(fieldName: string): string {
  return toSnakeCase(fieldName);
}

// New function to apply sync operations with actual data copying
export async function applySyncOperations(
  prodDbUrl: string,
  operations: Array<{
    tableId: string;
    businessKey: Record<string, any>;
    direction: 'dev_to_prod' | 'prod_to_dev';
  }>,
  dryRun: boolean = false
): Promise<SyncApplyResult> {
  const errors: Array<{ tableId: string; error: string }> = [];
  let appliedToDevCount = 0;
  let appliedToProdCount = 0;
  
  // Group operations by table for efficiency
  const operationsByTable: Record<string, typeof operations> = {};
  for (const op of operations) {
    if (!operationsByTable[op.tableId]) {
      operationsByTable[op.tableId] = [];
    }
    operationsByTable[op.tableId].push(op);
  }
  
  if (Object.keys(operationsByTable).length === 0) {
    return { success: true, appliedToDevCount: 0, appliedToProdCount: 0, errors: [] };
  }
  
  // Create pools for both databases using Neon serverless driver
  const prodPool = new Pool({ connectionString: prodDbUrl });
  const devDbUrl = process.env.DATABASE_URL;
  if (!devDbUrl) {
    return { success: false, appliedToDevCount: 0, appliedToProdCount: 0, errors: [{ tableId: 'system', error: 'Development database URL not configured' }] };
  }
  const devPool = new Pool({ connectionString: devDbUrl });
  
  try {
    for (const tableId of Object.keys(operationsByTable)) {
      const tableOperations = operationsByTable[tableId];
      const tableConfig = SYNC_TABLES.find(t => t.id === tableId);
      if (!tableConfig) {
        errors.push({ tableId, error: 'Table not found in sync registry' });
        continue;
      }
      
      // Get table info - convert id to snake_case for database table name
      const tableName = toSnakeCase(tableConfig.id);
      const businessKeys = tableConfig.businessKey;
      const exportFields = tableConfig.exportFields || [];
      
      // Get all fields for the table - use Array.from to avoid Set iteration issues
      const allFieldsSet = new Set([...businessKeys, ...exportFields]);
      const allFields = Array.from(allFieldsSet);
      
      // Validate table and column names
      try {
        escapeIdentifier(tableName);
        for (const key of businessKeys) escapeIdentifier(key);
        for (const field of allFields) escapeIdentifier(field);
      } catch (err: any) {
        errors.push({ tableId, error: `Invalid table/column names: ${err.message}` });
        continue;
      }
      
      for (const op of tableOperations) {
        try {
          // Build WHERE clause for business key - properly parameterized
          const whereConditions = businessKeys.map((key, idx) => 
            `${escapeIdentifier(key)} = $${idx + 1}`
          ).join(' AND ');
          const whereValues = businessKeys.map(key => op.businessKey[key]);
          
          if (op.direction === 'dev_to_prod') {
            // Copy from dev to prod
            
            // First, fetch the record from dev using parameterized query
            const devQuery = `SELECT * FROM ${escapeIdentifier(tableName)} WHERE ${whereConditions}`;
            const devResult = await devPool.query(devQuery, whereValues);
            
            if (!devResult.rows || devResult.rows.length === 0) {
              errors.push({ tableId, error: `Record not found in dev: ${JSON.stringify(op.businessKey)}` });
              continue;
            }
            
            // Database returns snake_case columns - convert record keys to snake_case for access
            const devRecord = devResult.rows[0] as Record<string, any>;
            
            // Helper to get value from record using camelCase field name
            const getDbValue = (fieldName: string) => {
              const snakeName = toSnakeCase(fieldName);
              return devRecord[snakeName];
            };
            
            if (!dryRun) {
              // Get sensitive fields to exclude from sync (e.g., passwordHash)
              const sensitiveFields = tableConfig.sensitiveFields || [];
              
              // Get all columns that have values, excluding auto-generated and sensitive fields
              // Check both camelCase and snake_case versions of the field
              const columns = allFields.filter(f => {
                const val = getDbValue(f);
                return val !== undefined && f !== 'id' && f !== 'createdAt' && !sensitiveFields.includes(f);
              });
              
              if (columns.length === 0) {
                errors.push({ tableId, error: 'No syncable columns found' });
                continue;
              }
              
              // Helper to serialize values properly (handles Date, JSON objects/arrays)
              const serializeValue = (val: any) => {
                if (val instanceof Date) return val.toISOString();
                // Serialize objects and arrays as JSON strings for JSONB columns
                if (val !== null && typeof val === 'object') return JSON.stringify(val);
                return val;
              };
              
              // Build parameterized INSERT/UPDATE for production
              // escapeIdentifier already converts to snake_case
              const insertCols = columns.map(c => escapeIdentifier(c)).join(', ');
              const insertVals = columns.map((_, i) => `$${i + 1}`).join(', ');
              const values = columns.map(c => serializeValue(getDbValue(c)));
              
              // Check if record exists in prod
              const existsResult = await prodPool.query(
                `SELECT 1 FROM ${escapeIdentifier(tableName)} WHERE ${whereConditions}`,
                whereValues
              );
              
              if (existsResult.rows.length > 0) {
                // Update existing record in production
                const updateCols = columns.filter(c => !businessKeys.includes(c));
                if (updateCols.length > 0) {
                  const setClauses = updateCols.map((c, i) => 
                    `${escapeIdentifier(c)} = $${businessKeys.length + i + 1}`
                  ).join(', ');
                  const updateValues = [
                    ...whereValues,
                    ...updateCols.map(c => serializeValue(getDbValue(c)))
                  ];
                  
                  console.log(`[Sync] Updating ${tableName} in prod:`, { businessKey: op.businessKey });
                  await prodPool.query(
                    `UPDATE ${escapeIdentifier(tableName)} SET ${setClauses} WHERE ${whereConditions}`,
                    updateValues
                  );
                }
              } else {
                // Check if this table only allows updates (not inserts) due to required sensitive fields
                if (tableConfig.updateOnly) {
                  errors.push({ 
                    tableId, 
                    error: `Cannot insert new record - table requires sensitive fields. Create the record in production first, then sync. Business key: ${JSON.stringify(op.businessKey)}` 
                  });
                  continue;
                }
                // Insert new record in production
                console.log(`[Sync] Inserting into ${tableName} in prod:`, { businessKey: op.businessKey });
                await prodPool.query(
                  `INSERT INTO ${escapeIdentifier(tableName)} (${insertCols}) VALUES (${insertVals})`,
                  values
                );
              }
            }
            
            appliedToProdCount++;
            
          } else if (op.direction === 'prod_to_dev') {
            // Copy from prod to dev
            
            // Fetch the record from prod
            const prodResult = await prodPool.query(
              `SELECT * FROM ${escapeIdentifier(tableName)} WHERE ${whereConditions}`,
              whereValues
            );
            
            if (!prodResult.rows || prodResult.rows.length === 0) {
              errors.push({ tableId, error: `Record not found in prod: ${JSON.stringify(op.businessKey)}` });
              continue;
            }
            
            // Database returns snake_case columns
            const prodRecord = prodResult.rows[0] as Record<string, any>;
            
            // Debug: log what we fetched from production
            if (tableId === 'resyMealPeriods') {
              console.log(`[Sync Debug] Fetched from PROD for ${tableId}:`, JSON.stringify(prodRecord));
            }
            
            // Helper to get value from record using camelCase field name
            const getDbValue = (fieldName: string) => {
              const snakeName = toSnakeCase(fieldName);
              return prodRecord[snakeName];
            };
            
            if (!dryRun) {
              // Get sensitive fields to exclude from sync (e.g., passwordHash)
              const sensitiveFields = tableConfig.sensitiveFields || [];
              
              // Get all columns that have values, excluding auto-generated and sensitive fields
              const columns = allFields.filter(f => {
                const val = getDbValue(f);
                return val !== undefined && f !== 'id' && f !== 'createdAt' && !sensitiveFields.includes(f);
              });
              
              if (columns.length === 0) {
                errors.push({ tableId, error: 'No syncable columns found' });
                continue;
              }
              
              // Check if record exists in dev
              const devExistsQuery = `SELECT 1 FROM ${escapeIdentifier(tableName)} WHERE ${whereConditions}`;
              const existsResult = await devPool.query(devExistsQuery, whereValues);
              const existsInDev = existsResult.rows && existsResult.rows.length > 0;
              
              // Helper to serialize values properly (handles Date, JSON objects/arrays)
              const serializeValue = (val: any) => {
                if (val instanceof Date) return val.toISOString();
                // Serialize objects and arrays as JSON strings for JSONB columns
                if (val !== null && typeof val === 'object') return JSON.stringify(val);
                return val;
              };
              
              // Prepare values using getDbValue to read snake_case columns
              const values = columns.map(c => serializeValue(getDbValue(c)));
              
              if (existsInDev) {
                // Update existing record in dev
                const updateCols = columns.filter(c => !businessKeys.includes(c));
                if (updateCols.length > 0) {
                  const setClauses = updateCols.map((c, i) => 
                    `${escapeIdentifier(c)} = $${businessKeys.length + i + 1}`
                  ).join(', ');
                  const updateValues = [
                    ...whereValues,
                    ...updateCols.map(c => serializeValue(getDbValue(c)))
                  ];
                  
                  console.log(`[Sync] Updating ${tableName} in dev:`, { businessKey: op.businessKey, updateCols, updateValues });
                  const updateQuery = `UPDATE ${escapeIdentifier(tableName)} SET ${setClauses} WHERE ${whereConditions}`;
                  console.log(`[Sync] Update query: ${updateQuery}`);
                  const updateResult = await devPool.query(updateQuery, updateValues);
                  console.log(`[Sync] Update result: ${updateResult.rowCount} rows affected`);
                }
              } else {
                // Check if this table only allows updates (not inserts) due to required sensitive fields
                if (tableConfig.updateOnly) {
                  errors.push({ 
                    tableId, 
                    error: `Cannot insert new record - table requires sensitive fields. Create the record in dev first, then sync. Business key: ${JSON.stringify(op.businessKey)}` 
                  });
                  continue;
                }
                // Insert new record in dev
                const insertCols = columns.map(c => escapeIdentifier(c)).join(', ');
                const insertVals = columns.map((_, i) => `$${i + 1}`).join(', ');
                
                console.log(`[Sync] Inserting into ${tableName} in dev:`, { businessKey: op.businessKey });
                const insertQuery = `INSERT INTO ${escapeIdentifier(tableName)} (${insertCols}) VALUES (${insertVals})`;
                await devPool.query(insertQuery, values);
              }
            }
            
            appliedToDevCount++;
          }
        } catch (error: any) {
          console.error(`Error syncing ${tableId}:`, error);
          errors.push({ tableId, error: error.message || 'Unknown error' });
        }
      }
    }
    
  } finally {
    await prodPool.end();
    await devPool.end();
  }
  
  return {
    success: errors.length === 0,
    appliedToDevCount,
    appliedToProdCount,
    errors,
  };
}

export function getSyncSummary(scanResult: SyncScanResult): {
  totalTables: number;
  tablesWithDifferences: number;
  totalRecordsCompared: number;
  breakdown: {
    devNewer: number;
    prodNewer: number;
    conflicts: number;
    identical: number;
    devOnly: number;
    prodOnly: number;
  };
  byModule: Record<SyncModule, {
    tables: number;
    differences: number;
  }>;
  byDataType: Record<DataType, {
    tables: number;
    differences: number;
  }>;
} {
  const byModule: Record<SyncModule, { tables: number; differences: number }> = {
    tasting: { tables: 0, differences: 0 },
    b2b: { tables: 0, differences: 0 },
    lms: { tables: 0, differences: 0 },
    compliance: { tables: 0, differences: 0 },
    daily_reports: { tables: 0, differences: 0 },
    rbac: { tables: 0, differences: 0 },
    platform: { tables: 0, differences: 0 },
    reservation: { tables: 0, differences: 0 },
  };
  
  const byDataType: Record<DataType, { tables: number; differences: number }> = {
    reference: { tables: 0, differences: 0 },
    configuration: { tables: 0, differences: 0 },
    user_generated: { tables: 0, differences: 0 },
    transactional: { tables: 0, differences: 0 },
  };
  
  let totalDevOnly = 0, totalProdOnly = 0;
  
  for (const table of scanResult.tables) {
    const differences = table.devNewer + table.prodNewer + table.conflicts + table.devOnly + table.prodOnly;
    
    byModule[table.module].tables++;
    byModule[table.module].differences += differences;
    
    byDataType[table.dataType].tables++;
    byDataType[table.dataType].differences += differences;
    
    totalDevOnly += table.devOnly;
    totalProdOnly += table.prodOnly;
  }
  
  return {
    totalTables: scanResult.tables.length,
    tablesWithDifferences: scanResult.tables.filter(t => 
      t.devNewer + t.prodNewer + t.conflicts + t.devOnly + t.prodOnly > 0
    ).length,
    totalRecordsCompared: scanResult.tables.reduce((sum, t) => sum + t.devCount + t.prodCount, 0),
    breakdown: {
      devNewer: scanResult.totalDevNewer,
      prodNewer: scanResult.totalProdNewer,
      conflicts: scanResult.totalConflicts,
      identical: scanResult.totalIdentical,
      devOnly: totalDevOnly,
      prodOnly: totalProdOnly,
    },
    byModule,
    byDataType,
  };
}
