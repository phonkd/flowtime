import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Check if we're using the database (from environment variable)
const USE_DATABASE = process.env.USE_DATABASE === 'true';

// Only throw an error if we're specifically trying to use the database
if (USE_DATABASE && !process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set when USE_DATABASE=true. Did you forget to provision a database?",
  );
}

// Create a dummy pool and DB if we're not using the real database
const connectionString = process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy';
export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });
