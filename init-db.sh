#!/bin/bash
set -e

# Initialize the PostgreSQL database for the Hypnosis app
# This script will be mounted inside the Postgres container and run on startup

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create a hypnosis database since some scripts might be directly referring to it
    CREATE DATABASE hypnosis;
    GRANT ALL PRIVILEGES ON DATABASE hypnosis TO $POSTGRES_USER;
    
    -- Log the initialization
    \echo 'Database initialization completed'
EOSQL

# Now create tables and populate them with sample data
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create tables
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
        "description" TEXT,
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
        "image_url" TEXT NOT NULL,
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

    -- Populate with sample data
    
    -- Insert admin user with plaintext password for testing (in production would use proper hashing)
    INSERT INTO "users" ("username", "password", "full_name", "email", "role", "created_at")
    VALUES ('admin', 'admin123', 'Admin User', 'admin@example.com', 'admin', NOW());
    
    -- Insert categories
    INSERT INTO "categories" ("name", "description")
    VALUES 
        ('Relaxation', 'Peaceful guided meditations with calming sounds'),
        ('Confidence', 'Build lasting confidence and self-esteem'),
        ('Sleep', 'Fall asleep faster with gentle voice guidance'),
        ('Stress Relief', 'Release stress and find inner calm');
    
    -- Insert tags
    INSERT INTO "tags" ("name")
    VALUES 
        ('Guided'),
        ('Deep trance'),
        ('Beginner'),
        ('Background music'),
        ('Motivation'),
        ('Anxiety'),
        ('Nature Sounds'),
        ('Long Session');
    
    -- Insert audio tracks
    INSERT INTO "audio_tracks" ("title", "description", "category_id", "image_url", "audio_url", "duration", "is_public", "created_at")
    VALUES 
        ('Deep Relaxation Journey', 'Peaceful guided meditation with ocean sounds', 1, 
         'https://images.unsplash.com/photo-1506126613408-eca07ce68773?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80', 
         '/audio/relaxation_journey.mp3', 1215, true, NOW()),
        
        ('Peaceful Sleep Induction', 'Fall asleep faster with gentle voice guidance', 3, 
         'https://images.unsplash.com/photo-1518112166137-85f9979a43aa?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80', 
         '/audio/sleep_induction.mp3', 1965, true, NOW()),
        
        ('Self-Confidence Boost', 'Build lasting confidence and self-esteem', 2, 
         'https://images.unsplash.com/photo-1534859108275-a3a6f23619fb?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80', 
         '/audio/confidence_boost.mp3', 930, true, NOW()),
        
        ('Anxiety Reduction', 'Release stress and find inner calm', 4, 
         'https://images.unsplash.com/photo-1476611338391-6f395a0ebc7b?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80', 
         '/audio/anxiety_reduction.mp3', 1100, true, NOW()),
        
        ('Rainy Day Relaxation', 'Gentle rain sounds with calming guidance', 1, 
         'https://images.unsplash.com/photo-1529693662653-9d480530a697?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80', 
         '/audio/rainy_day.mp3', 1510, true, NOW()),
        
        ('Deep Sleep Journey', 'Extended sleep hypnosis for insomnia', 3, 
         'https://images.unsplash.com/photo-1502139214982-d0ad755818d8?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80', 
         '/audio/deep_sleep.mp3', 2700, true, NOW());
    
    -- Add tags to tracks
    -- Track 1 tags
    INSERT INTO "audio_track_tags" ("audio_track_id", "tag_id") VALUES (1, 1); -- Guided
    INSERT INTO "audio_track_tags" ("audio_track_id", "tag_id") VALUES (1, 7); -- Nature Sounds
    
    -- Track 2 tags
    INSERT INTO "audio_track_tags" ("audio_track_id", "tag_id") VALUES (2, 2); -- Deep trance
    INSERT INTO "audio_track_tags" ("audio_track_id", "tag_id") VALUES (2, 8); -- Long Session
    
    -- Track 3 tags
    INSERT INTO "audio_track_tags" ("audio_track_id", "tag_id") VALUES (3, 5); -- Motivation
    INSERT INTO "audio_track_tags" ("audio_track_id", "tag_id") VALUES (3, 3); -- Beginner
    
    -- Track 4 tags
    INSERT INTO "audio_track_tags" ("audio_track_id", "tag_id") VALUES (4, 6); -- Anxiety
    INSERT INTO "audio_track_tags" ("audio_track_id", "tag_id") VALUES (4, 4); -- Background music
    
    -- Track 5 tags
    INSERT INTO "audio_track_tags" ("audio_track_id", "tag_id") VALUES (5, 7); -- Nature Sounds
    INSERT INTO "audio_track_tags" ("audio_track_id", "tag_id") VALUES (5, 1); -- Guided
    
    -- Track 6 tags
    INSERT INTO "audio_track_tags" ("audio_track_id", "tag_id") VALUES (6, 2); -- Deep trance
    INSERT INTO "audio_track_tags" ("audio_track_id", "tag_id") VALUES (6, 8); -- Long Session
    
    -- Update category counts
    UPDATE "categories" SET "count" = 2 WHERE "id" = 1; -- Relaxation has 2 tracks
    UPDATE "categories" SET "count" = 1 WHERE "id" = 2; -- Confidence has 1 track
    UPDATE "categories" SET "count" = 2 WHERE "id" = 3; -- Sleep has 2 tracks
    UPDATE "categories" SET "count" = 1 WHERE "id" = 4; -- Stress Relief has 1 track
    
    \echo 'Sample data initialization completed!'
EOSQL