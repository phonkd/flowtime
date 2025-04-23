import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/pg-pool';
import * as schema from "@shared/schema";

// Check if we're using the database (from environment variable)
// Use safer string comparison instead of assuming boolean conversion
const useDbStr = process.env.USE_DATABASE || 'false';
const USE_DATABASE = useDbStr.toLowerCase() === 'true';

console.log(`USE_DATABASE env variable value: ${useDbStr}`);
console.log(`USE_DATABASE parsed as: ${USE_DATABASE}`);
console.log(`DATABASE_URL present: ${!!process.env.DATABASE_URL}`);

// Only throw an error if we're specifically trying to use the database
if (USE_DATABASE && !process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set when USE_DATABASE=true. Did you forget to provision a database?",
  );
}

// Create a dummy pool and DB if we're not using the real database
let connectionString = process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy';

// Log connection info (without revealing credentials)
if (USE_DATABASE) {
  const sanitizedURL = connectionString.replace(/\/\/[^@]+@/, '//****:****@');
  console.log(`Connecting to database: ${sanitizedURL}`);
}

// Standard PostgreSQL connection pool
export const pool = new Pool({
  connectionString,
  // Add a longer timeout for initial connection
  connectionTimeoutMillis: 10000,
  // Increase the pool size
  max: 20,
  // Add a timeout for idle clients
  idleTimeoutMillis: 30000,
});

// Test the connection before proceeding
if (USE_DATABASE) {
  pool.query('SELECT NOW()')
    .then(() => console.log('Database connection successful'))
    .catch(err => console.error('Database connection error:', err));
}

export const db = drizzle(pool, { schema });
