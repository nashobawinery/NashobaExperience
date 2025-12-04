import { db } from './db';
import { sql } from 'drizzle-orm';
import { SYNC_TABLES, SyncTableConfig, DataType, SyncModule } from './syncRegistry';
import crypto from 'crypto';

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

function computeContentHash(data: Record<string, any>, fields: string[]): string {
  const sortedData: Record<string, any> = {};
  for (const field of fields.sort()) {
    if (data[field] !== undefined) {
      sortedData[field] = data[field];
    }
  }
  const json = JSON.stringify(sortedData, (_, v) => {
    if (v instanceof Date) return v.toISOString();
    if (typeof v === 'bigint') return v.toString();
    return v;
  });
  return crypto.createHash('md5').update(json).digest('hex');
}

function getBusinessKeyValue(record: Record<string, any>, businessKeys: string[]): Record<string, any> {
  const keyValue: Record<string, any> = {};
  for (const key of businessKeys) {
    keyValue[key] = record[key];
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
  const { Pool } = await import('pg');
  
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

export async function scanBidirectional(
  config: BidirectionalSyncConfig
): Promise<SyncScanResult> {
  const { Pool } = await import('pg');
  const scanId = crypto.randomUUID();
  const tables: TableSyncSummary[] = [];
  
  let totalDevNewer = 0;
  let totalProdNewer = 0;
  let totalConflicts = 0;
  let totalIdentical = 0;
  
  const prodPool = new Pool({ connectionString: config.prodDatabaseUrl });
  
  try {
    const tablesToScan = config.tableIds 
      ? SYNC_TABLES.filter(t => config.tableIds!.includes(t.id) && !t.excludeFromSync)
      : SYNC_TABLES.filter(t => !t.excludeFromSync);
    
    for (const tableConfig of tablesToScan) {
      try {
        const devRecords = await fetchTableData(
          tableConfig.id,
          tableConfig.exportFields,
          tableConfig.businessKey
        );
        
        const tableNameSnake = tableConfig.id.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
        let prodRecords: Record<string, any>[] = [];
        
        try {
          const prodClient = await prodPool.connect();
          const result = await prodClient.query(`SELECT * FROM "${tableNameSnake}" LIMIT 10000`);
          prodRecords = result.rows;
          prodClient.release();
        } catch (error: any) {
          if (!error.message?.includes('does not exist')) {
            console.warn(`Warning: Could not read production table ${tableNameSnake}:`, error.message);
          }
        }
        
        const devByKey = new Map<string, Record<string, any>>();
        for (const record of devRecords) {
          const keyValue = getBusinessKeyValue(record, tableConfig.businessKey);
          const keyString = businessKeyToString(keyValue);
          devByKey.set(keyString, record);
        }
        
        const prodByKey = new Map<string, Record<string, any>>();
        for (const record of prodRecords) {
          const keyValue = getBusinessKeyValue(record, tableConfig.businessKey);
          const keyString = businessKeyToString(keyValue);
          prodByKey.set(keyString, record);
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
          const prodUpdatedAt = prodRecord?.updated_at ? new Date(prodRecord.updated_at) : 
                                prodRecord?.created_at ? new Date(prodRecord.created_at) : null;
          
          const state = determineRecordState(devRecord, prodRecord, devHash, prodHash, devUpdatedAt, prodUpdatedAt);
          
          switch (state) {
            case 'dev_newer': devNewer++; break;
            case 'prod_newer': prodNewer++; break;
            case 'conflict': conflicts++; break;
            case 'identical': identical++; break;
            case 'dev_only': devOnly++; break;
            case 'prod_only': prodOnly++; break;
          }
          
          const recommendation = getRecommendation(state, tableConfig.dataType);
          const selected = getDefaultSelection(state, recommendation);
          
          records.push({
            tableId: tableConfig.id,
            businessKey: keyValue,
            devData: devRecord,
            prodData: prodRecord,
            devUpdatedAt,
            prodUpdatedAt,
            devHash,
            prodHash,
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
          prodCount: prodRecords.length,
          devNewer,
          prodNewer,
          conflicts,
          identical,
          devOnly,
          prodOnly,
          records: records.filter(r => r.state !== 'identical'),
        });
        
        totalDevNewer += devNewer;
        totalProdNewer += prodNewer;
        totalConflicts += conflicts;
        totalIdentical += identical;
        
      } catch (error: any) {
        console.error(`Error scanning table ${tableConfig.id}:`, error.message);
      }
    }
    
  } finally {
    await prodPool.end();
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
  
  const prodPool = new Pool({ connectionString: config.prodDatabaseUrl });
  
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
