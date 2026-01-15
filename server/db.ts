import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Use single database for all environments
const databaseUrlToUse = process.env.DATABASE_URL;

if (!databaseUrlToUse) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Log the database host (not credentials) to help debug connection issues
const dbHost = databaseUrlToUse.match(/@([^/]+)\//)?.[1] || 'unknown';
console.log(`[DB] Connected to database host: ${dbHost}`);

export const databaseUrl = databaseUrlToUse;
export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });
