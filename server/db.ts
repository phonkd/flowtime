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
let connectionString = process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy';

// Fix for Docker: If the connection fails with hypnosis_db, try with hypnosis
if (USE_DATABASE && connectionString.includes('hypnosis_db')) {
  console.log('Using DATABASE_URL with hypnosis_db. If this fails, will try with hypnosis instead.');
}
export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });
