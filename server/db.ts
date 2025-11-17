import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import fs from "fs";

neonConfig.webSocketConstructor = ws;

function getDatabaseUrl(): string {
  // In production (published apps), database URL is in /tmp/replitdb
  // In development, it's in the environment variable
  try {
    if (fs.existsSync('/tmp/replitdb')) {
      const dbUrl = fs.readFileSync('/tmp/replitdb', 'utf8').trim();
      if (dbUrl) {
        console.log('Using database URL from /tmp/replitdb (production)');
        return dbUrl;
      }
    }
  } catch (error) {
    console.log('Could not read /tmp/replitdb, falling back to environment variable');
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  console.log('Using database URL from environment variable (development)');
  return process.env.DATABASE_URL;
}

const databaseUrl = getDatabaseUrl();
export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });
