import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { config } from "dotenv";
import ws from "ws";
import * as schema from "@shared/schema";

config();

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Normalize connection string: both postgres:// and postgresql:// are valid,
// but some tools (Render, certain pg drivers) require postgres:// specifically.
const rawUrl = process.env.DATABASE_URL;
export const databaseUrl = rawUrl.startsWith("postgresql://")
  ? rawUrl.replace("postgresql://", "postgres://")
  : rawUrl;

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });
