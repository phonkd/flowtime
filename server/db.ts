import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
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

// Create a dummy connection string if we're not using the real database
const connectionString = process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy';

// Log connection info (without revealing credentials)
if (USE_DATABASE) {
  const sanitizedURL = connectionString.replace(/\/\/[^@]+@/, '//****:****@');
  console.log(`Connecting to database: ${sanitizedURL}`);
}

// Create the Postgres client
const client = postgres(connectionString, {
  max: 20,                // Maximum number of connections
  idle_timeout: 30,       // Idle connection timeout in seconds
  connect_timeout: 10,    // Connection timeout in seconds
  prepare: false,         // Disable prepared statements for better compatibility
});

// Test the connection before proceeding
if (USE_DATABASE) {
  client`SELECT NOW()`
    .then(() => console.log('Database connection successful'))
    .catch(err => console.error('Database connection error:', err));
}

// Create the Drizzle ORM instance
export const db = drizzle(client, { schema });
export const sql = client; // Export the SQL client for raw queries
export const pool = client; // Export pool for backward compatibility
