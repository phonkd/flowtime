import { Pool } from 'pg';
import * as schema from "@shared/schema";
import { drizzle } from 'drizzle-orm/node-postgres';

// Check if database should be used
const USE_DATABASE = process.env.USE_DATABASE === 'true';
console.log('USE_DATABASE setting:', USE_DATABASE);

// Create PostgreSQL connection pool 
let pool: Pool;

if (USE_DATABASE) {
  try {
    console.log('Connecting to standard PostgreSQL database...');
    
    // Create connection config object for Docker setup
    const connectionConfig = {
      user: process.env.POSTGRES_USER || 'hypnosis',
      password: process.env.POSTGRES_PASSWORD || 'hypnosis_password',
      host: process.env.POSTGRES_HOST || 'postgres', // Docker service name
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      database: process.env.POSTGRES_DB || 'hypnosis_db'
    };
    
    console.log(`Database config: ${connectionConfig.host}:${connectionConfig.port}/${connectionConfig.database}`);
    
    // Create the pool instance
    pool = new Pool(connectionConfig);
    
    console.log('PostgreSQL connection pool created');
  } 
  catch (error) {
    console.error('Error setting up database connection:', error);
    console.log('Using fallback dummy connection pool');
    
    // Fallback to dummy pool that will fail safely if used
    pool = new Pool({
      user: 'dummy',
      password: 'dummy',
      host: 'localhost',
      port: 5432,
      database: 'dummy'
    });
  }
} 
else {
  console.log('Database disabled. Using dummy connection pool');
  
  // Create a dummy pool
  pool = new Pool({
    user: 'dummy',
    password: 'dummy',
    host: 'localhost',
    port: 5432,
    database: 'dummy'
  });
}

// Export the database connection pool
export { pool };

// Create and export the Drizzle ORM instance
export const db = drizzle(pool, { schema });

// Health check function to test database connection
export async function checkDatabaseConnection(): Promise<boolean> {
  if (!USE_DATABASE) {
    console.log('Database check skipped (database disabled)');
    return false;
  }
  
  let retries = 3;
  const retryDelay = 2000;
  
  while (retries > 0) {
    try {
      console.log(`Attempting database connection (${retries} retries left)...`);
      
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