import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Check if we're using the database (from environment variable)
const USE_DATABASE = process.env.USE_DATABASE === 'true';
console.log('USE_DATABASE env variable value:', process.env.USE_DATABASE);
console.log('USE_DATABASE parsed as:', USE_DATABASE);

// Database URL presence check
const isDatabaseUrlSet = !!process.env.DATABASE_URL;
console.log('DATABASE_URL present:', isDatabaseUrlSet);

// Only throw an error if we're specifically trying to use the database
if (USE_DATABASE && !process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set when USE_DATABASE=true. Did you forget to provision a database?",
  );
}

// Create a dummy pool and DB if we're not using the real database
let connectionString = process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy';

// Configure pool options with reasonable timeouts and retry logic for Docker Compose
const poolOptions = {
  connectionString,
  max: 20, // Maximum number of clients the pool should contain
  connectionTimeoutMillis: 10000, // How long to wait for connection
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
  allowExitOnIdle: false, // Don't exit when all clients finish
  // Retry strategy for Docker startup situations
  retry_strategy: {
    retries: 5,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 10000,
    randomize: true,
  }
};

// Create the database connection pool with our configured options
export const pool = new Pool(poolOptions);

// Create the Drizzle ORM instance with our pool and schema
export const db = drizzle({ client: pool, schema });

// Simple health check function to verify database connectivity
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}
