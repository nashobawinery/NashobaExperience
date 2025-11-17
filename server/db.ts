import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import fs from "fs";

neonConfig.webSocketConstructor = ws;

function getDatabaseUrl(): string {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  const env = process.env.NODE_ENV || 'development';
  console.log(`Using DATABASE_URL from environment (${env})`);
  return process.env.DATABASE_URL;
}

export const databaseUrl = getDatabaseUrl();
export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });
