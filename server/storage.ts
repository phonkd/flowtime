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

export interface IStorage {
  sessionStore: any;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Category operations
  getAllCategories(): Promise<CategoryWithCount[]>;
  getCategoryById(id: number): Promise<Category | undefined>;
  getCategoryByName(name: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategoryCount(id: number, count: number): Promise<Category>;
  
  // Tag operations
  getAllTags(): Promise<TagWithCount[]>;
  getTagById(id: number): Promise<Tag | undefined>;
  getTagByName(name: string): Promise<Tag | undefined>;
  createTag(tag: InsertTag): Promise<Tag>;
  
  // Audio track operations
  getAllAudioTracks(): Promise<AudioTrack[]>;
  getAudioTrackById(id: number): Promise<AudioTrack | undefined>;
  getAudioTracksByCategory(categoryId: number): Promise<AudioTrack[]>;
  getAudioTracksByTag(tagId: number): Promise<AudioTrack[]>;
  searchAudioTracks(query: string): Promise<AudioTrack[]>;
  createAudioTrack(track: InsertAudioTrack): Promise<AudioTrack>;
  
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
    // Create admin user
    const adminUser: User = {
      id: this.currentUserId++,
      username: "admin",
      password: "admin123",  // Simple password for testing
      role: "admin",
      fullName: "Admin User",
      email: "admin@example.com"
    };
    this.users.set(adminUser.id, adminUser);
    console.log("Created admin user:", adminUser.username);
    
    // Create categories directly without async
    const relaxation: Category = { 
      id: this.currentCategoryId++,
      name: "Relaxation", 
      description: "Peaceful guided meditations with calming sounds",
      count: 0
    };
    this.categories.set(relaxation.id, relaxation);
    console.log("Created relaxation category:", relaxation);
    
    const confidence: Category = { 
      id: this.currentCategoryId++,
      name: "Confidence", 
      description: "Build lasting confidence and self-esteem",
      count: 0
    };
    this.categories.set(confidence.id, confidence);
    console.log("Created confidence category:", confidence);
    
    const sleep: Category = { 
      id: this.currentCategoryId++,
      name: "Sleep", 
      description: "Fall asleep faster with gentle voice guidance",
      count: 0
    };
    this.categories.set(sleep.id, sleep);
    console.log("Created sleep category:", sleep);
    
    const stress: Category = { 
      id: this.currentCategoryId++,
      name: "Stress Relief", 
      description: "Release stress and find inner calm",
      count: 0
    };
    this.categories.set(stress.id, stress);
    console.log("Created stress category:", stress);
    
    // Create tags directly
    const guided: Tag = { id: this.currentTagId++, name: "Guided" };
    this.tags.set(guided.id, guided);
    
    const deepTrance: Tag = { id: this.currentTagId++, name: "Deep trance" };
    this.tags.set(deepTrance.id, deepTrance);
    
    const beginner: Tag = { id: this.currentTagId++, name: "Beginner" };
    this.tags.set(beginner.id, beginner);
    
    const backgroundMusic: Tag = { id: this.currentTagId++, name: "Background music" };
    this.tags.set(backgroundMusic.id, backgroundMusic);
    
    const motivation: Tag = { id: this.currentTagId++, name: "Motivation" };
    this.tags.set(motivation.id, motivation);
    
    const anxiety: Tag = { id: this.currentTagId++, name: "Anxiety" };
    this.tags.set(anxiety.id, anxiety);
    
    const natureSounds: Tag = { id: this.currentTagId++, name: "Nature Sounds" };
    this.tags.set(natureSounds.id, natureSounds);
    
    const longSession: Tag = { id: this.currentTagId++, name: "Long Session" };
    this.tags.set(longSession.id, longSession);
    
    // Create audio tracks directly
    const track1: AudioTrack = {
      id: this.currentAudioTrackId++,
      title: "Deep Relaxation Journey",
      description: "Peaceful guided meditation with ocean sounds",
      categoryId: relaxation.id,
      imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
      audioUrl: "/audio/relaxation_journey.mp3",
      duration: 1215 // 20:15
    };
    this.audioTracks.set(track1.id, track1);
    
    const track2: AudioTrack = {
      id: this.currentAudioTrackId++,
      title: "Peaceful Sleep Induction",
      description: "Fall asleep faster with gentle voice guidance",
      categoryId: sleep.id,
      imageUrl: "https://images.unsplash.com/photo-1518112166137-85f9979a43aa?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
      audioUrl: "/audio/sleep_induction.mp3",
      duration: 1965 // 32:45
    };
    this.audioTracks.set(track2.id, track2);
    
    const track3: AudioTrack = {
      id: this.currentAudioTrackId++,
      title: "Self-Confidence Boost",
      description: "Build lasting confidence and self-esteem",
      categoryId: confidence.id,
      imageUrl: "https://images.unsplash.com/photo-1534859108275-a3a6f23619fb?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
      audioUrl: "/audio/confidence_boost.mp3",
      duration: 930 // 15:30
    };
    this.audioTracks.set(track3.id, track3);
    
    const track4: AudioTrack = {
      id: this.currentAudioTrackId++,
      title: "Anxiety Reduction",
      description: "Release stress and find inner calm",
      categoryId: stress.id,
      imageUrl: "https://images.unsplash.com/photo-1476611338391-6f395a0ebc7b?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
      audioUrl: "/audio/anxiety_reduction.mp3",
      duration: 1100 // 18:20
    };
    this.audioTracks.set(track4.id, track4);
    
    const track5: AudioTrack = {
      id: this.currentAudioTrackId++,
      title: "Rainy Day Relaxation",
      description: "Gentle rain sounds with calming guidance",
      categoryId: relaxation.id,
      imageUrl: "https://images.unsplash.com/photo-1529693662653-9d480530a697?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
      audioUrl: "/audio/rainy_day.mp3",
      duration: 1510 // 25:10
    };
    this.audioTracks.set(track5.id, track5);
    
    const track6: AudioTrack = {
      id: this.currentAudioTrackId++,
      title: "Deep Sleep Journey",
      description: "Extended sleep hypnosis for insomnia",
      categoryId: sleep.id,
      imageUrl: "https://images.unsplash.com/photo-1502139214982-d0ad755818d8?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
      audioUrl: "/audio/deep_sleep.mp3",
      duration: 2700 // 45:00
    };
    this.audioTracks.set(track6.id, track6);
    
    // Add tags to audio tracks directly
    const addTag = (audioTrackId: number, tagId: number) => {
      const id = this.currentAudioTrackTagId++;
      const audioTrackTag: AudioTrackTag = { id, audioTrackId, tagId };
      this.audioTrackTags.set(id, audioTrackTag);
    };
    
    addTag(track1.id, guided.id);
    addTag(track1.id, relaxation.id);
    
    addTag(track2.id, sleep.id);
    addTag(track2.id, deepTrance.id);
    
    addTag(track3.id, confidence.id);
    addTag(track3.id, motivation.id);
    
    addTag(track4.id, stress.id);
    addTag(track4.id, anxiety.id);
    
    addTag(track5.id, relaxation.id);
    addTag(track5.id, natureSounds.id);
    
    addTag(track6.id, sleep.id);
    addTag(track6.id, longSession.id);
    
    // Update category counts directly
    relaxation.count = 2;
    confidence.count = 1;
    sleep.count = 2;
    stress.count = 1;
    
    this.categories.set(relaxation.id, relaxation);
    this.categories.set(confidence.id, confidence);
    this.categories.set(sleep.id, sleep);
    this.categories.set(stress.id, stress);
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
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
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
    const track: AudioTrack = { ...insertTrack, id };
    this.audioTracks.set(id, track);
    return track;
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
      id
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
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
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
    // Calculate count for each tag
    const counts = await db
      .select({
        tagId: audioTrackTags.tagId,
        count: db.fn.count(audioTrackTags.id)
      })
      .from(audioTrackTags)
      .groupBy(audioTrackTags.tagId);
    
    const countMap = new Map<number, number>();
    counts.forEach(c => countMap.set(c.tagId, Number(c.count)));
    
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
    const [track] = await db.insert(audioTracks).values(insertTrack).returning();
    return track;
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
    const [access] = await db.insert(userTrackAccess).values(insertAccess).returning();
    return access;
  }
  
  async revokeUserAccess(userId: number, audioTrackId: number): Promise<void> {
    await db
      .delete(userTrackAccess)
      .where(
        and(
          eq(userTrackAccess.userId, userId),
          eq(userTrackAccess.audioTrackId, audioTrackId)
        )
      );
  }
  
  async getUsersWithAccessToTrack(audioTrackId: number): Promise<User[]> {
    const accessRecords = await db
      .select()
      .from(userTrackAccess)
      .where(eq(userTrackAccess.audioTrackId, audioTrackId));
    
    const userIds = accessRecords.map(r => r.userId);
    
    if (userIds.length === 0) {
      return [];
    }
    
    return db.select().from(users).where(inArray(users.id, userIds));
  }
  
  async checkUserAccessToTrack(userId: number, audioTrackId: number): Promise<boolean> {
    // Check if user has explicit access to the track
    const [access] = await db
      .select()
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
      .select()
      .from(audioTracks)
      .where(
        and(
          eq(audioTracks.id, audioTrackId),
          eq(audioTracks.isPublic, true)
        )
      );
      
    return !!track;
  }
  
  async getTracksByUser(userId: number): Promise<AudioTrack[]> {
    // Get all tracks user has access to
    const accessRecords = await db
      .select()
      .from(userTrackAccess)
      .where(eq(userTrackAccess.userId, userId));
    
    const privateTrackIds = accessRecords.map(r => r.audioTrackId);
    
    // Get all public tracks + private tracks user has access to
    return db
      .select()
      .from(audioTracks)
      .where(
        or(
          eq(audioTracks.isPublic, true),
          inArray(audioTracks.id, privateTrackIds)
        )
      );
  }
}

export const storage = new MemStorage();
