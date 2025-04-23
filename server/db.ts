import { Pool } from 'pg';
import * as schema from "@shared/schema";
import { drizzle } from 'drizzle-orm/node-postgres';

// Check if database should be used
const USE_DATABASE = process.env.USE_DATABASE === 'true';
console.log('USE_DATABASE setting:', USE_DATABASE);

// Basic configuration for database connection
let connectionConfig: any = {};

if (USE_DATABASE) {
  try {
    // First try to use the DATABASE_URL if available
    if (process.env.DATABASE_URL) {
      console.log('Using DATABASE_URL for connection');
      const url = new URL(process.env.DATABASE_URL);
      
      connectionConfig = {
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        host: url.hostname,
        port: parseInt(url.port || '5432', 10),
        database: url.pathname.substring(1),
        ssl: false
      };
      
      console.log(`Database config: ${connectionConfig.host}:${connectionConfig.port}/${connectionConfig.database}`);
    }
    // Otherwise use individual PostgreSQL environment variables
    else if (process.env.POSTGRES_HOST) {
      console.log('Using individual PostgreSQL environment variables');
      connectionConfig = {
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'postgres',
        host: process.env.POSTGRES_HOST,
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
        database: process.env.POSTGRES_DB || 'postgres',
        ssl: false
      };
    }
    // If nothing else is available, use localhost defaults
    else {
      console.log('No database configuration found, using localhost defaults');
      connectionConfig = {
        user: 'postgres',
        password: 'postgres',
        host: 'localhost',
        port: 5432, 
        database: 'postgres',
        ssl: false
      };
    }
  }
  catch (error) {
    console.error('Error setting up database connection:', error);
    console.log('Using fallback configuration');
    connectionConfig = {
      connectionString: process.env.DATABASE_URL,
      ssl: false
    };
  }
}
else {
  // Dummy configuration when not using a database
  console.log('Using dummy database configuration (database disabled)');
  connectionConfig = {
    user: 'dummy',
    password: 'dummy',
    host: 'localhost',
    port: 5432,
    database: 'dummy',
    ssl: false
  };
}

// Create a connection pool
export const pool = new Pool({
  ...connectionConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// Create the drizzle db instance
export const db = drizzle(pool, { schema });

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  if (!USE_DATABASE) {
    console.log('Database check skipped (database disabled)');
    return false;
  }
  
  let retries = 5;
  const retryDelay = 2000;
  
  while (retries > 0) {
    try {
      console.log(`Connecting to database at ${connectionConfig.host}:${connectionConfig.port} (${retries} retries left)...`);
      
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT version()');
        const version = result.rows[0].version;
        console.log(`✅ Connected to PostgreSQL: ${version}`);
        return true;
      }
      finally {
        client.release();
      }
    }
    catch (error: any) {
      console.error(`❌ Database connection error (${retries} retries left):`, error.message);
      retries--;
      
      if (retries > 0) {
        console.log(`Waiting ${retryDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
      else {
        console.error('All database connection attempts failed');
        return false;
      }
    }
  }
  
  return false;
}