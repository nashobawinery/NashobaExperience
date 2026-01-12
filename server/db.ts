import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// In development mode, always use dev database. In production, use prod database.
const isDevelopment = process.env.NODE_ENV === 'development';
const databaseUrlToUse = isDevelopment 
  ? process.env.DATABASE_URL 
  : (process.env.PROD_DATABASE_URL || process.env.DATABASE_URL);

if (!databaseUrlToUse) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Log which database we're using (without exposing connection string)
const isProduction = !isDevelopment && !!process.env.PROD_DATABASE_URL;
console.log(`[DB] Connected to ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} database`);

export const databaseUrl = databaseUrlToUse;
export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });
