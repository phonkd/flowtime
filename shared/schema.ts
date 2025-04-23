import { pgTable, text, serial, integer, boolean, timestamp, uuid, uniqueIndex, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  email: text("email"),
  role: text("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  role: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  count: integer("count").notNull().default(0),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  description: true,
  imageUrl: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const insertTagSchema = createInsertSchema(tags).pick({
  name: true,
});

export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tags.$inferSelect;

export const audioTracks = pgTable("audio_tracks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  categoryId: integer("category_id").notNull(),
  imageUrl: text("image_url"), // Optional, will use category image as fallback
  audioUrl: text("audio_url").notNull(),
  duration: integer("duration").notNull(), // duration in seconds
  isPublic: boolean("is_public").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAudioTrackSchema = createInsertSchema(audioTracks).pick({
  title: true,
  description: true,
  categoryId: true,
  imageUrl: true,
  audioUrl: true,
  duration: true,
  isPublic: true,
});

export type InsertAudioTrack = z.infer<typeof insertAudioTrackSchema>;
export type AudioTrack = typeof audioTracks.$inferSelect;

export const audioTrackTags = pgTable("audio_track_tags", {
  id: serial("id").primaryKey(),
  audioTrackId: integer("audio_track_id").notNull(),
  tagId: integer("tag_id").notNull(),
});

export const insertAudioTrackTagSchema = createInsertSchema(audioTrackTags).pick({
  audioTrackId: true,
  tagId: true,
});

export type InsertAudioTrackTag = z.infer<typeof insertAudioTrackTagSchema>;
export type AudioTrackTag = typeof audioTrackTags.$inferSelect;

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  audioTrackId: integer("audio_track_id").notNull(),
  progress: integer("progress").notNull(), // progress in seconds
  completed: boolean("completed").default(false),
  updatedAt: timestamp("updated_at").notNull(),
});

export const insertUserProgressSchema = createInsertSchema(userProgress).pick({
  userId: true,
  audioTrackId: true,
  progress: true,
  completed: true,
  updatedAt: true,
});

export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type UserProgress = typeof userProgress.$inferSelect;

// Shareable Links
export const shareableLinks = pgTable("shareable_links", {
  id: serial("id").primaryKey(),
  linkId: uuid("link_id").defaultRandom().notNull().unique(),
  audioTrackId: integer("audio_track_id").notNull(),
  createdById: integer("created_by_id").notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const insertShareableLinkSchema = createInsertSchema(shareableLinks).pick({
  audioTrackId: true,
  createdById: true,
  expiresAt: true,
  isActive: true,
});

export type InsertShareableLink = z.infer<typeof insertShareableLinkSchema>;
export type ShareableLink = typeof shareableLinks.$inferSelect;

// User Access to Tracks (for private tracks)
export const userTrackAccess = pgTable("user_track_access", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  audioTrackId: integer("audio_track_id").notNull(),
  grantedById: integer("granted_by_id").notNull(),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
}, (table) => {
  return {
    uniqUserTrack: unique().on(table.userId, table.audioTrackId)
  };
});

export const insertUserTrackAccessSchema = createInsertSchema(userTrackAccess).pick({
  userId: true,
  audioTrackId: true,
  grantedById: true,
});

export type InsertUserTrackAccess = z.infer<typeof insertUserTrackAccessSchema>;
export type UserTrackAccess = typeof userTrackAccess.$inferSelect;

// Relations definitions
export const relations = {
  audioTracks: {
    category: (audioTrack: any, categories: any) => 
      audioTrack.categoryId === categories.id,
    tags: (audioTrack: any, tags: any, bridge: any) => 
      audioTrack.id === bridge.audioTrackId && bridge.tagId === tags.id
  },
  userProgress: {
    user: (progress: any, users: any) => 
      progress.userId === users.id,
    audioTrack: (progress: any, audioTracks: any) => 
      progress.audioTrackId === audioTracks.id
  },
  shareableLinks: {
    audioTrack: (link: any, audioTracks: any) => 
      link.audioTrackId === audioTracks.id,
    createdBy: (link: any, users: any) => 
      link.createdById === users.id
  },
  userTrackAccess: {
    user: (access: any, users: any) => 
      access.userId === users.id,
    audioTrack: (access: any, audioTracks: any) => 
      access.audioTrackId === audioTracks.id,
    grantedBy: (access: any, users: any) => 
      access.grantedById === users.id
  }
};

// Enhanced types for frontend use
export interface AudioTrackWithDetails extends AudioTrack {
  category: Category;
  tags: Tag[];
  progress?: UserProgress;
}

export interface CategoryWithCount extends Category {
  count: number;
}

export interface TagWithCount extends Tag {
  count: number;
}

export interface ShareableLinkWithDetails extends ShareableLink {
  audioTrack: AudioTrack;
  createdBy: User;
}

export interface UserTrackAccessWithDetails extends UserTrackAccess {
  user: User;
  audioTrack: AudioTrack;
  grantedBy: User;
}
