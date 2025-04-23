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

    -- Populate with only admin user as requested
    
    -- Insert admin user with bcrypt hashed password for secure authentication
    -- This is the bcrypt hash of 'admin123' with 10 rounds
    INSERT INTO "users" ("username", "password", "full_name", "email", "role", "created_at")
    VALUES ('admin', '$2a$10$uVz7RbxcRn9Y.C0xvEHh9um.SjPx00W3RdLq5QQZ0GUm21ThJqt6W', 'Admin User', 'admin@example.com', 'admin', NOW());
    
    \echo 'Admin user created successfully!'
EOSQL