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

// Determine database connection details
let connectionString = '';

// Try to build connectionString from individual env vars if DATABASE_URL is not set
if (!process.env.DATABASE_URL && USE_DATABASE) {
  const pgUser = process.env.POSTGRES_USER || 'hypnosis';
  const pgPassword = process.env.POSTGRES_PASSWORD || 'hypnosis_password';
  const pgHost = process.env.POSTGRES_HOST || 'postgres';
  const pgPort = process.env.POSTGRES_PORT || '5432';
  const pgDatabase = process.env.POSTGRES_DB || 'hypnosis_db';
  
  connectionString = `postgresql://${pgUser}:${pgPassword}@${pgHost}:${pgPort}/${pgDatabase}`;
  console.log(`Using constructed DATABASE_URL from individual environment variables (host: ${pgHost})`);
} else {
  // Use the existing DATABASE_URL or a dummy one if we're not using the database
  connectionString = process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy';
  
  if (USE_DATABASE) {
    console.log('Using DATABASE_URL from environment variable');
    // For debugging Docker Compose issues, log the host from the connection string
    try {
      const url = new URL(connectionString);
      console.log(`Database host from connection string: ${url.hostname}`);
    } catch (e) {
      console.error('Could not parse DATABASE_URL:', e);
    }
  } else {
    console.log('Using dummy DATABASE_URL since USE_DATABASE is false');
  }
}

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

// Enhanced health check function to verify database connectivity
export async function checkDatabaseConnection(): Promise<boolean> {
  // Don't even try if we're not using a database
  if (!USE_DATABASE) {
    console.log('Database check skipped since USE_DATABASE is false');
    return false;
  }

  let retries = 5;
  const retryDelay = 2000; // 2 seconds
  
  while (retries > 0) {
    try {
      console.log(`Attempting database connection (${retries} retries left)...`);
      const client = await pool.connect();
      try {
        // Check if we can query the database
        const result = await client.query('SELECT version()');
        const version = result.rows[0].version;
        console.log(`Database connected successfully. PostgreSQL version: ${version.split(' ')[1]}`);
        
        // Check if we need to initialize the database with schema
        // This code might be useful if we want to check tables later
        /*
        const tableCheckQuery = "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')";
        const tableResult = await client.query(tableCheckQuery);
        const usersTableExists = tableResult.rows[0].exists;
        if (!usersTableExists) {
          console.log('Users table not found. Database may need initialization.');
        }
        */
        
        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(`Database connection attempt failed (${retries} retries left):`, error.message);
      retries--;
      
      if (retries > 0) {
        console.log(`Waiting ${retryDelay}ms before retrying...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error('All database connection attempts failed.');
        return false;
      }
    }
  }
  
  return false;
}
