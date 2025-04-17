import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  count: integer("count").notNull().default(0),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  description: true,
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
  imageUrl: text("image_url").notNull(),
  audioUrl: text("audio_url").notNull(),
  duration: integer("duration").notNull(), // duration in seconds
});

export const insertAudioTrackSchema = createInsertSchema(audioTracks).pick({
  title: true,
  description: true,
  categoryId: true,
  imageUrl: true,
  audioUrl: true,
  duration: true,
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
