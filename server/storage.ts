// Import dotenv at the top to ensure environment variables are loaded before anything else
import dotenv from 'dotenv';
dotenv.config();

import { 
  users, type User, type InsertUser,
  categories, type Category, type InsertCategory,
  tags, type Tag, type InsertTag,
  audioTracks, type AudioTrack, type InsertAudioTrack,
  audioTrackTags, type AudioTrackTag, type InsertAudioTrackTag,
  userProgress, type UserProgress, type InsertUserProgress,
  shareableLinks, type ShareableLink, type InsertShareableLink,
  userTrackAccess, type UserTrackAccess, type InsertUserTrackAccess,
  type AudioTrackWithDetails, type CategoryWithCount, type TagWithCount,
  type ShareableLinkWithDetails, type UserTrackAccessWithDetails
} from "@shared/schema";
import { eq, inArray, like, or, and } from "drizzle-orm/expressions";

export interface IStorage {
  sessionStore: any;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  resetUserPassword(userId: number, newPassword: string): Promise<User | undefined>;
  
  // Admin user operations
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, userData: { role: string }): Promise<User | undefined>;
  
  // Category operations
  getAllCategories(): Promise<CategoryWithCount[]>;
  getCategoryById(id: number): Promise<Category | undefined>;
  getCategoryByName(name: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategoryCount(id: number, count: number): Promise<Category>;
  updateCategory(id: number, categoryData: Partial<Category>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;
  
  // Tag operations
  getAllTags(): Promise<TagWithCount[]>;
  getTagById(id: number): Promise<Tag | undefined>;
  getTagByName(name: string): Promise<Tag | undefined>;
  createTag(tag: InsertTag): Promise<Tag>;
  updateTag(id: number, tagData: Partial<Tag>): Promise<Tag | undefined>;
  deleteTag(id: number): Promise<boolean>;
  
  // Audio track operations
  getAllAudioTracks(): Promise<AudioTrack[]>;
  getAudioTrackById(id: number): Promise<AudioTrack | undefined>;
  getAudioTracksByCategory(categoryId: number): Promise<AudioTrack[]>;
  getAudioTracksByTag(tagId: number): Promise<AudioTrack[]>;
  searchAudioTracks(query: string): Promise<AudioTrack[]>;
  createAudioTrack(track: InsertAudioTrack): Promise<AudioTrack>;
  updateAudioTrack(id: number, trackData: Partial<AudioTrack>): Promise<AudioTrack | undefined>;
  deleteAudioTrack(id: number): Promise<boolean>;
  
  // Audio track tags operations
  getTagsForAudioTrack(audioTrackId: number): Promise<Tag[]>;
  addTagToAudioTrack(audioTrackId: number, tagId: number): Promise<AudioTrackTag>;
  
  // User progress operations
  getUserProgress(userId: number, audioTrackId: number): Promise<UserProgress | undefined>;
  getAllUserProgress(userId: number): Promise<UserProgress[]>;
  saveUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
  
  // Combined operations for frontend
  getAudioTrackWithDetails(id: number, userId?: number): Promise<AudioTrackWithDetails | undefined>;
  getAllAudioTracksWithDetails(userId?: number): Promise<AudioTrackWithDetails[]>;
  getAudioTracksByCategoryWithDetails(categoryId: number, userId?: number): Promise<AudioTrackWithDetails[]>;
  
  // Admin operations for shareable links
  createShareableLink(link: InsertShareableLink): Promise<ShareableLink>;
  getShareableLinkById(id: number): Promise<ShareableLink | undefined>;
  getShareableLinkByLinkId(linkId: string): Promise<ShareableLink | undefined>;
  getAllShareableLinks(): Promise<ShareableLink[]>;
  getUserShareableLinks(userId: number): Promise<ShareableLink[]>;
  updateShareableLink(id: number, isActive: boolean): Promise<ShareableLink>;
  deleteShareableLink(id: number): Promise<void>;
  
  // User track access operations
  grantUserAccess(access: InsertUserTrackAccess): Promise<UserTrackAccess>;
  revokeUserAccess(userId: number, audioTrackId: number): Promise<void>;
  getUsersWithAccessToTrack(audioTrackId: number): Promise<User[]>;
  checkUserAccessToTrack(userId: number, audioTrackId: number): Promise<boolean>;
  getTracksByUser(userId: number): Promise<AudioTrack[]>;
}

import createMemoryStore from 'memorystore';
import session from 'express-session';

const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  sessionStore: any;
  
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private tags: Map<number, Tag>;
  private audioTracks: Map<number, AudioTrack>;
  private audioTrackTags: Map<number, AudioTrackTag>;
  private userProgress: Map<string, UserProgress>; // key: `${userId}-${audioTrackId}`
  
  private currentUserId: number;
  private currentCategoryId: number;
  private currentTagId: number;
  private currentAudioTrackId: number;
  private currentAudioTrackTagId: number;
  private currentUserProgressId: number;
  
  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.tags = new Map();
    this.audioTracks = new Map();
    this.audioTrackTags = new Map();
    this.userProgress = new Map();
    
    // Initialize session store
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    this.currentUserId = 1;
    this.currentCategoryId = 1;
    this.currentTagId = 1;
    this.currentAudioTrackId = 1;
    this.currentAudioTrackTagId = 1;
    this.currentUserProgressId = 1;
    
    // Initialize with sample data
    this.initializeSync();
  }
  
  private initializeSync() {
    // Create admin user with bcrypt hashed password
    // Using hardcoded hash for initialization since we can't use bcrypt.hashSync in the constructor
    // This is the bcrypt hash of 'admin123' with 10 rounds
    const hashedPassword = '$2a$10$uVz7RbxcRn9Y.C0xvEHh9um.SjPx00W3RdLq5QQZ0GUm21ThJqt6W';
    
    const adminUser: User = {
      id: this.currentUserId++,
      username: "admin",
      password: hashedPassword,  // Hashed password for proper authentication
      role: "admin",
      fullName: "Admin User",
      email: "admin@example.com",
      createdAt: new Date()
    };
    this.users.set(adminUser.id, adminUser);
    console.log("Created admin user:", adminUser.username);
    
    // Create single category directly without async
    const hypnosisCategory: Category = { 
      id: this.currentCategoryId++,
      name: "Hypnosis", 
      description: "Guided hypnosis sessions for relaxation and personal growth",
      imageUrl: null,
      count: 0
    };
    this.categories.set(hypnosisCategory.id, hypnosisCategory);
    console.log("Created hypnosis category:", hypnosisCategory);
    
    // Create single tag directly
    const hypnosisTag: Tag = { id: this.currentTagId++, name: "Hypnosis" };
    this.tags.set(hypnosisTag.id, hypnosisTag);
    
    // Create demo tracks for the Hypnosis category
    const track1: AudioTrack = {
      id: this.currentAudioTrackId++,
      title: "Deep Relaxation Hypnosis",
      description: "Peaceful guided hypnosis with ocean sounds",
      categoryId: hypnosisCategory.id,
      imageUrl: hypnosisCategory.imageUrl || "https://images.unsplash.com/photo-1506126613408-eca07ce68773?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
      audioUrl: "/audio/relaxation_journey.mp3",
      duration: 1215, // 20:15
      createdAt: new Date(),
      isPublic: true
    };
    this.audioTracks.set(track1.id, track1);
    
    const track2: AudioTrack = {
      id: this.currentAudioTrackId++,
      title: "Sleep Induction Hypnotherapy",
      description: "Fall asleep faster with gentle voice guidance",
      categoryId: hypnosisCategory.id,
      imageUrl: hypnosisCategory.imageUrl || "https://images.unsplash.com/photo-1518112166137-85f9979a43aa?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
      audioUrl: "/audio/sleep_induction.mp3",
      duration: 1965, // 32:45
      createdAt: new Date(),
      isPublic: true
    };
    this.audioTracks.set(track2.id, track2);
    
    const track3: AudioTrack = {
      id: this.currentAudioTrackId++,
      title: "Confidence Hypnosis",
      description: "Build lasting confidence and self-esteem",
      categoryId: hypnosisCategory.id,
      imageUrl: hypnosisCategory.imageUrl || "https://images.unsplash.com/photo-1534859108275-a3a6f23619fb?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
      audioUrl: "/audio/confidence_boost.mp3",
      duration: 930, // 15:30
      createdAt: new Date(),
      isPublic: false
    };
    this.audioTracks.set(track3.id, track3);
    
    // Add the Hypnosis tag to all tracks
    const addTag = (audioTrackId: number, tagId: number) => {
      const id = this.currentAudioTrackTagId++;
      const audioTrackTag: AudioTrackTag = { id, audioTrackId, tagId };
      this.audioTrackTags.set(id, audioTrackTag);
    };
    
    // Add the hypnosis tag to all tracks
    addTag(track1.id, hypnosisTag.id);
    addTag(track2.id, hypnosisTag.id);
    addTag(track3.id, hypnosisTag.id);
    
    // Update category count directly
    hypnosisCategory.count = 3;
    this.categories.set(hypnosisCategory.id, hypnosisCategory);
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }
  
  async resetUserPassword(userId: number, newPassword: string): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    // Note: newPassword should already be hashed when called from the admin password reset API
    // as we're handling the hashing in the routes
    const updatedUser = { ...user, password: newPassword };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async updateUser(id: number, userData: { role: string }): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Category operations
  async getAllCategories(): Promise<CategoryWithCount[]> {
    return Array.from(this.categories.values()) as CategoryWithCount[];
  }
  
  async getCategoryById(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }
  
  async getCategoryByName(name: string): Promise<Category | undefined> {
    return Array.from(this.categories.values()).find(
      (category) => category.name === name
    );
  }
  
  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = this.currentCategoryId++;
    const category: Category = { ...insertCategory, id, count: 0 };
    this.categories.set(id, category);
    return category;
  }
  
  async updateCategoryCount(id: number, count: number): Promise<Category> {
    // Safeguard against undefined id
    if (id === undefined) {
      throw new Error("Cannot update category count with undefined id");
    }
    
    const category = this.categories.get(id);
    if (!category) {
      throw new Error(`Category with id ${id} not found`);
    }
    
    const updatedCategory = { ...category, count };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }
  
  async updateCategory(id: number, categoryData: Partial<Category>): Promise<Category | undefined> {
    const category = await this.getCategoryById(id);
    if (!category) return undefined;
    
    const updatedCategory = { ...category, ...categoryData };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }
  
  async deleteCategory(id: number): Promise<boolean> {
    if (!this.categories.has(id)) return false;
    return this.categories.delete(id);
  }
  
  // Tag operations
  async getAllTags(): Promise<TagWithCount[]> {
    const tags = Array.from(this.tags.values());
    const tagsWithCounts: TagWithCount[] = [];
    
    for (const tag of tags) {
      const count = Array.from(this.audioTrackTags.values()).filter(
        (att) => att.tagId === tag.id
      ).length;
      
      tagsWithCounts.push({ ...tag, count });
    }
    
    return tagsWithCounts;
  }
  
  async getTagById(id: number): Promise<Tag | undefined> {
    return this.tags.get(id);
  }
  
  async getTagByName(name: string): Promise<Tag | undefined> {
    return Array.from(this.tags.values()).find(
      (tag) => tag.name === name
    );
  }
  
  async createTag(insertTag: InsertTag): Promise<Tag> {
    const id = this.currentTagId++;
    const tag: Tag = { ...insertTag, id };
    this.tags.set(id, tag);
    return tag;
  }
  
  async updateTag(id: number, tagData: Partial<Tag>): Promise<Tag | undefined> {
    const tag = await this.getTagById(id);
    if (!tag) return undefined;
    
    const updatedTag = { ...tag, ...tagData };
    this.tags.set(id, updatedTag);
    return updatedTag;
  }
  
  async deleteTag(id: number): Promise<boolean> {
    if (!this.tags.has(id)) return false;
    
    // Delete the tag itself
    this.tags.delete(id);
    
    // Remove any audio track tag associations
    Array.from(this.audioTrackTags.entries())
      .filter(([_, att]) => att.tagId === id)
      .forEach(([attId, _]) => this.audioTrackTags.delete(attId));
    
    return true;
  }
  
  // Audio track operations
  async getAllAudioTracks(): Promise<AudioTrack[]> {
    return Array.from(this.audioTracks.values());
  }
  
  async getAudioTrackById(id: number): Promise<AudioTrack | undefined> {
    return this.audioTracks.get(id);
  }
  
  async getAudioTracksByCategory(categoryId: number): Promise<AudioTrack[]> {
    return Array.from(this.audioTracks.values()).filter(
      (track) => track.categoryId === categoryId
    );
  }
  
  async getAudioTracksByTag(tagId: number): Promise<AudioTrack[]> {
    const audioTrackTagIds = Array.from(this.audioTrackTags.values())
      .filter((att) => att.tagId === tagId)
      .map((att) => att.audioTrackId);
    
    return Array.from(this.audioTracks.values()).filter(
      (track) => audioTrackTagIds.includes(track.id)
    );
  }
  
  async searchAudioTracks(query: string): Promise<AudioTrack[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.audioTracks.values()).filter(
      (track) => 
        track.title.toLowerCase().includes(lowerQuery) ||
        track.description.toLowerCase().includes(lowerQuery)
    );
  }
  
  async createAudioTrack(insertTrack: InsertAudioTrack): Promise<AudioTrack> {
    const id = this.currentAudioTrackId++;
    const track: AudioTrack = { 
      ...insertTrack, 
      id, 
      createdAt: new Date(), 
      isPublic: insertTrack.isPublic !== undefined ? insertTrack.isPublic : false 
    };
    this.audioTracks.set(id, track);
    return track;
  }
  
  async updateAudioTrack(id: number, trackData: Partial<AudioTrack>): Promise<AudioTrack | undefined> {
    const track = await this.getAudioTrackById(id);
    if (!track) return undefined;
    
    const updatedTrack: AudioTrack = { ...track, ...trackData };
    this.audioTracks.set(id, updatedTrack);
    return updatedTrack;
  }
  
  async deleteAudioTrack(id: number): Promise<boolean> {
    const track = this.audioTracks.get(id);
    if (!track) return false;
    
    this.audioTracks.delete(id);
    
    // Remove any audio track tags associated with this track
    Array.from(this.audioTrackTags.entries())
      .filter(([_, tag]) => tag.audioTrackId === id)
      .forEach(([tagId, _]) => this.audioTrackTags.delete(tagId));
    
    return true;
  }
  
  // Audio track tags operations
  async getTagsForAudioTrack(audioTrackId: number): Promise<Tag[]> {
    const tagIds = Array.from(this.audioTrackTags.values())
      .filter((att) => att.audioTrackId === audioTrackId)
      .map((att) => att.tagId);
    
    return Array.from(this.tags.values()).filter(
      (tag) => tagIds.includes(tag.id)
    );
  }
  
  async addTagToAudioTrack(audioTrackId: number, tagId: number): Promise<AudioTrackTag> {
    const id = this.currentAudioTrackTagId++;
    const audioTrackTag: AudioTrackTag = { 
      id, 
      audioTrackId, 
      tagId 
    };
    
    this.audioTrackTags.set(id, audioTrackTag);
    return audioTrackTag;
  }
  
  // User progress operations
  async getUserProgress(userId: number, audioTrackId: number): Promise<UserProgress | undefined> {
    const key = `${userId}-${audioTrackId}`;
    return this.userProgress.get(key);
  }
  
  async getAllUserProgress(userId: number): Promise<UserProgress[]> {
    return Array.from(this.userProgress.values()).filter(
      (progress) => progress.userId === userId
    );
  }
  
  async saveUserProgress(insertProgress: InsertUserProgress): Promise<UserProgress> {
    const { userId, audioTrackId } = insertProgress;
    const key = `${userId}-${audioTrackId}`;
    const existingProgress = this.userProgress.get(key);
    
    let id: number;
    if (existingProgress) {
      id = existingProgress.id;
    } else {
      id = this.currentUserProgressId++;
    }
    
    const progress: UserProgress = { 
      ...insertProgress, 
      id,
      completed: insertProgress.completed !== undefined ? insertProgress.completed : null,
      updatedAt: new Date()
    };
    
    this.userProgress.set(key, progress);
    return progress;
  }
  
  // Combined operations for frontend
  async getAudioTrackWithDetails(id: number, userId?: number): Promise<AudioTrackWithDetails | undefined> {
    const audioTrack = await this.getAudioTrackById(id);
    if (!audioTrack) return undefined;
    
    const category = await this.getCategoryById(audioTrack.categoryId);
    if (!category) return undefined;
    
    const tags = await this.getTagsForAudioTrack(id);
    
    let progress: UserProgress | undefined;
    if (userId) {
      progress = await this.getUserProgress(userId, id);
    }
    
    return {
      ...audioTrack,
      category,
      tags,
      progress
    };
  }
  
  async getAllAudioTracksWithDetails(userId?: number): Promise<AudioTrackWithDetails[]> {
    const audioTracks = await this.getAllAudioTracks();
    const results: AudioTrackWithDetails[] = [];
    
    for (const track of audioTracks) {
      const trackWithDetails = await this.getAudioTrackWithDetails(track.id, userId);
      if (trackWithDetails) {
        results.push(trackWithDetails);
      }
    }
    
    return results;
  }
  
  async getAudioTracksByCategoryWithDetails(categoryId: number, userId?: number): Promise<AudioTrackWithDetails[]> {
    const audioTracks = await this.getAudioTracksByCategory(categoryId);
    const results: AudioTrackWithDetails[] = [];
    
    for (const track of audioTracks) {
      const trackWithDetails = await this.getAudioTrackWithDetails(track.id, userId);
      if (trackWithDetails) {
        results.push(trackWithDetails);
      }
    }
    
    return results;
  }
}

import { db } from "./db";
import { eq, and, like, desc, asc, inArray, or, not, isNull } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      tableName: 'session',
      createTableIfMissing: true 
    });
    
    // Initialize database with sample data if empty
    this.initializeDatabase();
  }
  
  // Category operations
  async updateCategory(id: number, categoryData: Partial<Category>): Promise<Category | undefined> {
    try {
      const category = await this.getCategoryById(id);
      if (!category) return undefined;
      
      const [updatedCategory] = await db
        .update(categories)
        .set(categoryData)
        .where(eq(categories.id, id))
        .returning();
      
      return updatedCategory;
    } catch (error) {
      console.error('Error updating category:', error);
      return undefined;
    }
  }
  
  async deleteCategory(id: number): Promise<boolean> {
    try {
      await db
        .delete(categories)
        .where(eq(categories.id, id));
      
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      return false;
    }
  }
  
  // Tag operations
  async updateTag(id: number, tagData: Partial<Tag>): Promise<Tag | undefined> {
    try {
      const tag = await this.getTagById(id);
      if (!tag) return undefined;
      
      const [updatedTag] = await db
        .update(tags)
        .set(tagData)
        .where(eq(tags.id, id))
        .returning();
      
      return updatedTag;
    } catch (error) {
      console.error('Error updating tag:', error);
      return undefined;
    }
  }
  
  async deleteTag(id: number): Promise<boolean> {
    try {
      await db
        .delete(tags)
        .where(eq(tags.id, id));
      
      return true;
    } catch (error) {
      console.error('Error deleting tag:', error);
      return false;
    }
  }
  
  // User track access operations
  async checkUserAccessToTrack(userId: number, audioTrackId: number): Promise<boolean> {
    try {
      const [access] = await db.select()
        .from(userTrackAccess)
        .where(and(
          eq(userTrackAccess.userId, userId),
          eq(userTrackAccess.audioTrackId, audioTrackId)
        ));
      
      return !!access;
    } catch (error) {
      console.error('Error checking user access to track:', error);
      return false;
    }
  }
  
  private async initializeDatabase() {
    try {
      // Check if we already have users
      const existingUsers = await db.select().from(users);
      
      if (existingUsers.length === 0) {
        console.log("Initializing database with sample data...");
        await this.createSampleData();
      } else {
        console.log(`Database already has ${existingUsers.length} users, skipping initialization.`);
      }
    } catch (error) {
      console.error("Error during database initialization:", error);
    }
  }
  
  private async createSampleData() {
    try {
      // Create admin user
      const adminUser = await this.createUser({
        username: "admin",
        password: "admin123",
        role: "admin",
        fullName: "Admin User",
        email: "admin@example.com",
      });
      console.log("Created admin user:", adminUser.username);

      // Create categories
      const relaxation = await this.createCategory({
        name: "Relaxation",
        description: "Peaceful guided meditations with calming sounds",
      });
      console.log("Created relaxation category:", relaxation.name);

      const confidence = await this.createCategory({
        name: "Confidence",
        description: "Build lasting confidence and self-esteem",
      });
      console.log("Created confidence category:", confidence.name);

      const sleep = await this.createCategory({
        name: "Sleep",
        description: "Fall asleep faster with gentle voice guidance",
      });
      console.log("Created sleep category:", sleep.name);

      const stress = await this.createCategory({
        name: "Stress Relief",
        description: "Release stress and find inner calm",
      });
      console.log("Created stress category:", stress.name);

      // Create tags
      const guidedTag = await this.createTag({ name: "Guided" });
      const deepTranceTag = await this.createTag({ name: "Deep trance" });
      const beginnerTag = await this.createTag({ name: "Beginner" });
      const backgroundMusicTag = await this.createTag({ name: "Background music" });
      const motivationTag = await this.createTag({ name: "Motivation" });
      const anxietyTag = await this.createTag({ name: "Anxiety" });
      const natureSoundsTag = await this.createTag({ name: "Nature Sounds" });
      const longSessionTag = await this.createTag({ name: "Long Session" });

      // Create audio tracks
      const track1 = await this.createAudioTrack({
        title: "Deep Relaxation Journey",
        description: "Peaceful guided meditation with ocean sounds",
        categoryId: relaxation.id,
        imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
        audioUrl: "/audio/relaxation_journey.mp3",
        duration: 1215, // 20:15
        isPublic: true
      });

      const track2 = await this.createAudioTrack({
        title: "Peaceful Sleep Induction",
        description: "Fall asleep faster with gentle voice guidance",
        categoryId: sleep.id,
        imageUrl: "https://images.unsplash.com/photo-1518112166137-85f9979a43aa?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
        audioUrl: "/audio/sleep_induction.mp3",
        duration: 1965, // 32:45
        isPublic: true
      });

      const track3 = await this.createAudioTrack({
        title: "Self-Confidence Boost",
        description: "Build lasting confidence and self-esteem",
        categoryId: confidence.id,
        imageUrl: "https://images.unsplash.com/photo-1534859108275-a3a6f23619fb?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
        audioUrl: "/audio/confidence_boost.mp3",
        duration: 930, // 15:30
        isPublic: true
      });

      const track4 = await this.createAudioTrack({
        title: "Anxiety Reduction",
        description: "Release stress and find inner calm",
        categoryId: stress.id,
        imageUrl: "https://images.unsplash.com/photo-1476611338391-6f395a0ebc7b?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
        audioUrl: "/audio/anxiety_reduction.mp3",
        duration: 1100, // 18:20
        isPublic: true
      });

      const track5 = await this.createAudioTrack({
        title: "Rainy Day Relaxation",
        description: "Gentle rain sounds with calming guidance",
        categoryId: relaxation.id,
        imageUrl: "https://images.unsplash.com/photo-1529693662653-9d480530a697?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
        audioUrl: "/audio/rainy_day.mp3",
        duration: 1510, // 25:10
        isPublic: true
      });

      const track6 = await this.createAudioTrack({
        title: "Deep Sleep Journey",
        description: "Extended sleep hypnosis for insomnia",
        categoryId: sleep.id,
        imageUrl: "https://images.unsplash.com/photo-1502139214982-d0ad755818d8?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
        audioUrl: "/audio/deep_sleep.mp3",
        duration: 2700, // 45:00
        isPublic: true
      });

      // Add tags to tracks
      await this.addTagToAudioTrack(track1.id, guidedTag.id);
      await this.addTagToAudioTrack(track1.id, relaxation.id);

      await this.addTagToAudioTrack(track2.id, sleep.id);
      await this.addTagToAudioTrack(track2.id, deepTranceTag.id);

      await this.addTagToAudioTrack(track3.id, confidence.id);
      await this.addTagToAudioTrack(track3.id, motivationTag.id);

      await this.addTagToAudioTrack(track4.id, stress.id);
      await this.addTagToAudioTrack(track4.id, anxietyTag.id);

      await this.addTagToAudioTrack(track5.id, relaxation.id);
      await this.addTagToAudioTrack(track5.id, natureSoundsTag.id);

      await this.addTagToAudioTrack(track6.id, sleep.id);
      await this.addTagToAudioTrack(track6.id, longSessionTag.id);

      // Update category counts
      await this.updateCategoryCount(relaxation.id, 2);
      await this.updateCategoryCount(confidence.id, 1);
      await this.updateCategoryCount(sleep.id, 2);
      await this.updateCategoryCount(stress.id, 1);

      console.log("Sample data initialization complete!");
    } catch (error) {
      console.error("Error creating sample data:", error);
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Add createdAt field to the insert data
    const userData = {
      ...insertUser,
      createdAt: new Date()
    };
    
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async updateUser(id: number, userData: { role: string }): Promise<User | undefined> {
    try {
      const [user] = await db
        .update(users)
        .set(userData)
        .where(eq(users.id, id))
        .returning();
      return user;
    } catch (error) {
      console.error("Error updating user:", error);
      return undefined;
    }
  }
  
  async resetUserPassword(userId: number, newPassword: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .update(users)
        .set({ password: newPassword })
        .where(eq(users.id, userId))
        .returning();
      return user;
    } catch (error) {
      console.error("Error resetting user password:", error);
      return undefined;
    }
  }

  // Category operations
  async getAllCategories(): Promise<CategoryWithCount[]> {
    const categoriesResult = await db.select().from(categories);
    return categoriesResult;
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async getCategoryByName(name: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.name, name));
    return category;
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(insertCategory).returning();
    return category;
  }

  async updateCategoryCount(id: number, count: number): Promise<Category> {
    const [category] = await db
      .update(categories)
      .set({ count })
      .where(eq(categories.id, id))
      .returning();
    return category;
  }

  // Tag operations
  async getAllTags(): Promise<TagWithCount[]> {
    const tagsResult = await db.select().from(tags);
    
    // Count tag occurrences manually using a raw query because drizzle-orm doesn't support aggregate functions directly
    const countsQuery = `
      SELECT "tag_id" as "tagId", COUNT(*) as "count"
      FROM "audio_track_tags"
      GROUP BY "tag_id"
    `;
    const counts = await db.execute(countsQuery);
    
    const countMap = new Map<number, number>();
    counts.rows.forEach(c => countMap.set(Number(c.tagId), Number(c.count)));
    
    return tagsResult.map(tag => ({
      ...tag,
      count: countMap.get(tag.id) || 0
    }));
  }

  async getTagById(id: number): Promise<Tag | undefined> {
    const [tag] = await db.select().from(tags).where(eq(tags.id, id));
    return tag;
  }

  async getTagByName(name: string): Promise<Tag | undefined> {
    const [tag] = await db.select().from(tags).where(eq(tags.name, name));
    return tag;
  }

  async createTag(insertTag: InsertTag): Promise<Tag> {
    const [tag] = await db.insert(tags).values(insertTag).returning();
    return tag;
  }

  // Audio track operations
  async getAllAudioTracks(): Promise<AudioTrack[]> {
    return db.select().from(audioTracks);
  }

  async getAudioTrackById(id: number): Promise<AudioTrack | undefined> {
    const [track] = await db.select().from(audioTracks).where(eq(audioTracks.id, id));
    return track;
  }

  async getAudioTracksByCategory(categoryId: number): Promise<AudioTrack[]> {
    return db.select().from(audioTracks).where(eq(audioTracks.categoryId, categoryId));
  }

  async getAudioTracksByTag(tagId: number): Promise<AudioTrack[]> {
    const bridgeRecords = await db
      .select()
      .from(audioTrackTags)
      .where(eq(audioTrackTags.tagId, tagId));
    
    const audioTrackIds = bridgeRecords.map(r => r.audioTrackId);
    
    if (audioTrackIds.length === 0) {
      return [];
    }
    
    return db
      .select()
      .from(audioTracks)
      .where(inArray(audioTracks.id, audioTrackIds));
  }

  async searchAudioTracks(query: string): Promise<AudioTrack[]> {
    return db
      .select()
      .from(audioTracks)
      .where(
        or(
          like(audioTracks.title, `%${query}%`),
          like(audioTracks.description, `%${query}%`)
        )
      );
  }

  async createAudioTrack(insertTrack: InsertAudioTrack): Promise<AudioTrack> {
    // Add createdAt field to the insert data
    const trackData = {
      ...insertTrack,
      createdAt: new Date()
    };
    
    const [track] = await db.insert(audioTracks).values(trackData).returning();
    return track;
  }
  
  async updateAudioTrack(id: number, trackData: Partial<AudioTrack>): Promise<AudioTrack | undefined> {
    try {
      const [track] = await db
        .update(audioTracks)
        .set(trackData)
        .where(eq(audioTracks.id, id))
        .returning();
      return track;
    } catch (error) {
      console.error("Error updating audio track:", error);
      return undefined;
    }
  }
  
  async deleteAudioTrack(id: number): Promise<boolean> {
    try {
      // First delete any references in audioTrackTags
      await db
        .delete(audioTrackTags)
        .where(eq(audioTrackTags.audioTrackId, id));
      
      // Then delete the track
      await db
        .delete(audioTracks)
        .where(eq(audioTracks.id, id));
      
      return true;
    } catch (error) {
      console.error("Error deleting audio track:", error);
      return false;
    }
  }

  // Audio track tags operations
  async getTagsForAudioTrack(audioTrackId: number): Promise<Tag[]> {
    const bridgeRecords = await db
      .select()
      .from(audioTrackTags)
      .where(eq(audioTrackTags.audioTrackId, audioTrackId));
    
    const tagIds = bridgeRecords.map(r => r.tagId);
    
    if (tagIds.length === 0) {
      return [];
    }
    
    return db
      .select()
      .from(tags)
      .where(inArray(tags.id, tagIds));
  }

  async addTagToAudioTrack(audioTrackId: number, tagId: number): Promise<AudioTrackTag> {
    const [audioTrackTag] = await db
      .insert(audioTrackTags)
      .values({ audioTrackId, tagId })
      .returning();
    return audioTrackTag;
  }

  // User progress operations
  async getUserProgress(userId: number, audioTrackId: number): Promise<UserProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userProgress)
      .where(
        and(
          eq(userProgress.userId, userId),
          eq(userProgress.audioTrackId, audioTrackId)
        )
      );
    return progress;
  }

  async getAllUserProgress(userId: number): Promise<UserProgress[]> {
    return db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId));
  }

  async saveUserProgress(insertProgress: InsertUserProgress): Promise<UserProgress> {
    // Check if progress already exists
    const existing = await this.getUserProgress(
      insertProgress.userId,
      insertProgress.audioTrackId
    );
    
    if (existing) {
      // Update existing record
      const [updated] = await db
        .update(userProgress)
        .set(insertProgress)
        .where(eq(userProgress.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new record
      const [newProgress] = await db
        .insert(userProgress)
        .values(insertProgress)
        .returning();
      return newProgress;
    }
  }

  // Combined operations for frontend
  async getAudioTrackWithDetails(id: number, userId?: number): Promise<AudioTrackWithDetails | undefined> {
    const track = await this.getAudioTrackById(id);
    if (!track) return undefined;
    
    const category = await this.getCategoryById(track.categoryId);
    if (!category) return undefined;
    
    const tags = await this.getTagsForAudioTrack(id);
    
    let progress = undefined;
    if (userId) {
      progress = await this.getUserProgress(userId, id);
    }
    
    return {
      ...track,
      category,
      tags,
      progress
    };
  }

  async getAllAudioTracksWithDetails(userId?: number): Promise<AudioTrackWithDetails[]> {
    const tracks = await this.getAllAudioTracks();
    
    const result: AudioTrackWithDetails[] = [];
    
    for (const track of tracks) {
      const category = await this.getCategoryById(track.categoryId);
      const tags = await this.getTagsForAudioTrack(track.id);
      
      let progress = undefined;
      if (userId) {
        progress = await this.getUserProgress(userId, track.id);
      }
      
      if (category) {
        result.push({
          ...track,
          category,
          tags,
          progress
        });
      }
    }
    
    return result;
  }

  async getAudioTracksByCategoryWithDetails(categoryId: number, userId?: number): Promise<AudioTrackWithDetails[]> {
    const tracks = await this.getAudioTracksByCategory(categoryId);
    const category = await this.getCategoryById(categoryId);
    
    if (!category) return [];
    
    const result: AudioTrackWithDetails[] = [];
    
    for (const track of tracks) {
      const tags = await this.getTagsForAudioTrack(track.id);
      
      let progress = undefined;
      if (userId) {
        progress = await this.getUserProgress(userId, track.id);
      }
      
      result.push({
        ...track,
        category,
        tags,
        progress
      });
    }
    
    return result;
  }

  // Admin operations for shareable links
  async createShareableLink(insertLink: InsertShareableLink): Promise<ShareableLink> {
    const [link] = await db.insert(shareableLinks).values(insertLink).returning();
    return link;
  }
  
  async getShareableLinkById(id: number): Promise<ShareableLink | undefined> {
    const [link] = await db.select().from(shareableLinks).where(eq(shareableLinks.id, id));
    return link;
  }
  
  async getShareableLinkByLinkId(linkId: string): Promise<ShareableLink | undefined> {
    const [link] = await db
      .select()
      .from(shareableLinks)
      .where(eq(shareableLinks.linkId, linkId as any));
    return link;
  }
  
  async getAllShareableLinks(): Promise<ShareableLink[]> {
    return db.select().from(shareableLinks);
  }
  
  async getUserShareableLinks(userId: number): Promise<ShareableLink[]> {
    return db.select().from(shareableLinks).where(eq(shareableLinks.createdById, userId));
  }
  
  async updateShareableLink(id: number, isActive: boolean): Promise<ShareableLink> {
    const [link] = await db
      .update(shareableLinks)
      .set({ isActive })
      .where(eq(shareableLinks.id, id))
      .returning();
    return link;
  }
  
  async deleteShareableLink(id: number): Promise<void> {
    await db.delete(shareableLinks).where(eq(shareableLinks.id, id));
  }
  
  // User track access operations
  async grantUserAccess(insertAccess: InsertUserTrackAccess): Promise<UserTrackAccess> {
    try {
      // Only include fields that we know exist in the database schema
      const accessData = {
        userId: insertAccess.userId,
        audioTrackId: insertAccess.audioTrackId,
        grantedById: insertAccess.grantedById
      };
      
      const [access] = await db.insert(userTrackAccess).values(accessData).returning();
      return access;
    } catch (error) {
      console.error("Error in grantUserAccess:", error);
      
      // If the insert fails due to missing column, create a minimal version
      try {
        // Try with minimal fields if the grantedById column is missing
        const minimalAccessData = {
          userId: insertAccess.userId,
          audioTrackId: insertAccess.audioTrackId
        };
        
        // Try the insert without grantedById
        const [access] = await db.insert(userTrackAccess)
          .values(minimalAccessData as any)
          .returning();
        
        return {
          ...access,
          grantedById: insertAccess.grantedById // Add it back for API consistency
        };
      } catch (fallbackError) {
        console.error("Fallback error in grantUserAccess:", fallbackError);
        throw new Error("Failed to grant user access");
      }
    }
  }
  
  async revokeUserAccess(userId: number, audioTrackId: number): Promise<void> {
    try {
      await db
        .delete(userTrackAccess)
        .where(
          and(
            eq(userTrackAccess.userId, userId),
            eq(userTrackAccess.audioTrackId, audioTrackId)
          )
        );
    } catch (error) {
      console.error("Error in revokeUserAccess:", error);
      throw new Error("Failed to revoke user access");
    }
  }
  
  async getUsersWithAccessToTrack(audioTrackId: number): Promise<User[]> {
    try {
      const accessRecords = await db
        .select({
          userId: userTrackAccess.userId,
          audioTrackId: userTrackAccess.audioTrackId
        })
        .from(userTrackAccess)
        .where(eq(userTrackAccess.audioTrackId, audioTrackId));
      
      const userIds = accessRecords.map(r => r.userId);
      
      if (userIds.length === 0) {
        return [];
      }
      
      return db.select().from(users).where(inArray(users.id, userIds));
    } catch (error) {
      console.error("Error in getUsersWithAccessToTrack:", error);
      // Fallback approach if the query fails
      return [];
    }
  }
  
  async checkUserAccessToTrack(userId: number, audioTrackId: number): Promise<boolean> {
    try {
      // Check if user has explicit access to the track
      const [access] = await db
        .select({
          userId: userTrackAccess.userId,
          audioTrackId: userTrackAccess.audioTrackId
        })
        .from(userTrackAccess)
        .where(
          and(
            eq(userTrackAccess.userId, userId),
            eq(userTrackAccess.audioTrackId, audioTrackId)
          )
        );
        
      if (access) return true;
      
      // Check if the track is public
      const [track] = await db
        .select({
          id: audioTracks.id,
          isPublic: audioTracks.isPublic
        })
        .from(audioTracks)
        .where(
          and(
            eq(audioTracks.id, audioTrackId),
            eq(audioTracks.isPublic, true)
          )
        );
        
      return !!track;
    } catch (error) {
      console.error("Error in checkUserAccessToTrack:", error);
      // If there's an error, default to false (no access)
      return false;
    }
  }
  
  async getTracksByUser(userId: number): Promise<AudioTrack[]> {
    try {
      // Get all tracks user has access to
      const accessRecords = await db
        .select({
          userId: userTrackAccess.userId,
          audioTrackId: userTrackAccess.audioTrackId
        })
        .from(userTrackAccess)
        .where(eq(userTrackAccess.userId, userId));
      
      const privateTrackIds = accessRecords.map(r => r.audioTrackId);
      
      // Get all public tracks + private tracks user has access to
      return db
        .select({
          id: audioTracks.id,
          title: audioTracks.title,
          description: audioTracks.description,
          categoryId: audioTracks.categoryId,
          imageUrl: audioTracks.imageUrl,
          audioUrl: audioTracks.audioUrl,
          duration: audioTracks.duration,
          isPublic: audioTracks.isPublic,
          createdAt: audioTracks.createdAt
        })
        .from(audioTracks)
        .where(
          or(
            eq(audioTracks.isPublic, true),
            privateTrackIds.length > 0 ? inArray(audioTracks.id, privateTrackIds) : undefined
          )
        );
    } catch (error) {
      console.error("Error in getTracksByUser:", error);
      return [];
    }
  }
}

// Helper methods for MemStorage
// These methods add the functionality needed for the admin section
class MemShareableLinks {
  private links: Map<number, ShareableLink> = new Map();
  private currentLinkId: number = 1;

  constructor() {}

  create(insertLink: InsertShareableLink): ShareableLink {
    const id = this.currentLinkId++;
    const createdAt = new Date();
    // Generate a random linkId if not provided
    const linkId = insertLink.linkId || Math.random().toString(36).substring(2, 15);
    // Set default values for other required fields
    const link: ShareableLink = { 
      ...insertLink, 
      id,
      createdAt,
      linkId,
      isActive: insertLink.isActive !== undefined ? insertLink.isActive : true,
      expiresAt: insertLink.expiresAt !== undefined ? insertLink.expiresAt : null
    };
    this.links.set(id, link);
    return link;
  }

  getById(id: number): ShareableLink | undefined {
    return this.links.get(id);
  }

  getByLinkId(linkId: string): ShareableLink | undefined {
    return Array.from(this.links.values()).find(
      (link) => link.linkId === linkId
    );
  }

  getAll(): ShareableLink[] {
    return Array.from(this.links.values());
  }

  getByUserId(userId: number): ShareableLink[] {
    return Array.from(this.links.values()).filter(
      (link) => link.createdById === userId
    );
  }

  update(id: number, isActive: boolean): ShareableLink | undefined {
    const link = this.links.get(id);
    if (!link) return undefined;

    const updatedLink: ShareableLink = { ...link, isActive };
    this.links.set(id, updatedLink);
    return updatedLink;
  }

  delete(id: number): boolean {
    return this.links.delete(id);
  }
}

class MemTrackAccess {
  private access: Map<string, UserTrackAccess> = new Map();
  private currentAccessId: number = 1;

  constructor() {}

  create(insertAccess: InsertUserTrackAccess): UserTrackAccess {
    const id = this.currentAccessId++;
    const grantedAt = new Date();
    const access: UserTrackAccess = {
      ...insertAccess,
      id,
      grantedAt
    };
    
    const key = `${insertAccess.userId}-${insertAccess.audioTrackId}`;
    this.access.set(key, access);
    return access;
  }

  delete(userId: number, audioTrackId: number): boolean {
    const key = `${userId}-${audioTrackId}`;
    return this.access.delete(key);
  }

  getUsersWithAccess(audioTrackId: number, users: Map<number, User>): User[] {
    const userIds = Array.from(this.access.values())
      .filter(access => access.audioTrackId === audioTrackId)
      .map(access => access.userId);
    
    return Array.from(users.values())
      .filter(user => userIds.includes(user.id));
  }

  hasAccess(userId: number, audioTrackId: number): boolean {
    const key = `${userId}-${audioTrackId}`;
    return this.access.has(key);
  }
  
  getTrackIdsForUser(userId: number): number[] {
    return Array.from(this.access.values())
      .filter(access => access.userId === userId)
      .map(access => access.audioTrackId);
  }
  
  checkUserAccessToTrack(userId: number, audioTrackId: number): Promise<boolean> {
    const key = `${userId}-${audioTrackId}`;
    return Promise.resolve(this.access.has(key));
  }
}

// Add these methods to MemStorage
Object.assign(MemStorage.prototype, {
  // User operations
  getAllUsers() {
    return Array.from(this.users.values());
  },
  updateUser(id, userData) {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  },
  
  // Category operations
  updateCategory(id, categoryData) {
    const category = this.categories.get(id);
    if (!category) return undefined;
    const updatedCategory = { ...category, ...categoryData };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  },
  deleteCategory(id) {
    return this.categories.delete(id);
  },
  
  // Tag operations
  updateTag(id, tagData) {
    const tag = this.tags.get(id);
    if (!tag) return undefined;
    const updatedTag = { ...tag, ...tagData };
    this.tags.set(id, updatedTag);
    return updatedTag;
  },
  deleteTag(id) {
    return this.tags.delete(id);
  },
  
  // Audio track operations
  updateAudioTrack(id, trackData) {
    const track = this.audioTracks.get(id);
    if (!track) return undefined;
    const updatedTrack = { ...track, ...trackData };
    this.audioTracks.set(id, updatedTrack);
    return updatedTrack;
  },
  deleteAudioTrack(id) {
    return this.audioTracks.delete(id);
  },
  
  // Initialize shareable links and track access
  initialized: false,
  shareableLinks: null,
  trackAccess: null,
  
  ensureInitialized() {
    if (!this.initialized) {
      this.shareableLinks = new MemShareableLinks();
      this.trackAccess = new MemTrackAccess();
      this.initialized = true;
    }
  },
  
  // Shareable Links operations
  createShareableLink(insertLink) {
    this.ensureInitialized();
    return this.shareableLinks.create(insertLink);
  },
  getShareableLinkById(id) {
    this.ensureInitialized();
    return this.shareableLinks.getById(id);
  },
  getShareableLinkByLinkId(linkId) {
    this.ensureInitialized();
    return this.shareableLinks.getByLinkId(linkId);
  },
  getAllShareableLinks() {
    this.ensureInitialized();
    return this.shareableLinks.getAll();
  },
  getUserShareableLinks(userId) {
    this.ensureInitialized();
    return this.shareableLinks.getByUserId(userId);
  },
  updateShareableLink(id, isActive) {
    this.ensureInitialized();
    return this.shareableLinks.update(id, isActive);
  },
  deleteShareableLink(id) {
    this.ensureInitialized();
    return this.shareableLinks.delete(id);
  },
  
  // User track access operations
  grantUserAccess(insertAccess) {
    this.ensureInitialized();
    return this.trackAccess.create(insertAccess);
  },
  revokeUserAccess(userId, audioTrackId) {
    this.ensureInitialized();
    return this.trackAccess.delete(userId, audioTrackId);
  },
  getUsersWithAccessToTrack(audioTrackId) {
    this.ensureInitialized();
    return this.trackAccess.getUsersWithAccess(audioTrackId, this.users);
  },
  checkUserAccessToTrack(userId, audioTrackId) {
    this.ensureInitialized();
    return this.trackAccess.hasAccess(userId, audioTrackId);
  },
  
  getTracksByUser(userId) {
    this.ensureInitialized();
    const trackIds = this.trackAccess.getTrackIdsForUser(userId);
    return Array.from(this.audioTracks.values()).filter(track => trackIds.includes(track.id));
  }
});

// Choose storage implementation based on environment variable
// Convert string 'true' to boolean true
const USE_DATABASE = process.env.USE_DATABASE === 'true';
console.log('USE_DATABASE env variable value:', process.env.USE_DATABASE);
console.log('USE_DATABASE parsed as:', USE_DATABASE);

// Don't use DatabaseStorage unless we have a DATABASE_URL
const hasDatabaseUrl = !!process.env.DATABASE_URL;
console.log('DATABASE_URL present:', hasDatabaseUrl);

// Only use DatabaseStorage if both USE_DATABASE is true and we have a DATABASE_URL
const useDatabase = USE_DATABASE && hasDatabaseUrl;
export const storage = useDatabase ? new DatabaseStorage() : new MemStorage();

console.log(`Using ${useDatabase ? 'DatabaseStorage' : 'MemStorage'} for data persistence`);
