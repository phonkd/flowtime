import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

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

// Determine if we're using a WebSocket connection (Neon) or a regular PostgreSQL connection
// Neon serverless URLs contain "pooler.supabase.com" or similar, but not local/Docker PostgreSQL instances
const isNeonConnection = connectionString.includes('.neon.') || connectionString.includes('pooler.supabase.com');
// Additionally, direct connections to containers in docker-compose or K8s should not use WebSockets
const isDockerOrK8sConnection = connectionString.includes('@postgres:') || 
                               connectionString.includes('@db:') || 
                               connectionString.includes('@database:');
const isWebSocketConnection = isNeonConnection && !isDockerOrK8sConnection;

if (isWebSocketConnection) {
  // Only set up WebSocket constructor for Neon connections
  console.log('Using WebSocket connection for Neon Serverless');
  neonConfig.webSocketConstructor = ws;
} else {
  console.log('Using direct PostgreSQL connection');
}

// Log connection info (without revealing credentials)
if (USE_DATABASE) {
  const sanitizedURL = connectionString.replace(/\/\/[^@]+@/, '//****:****@');
  console.log(`Connecting to database: ${sanitizedURL}`);
}

export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });
