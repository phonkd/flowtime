import { 
  users, type User, type InsertUser,
  categories, type Category, type InsertCategory,
  tags, type Tag, type InsertTag,
  audioTracks, type AudioTrack, type InsertAudioTrack,
  audioTrackTags, type AudioTrackTag, type InsertAudioTrackTag,
  userProgress, type UserProgress, type InsertUserProgress,
  type AudioTrackWithDetails, type CategoryWithCount, type TagWithCount
} from "@shared/schema";

export interface IStorage {
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
}

export class MemStorage implements IStorage {
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

export const storage = new MemStorage();
