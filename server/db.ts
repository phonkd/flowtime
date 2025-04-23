import { Pool } from 'pg';
import * as schema from "@shared/schema";
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq } from 'drizzle-orm/expressions';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

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

// Function to initialize the database (create tables and seed data)
export async function initializeDatabase(): Promise<void> {
  if (!USE_DATABASE) {
    console.log('Database initialization skipped (database disabled)');
    return;
  }
  
  try {
    console.log('Starting database initialization...');
    
    // Push schema to database (will create tables if they don't exist)
    // This uses the schema definitions from shared/schema.ts
    console.log('Creating database schema...');
    
    try {
      // Check if tables exist by querying 'users' table
      const users = await db.select().from(schema.users).limit(1);
      console.log('Database schema already exists, skipping schema creation.');
    } catch (error) {
      // If we get an error, tables probably don't exist, so create them
      console.log('Creating tables from schema definitions...');
      
      // Use a direct client to run raw SQL
      const client = await pool.connect();
      try {
        // Create tables in the correct order to handle foreign key references
        await client.query(`
          CREATE TABLE IF NOT EXISTS "users" (
            "id" SERIAL PRIMARY KEY,
            "username" TEXT NOT NULL UNIQUE,
            "password" TEXT NOT NULL,
            "full_name" TEXT,
            "email" TEXT,
            "role" TEXT NOT NULL DEFAULT 'user',
            "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
          );
          
          CREATE TABLE IF NOT EXISTS "categories" (
            "id" SERIAL PRIMARY KEY,
            "name" TEXT NOT NULL UNIQUE,
            "description" TEXT NOT NULL,
            "image_url" TEXT,
            "count" INTEGER NOT NULL DEFAULT 0
          );
          
          CREATE TABLE IF NOT EXISTS "tags" (
            "id" SERIAL PRIMARY KEY,
            "name" TEXT NOT NULL UNIQUE
          );
          
          CREATE TABLE IF NOT EXISTS "audio_tracks" (
            "id" SERIAL PRIMARY KEY,
            "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
            "title" TEXT NOT NULL,
            "description" TEXT NOT NULL,
            "category_id" INTEGER NOT NULL REFERENCES "categories"("id"),
            "image_url" TEXT,
            "audio_url" TEXT NOT NULL,
            "duration" INTEGER NOT NULL,
            "is_public" BOOLEAN NOT NULL DEFAULT true
          );
          
          CREATE TABLE IF NOT EXISTS "audio_track_tags" (
            "id" SERIAL PRIMARY KEY,
            "audio_track_id" INTEGER NOT NULL REFERENCES "audio_tracks"("id") ON DELETE CASCADE,
            "tag_id" INTEGER NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
            UNIQUE("audio_track_id", "tag_id")
          );
          
          CREATE TABLE IF NOT EXISTS "user_progress" (
            "id" SERIAL PRIMARY KEY,
            "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
            "audio_track_id" INTEGER NOT NULL REFERENCES "audio_tracks"("id") ON DELETE CASCADE,
            "progress" INTEGER NOT NULL DEFAULT 0,
            "completed" BOOLEAN,
            "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
            UNIQUE("user_id", "audio_track_id")
          );
          
          CREATE TABLE IF NOT EXISTS "shareable_links" (
            "id" SERIAL PRIMARY KEY,
            "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
            "audio_track_id" INTEGER NOT NULL REFERENCES "audio_tracks"("id") ON DELETE CASCADE,
            "link_id" TEXT NOT NULL UNIQUE,
            "created_by_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
            "expires_at" TIMESTAMP,
            "is_active" BOOLEAN NOT NULL DEFAULT true
          );
          
          CREATE TABLE IF NOT EXISTS "user_track_access" (
            "id" SERIAL PRIMARY KEY,
            "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
            "audio_track_id" INTEGER NOT NULL REFERENCES "audio_tracks"("id") ON DELETE CASCADE,
            "granted_by_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
            "granted_at" TIMESTAMP NOT NULL DEFAULT NOW(),
            UNIQUE("user_id", "audio_track_id")
          );
        `);
        
        console.log('Database schema created successfully');
      } finally {
        client.release();
      }
    }
    
    // Now check if we need to seed data
    const userCountResult = await db.execute(db.select().from(schema.users).count());
    const userCount = userCountResult[0]?.count || 0;
    
    if (parseInt(userCount as string, 10) > 0) {
      console.log('Database already contains users, skipping data seeding.');
      return;
    }
    
    // Seed initial data
    console.log('Seeding initial data...');
    
    // 1. Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await db.insert(schema.users).values({
      username: 'admin',
      password: hashedPassword,
      fullName: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
      createdAt: new Date()
    }).returning();
    
    console.log('Created admin user:', adminUser[0].username);
    
    // 2. Create categories
    const categories = await db.insert(schema.categories).values([
      {
        name: 'Relaxation',
        description: 'Peaceful guided meditations with calming sounds',
        imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
        count: 0
      },
      {
        name: 'Confidence',
        description: 'Build lasting confidence and self-esteem',
        imageUrl: 'https://images.unsplash.com/photo-1534859108275-a3a6f23619fb?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
        count: 0
      },
      {
        name: 'Sleep',
        description: 'Fall asleep faster with gentle voice guidance',
        imageUrl: 'https://images.unsplash.com/photo-1518112166137-85f9979a43aa?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
        count: 0
      },
      {
        name: 'Stress Relief',
        description: 'Release stress and find inner calm',
        imageUrl: 'https://images.unsplash.com/photo-1476611338391-6f395a0ebc7b?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
        count: 0
      }
    ]).returning();
    
    console.log(`Created ${categories.length} categories`);
    
    // 3. Create tags
    const tags = await db.insert(schema.tags).values([
      { name: 'Guided' },
      { name: 'Deep trance' },
      { name: 'Beginner' },
      { name: 'Background music' },
      { name: 'Motivation' },
      { name: 'Anxiety' },
      { name: 'Nature Sounds' },
      { name: 'Long Session' }
    ]).returning();
    
    console.log(`Created ${tags.length} tags`);
    
    // 4. Create audio tracks
    const tracks = await db.insert(schema.audioTracks).values([
      {
        title: 'Deep Relaxation Journey',
        description: 'Peaceful guided meditation with ocean sounds',
        categoryId: categories[0].id,
        imageUrl: categories[0].imageUrl,
        audioUrl: '/audio/relaxation_journey.mp3',
        duration: 1215,
        isPublic: true,
        createdAt: new Date()
      },
      {
        title: 'Peaceful Sleep Induction',
        description: 'Fall asleep faster with gentle voice guidance',
        categoryId: categories[2].id,
        imageUrl: categories[2].imageUrl,
        audioUrl: '/audio/sleep_induction.mp3',
        duration: 1965,
        isPublic: true,
        createdAt: new Date()
      },
      {
        title: 'Self-Confidence Boost',
        description: 'Build lasting confidence and self-esteem',
        categoryId: categories[1].id,
        imageUrl: categories[1].imageUrl,
        audioUrl: '/audio/confidence_boost.mp3',
        duration: 930,
        isPublic: true,
        createdAt: new Date()
      }
    ]).returning();
    
    console.log(`Created ${tracks.length} audio tracks`);
    
    // 5. Assign tags to tracks
    await db.insert(schema.audioTrackTags).values([
      { audioTrackId: tracks[0].id, tagId: tags[0].id }, // Relaxation - Guided
      { audioTrackId: tracks[0].id, tagId: tags[6].id }, // Relaxation - Nature Sounds
      { audioTrackId: tracks[1].id, tagId: tags[1].id }, // Sleep - Deep trance
      { audioTrackId: tracks[1].id, tagId: tags[7].id }, // Sleep - Long Session
      { audioTrackId: tracks[2].id, tagId: tags[4].id }, // Confidence - Motivation
      { audioTrackId: tracks[2].id, tagId: tags[2].id }  // Confidence - Beginner
    ]);
    
    // 6. Update category counts
    for (const category of categories) {
      const countResult = await db.execute(db.select().from(schema.audioTracks)
        .where(eq(schema.audioTracks.categoryId, category.id))
        .count());
      
      const trackCount = parseInt(countResult[0]?.count as string || '0', 10);
      
      await db.update(schema.categories)
        .set({ count: trackCount })
        .where(eq(schema.categories.id, category.id));
    }
    
    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}