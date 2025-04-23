import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// For query purposes (normal usage)
export const client = postgres(process.env.DATABASE_URL);
export const db = drizzle(client, { schema });
export const sql = client; // Export the SQL client for raw queries
export const pool = client; // Export pool for backward compatibility