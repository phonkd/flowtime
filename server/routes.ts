import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertUserProgressSchema, insertAudioTrackSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import session from "express-session";
import MemoryStore from "memorystore";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Helper function to ensure upload directories exist
function createUploadDirectories() {
  const publicDir = path.join(process.cwd(), "public");
  const uploadsDir = path.join(publicDir, "uploads");
  const audioDir = path.join(uploadsDir, "audio");
  const imagesDir = path.join(uploadsDir, "images");
  
  // Create directories if they don't exist
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    console.log("Created public directory");
  }
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log("Created uploads directory");
  }
  
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
    console.log("Created audio uploads directory");
  }
  
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
    console.log("Created image uploads directory");
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Create necessary upload directories
  createUploadDirectories();
  
  // Auth middleware for protected routes
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    return res.status(401).json({ message: "Not authenticated" });
  };
  
  // Admin middleware for admin-only routes
  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated() && req.user && (req.user as any).role === 'admin') {
      return next();
    }
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  };
  
  // Configure multer for audio file uploads
  const audioStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'audio');
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate a unique filename with timestamp
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    }
  });
  
  // Filter to accept only audio files
  const audioFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimeTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  };
  
  // Image storage configuration
  const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = 'public/uploads/images';
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate a unique filename with timestamp
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    }
  });
  
  // Filter to accept only image files
  const imageFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image files are allowed.'));
    }
  };
  
  const uploadAudio = multer({ 
    storage: audioStorage,
    fileFilter: audioFileFilter,
    limits: {
      fileSize: 150 * 1024 * 1024, // 150MB max file size
    }
  });
  
  const uploadImage = multer({
    storage: imageStorage,
    fileFilter: imageFileFilter,
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB max file size
    }
  });

  // Session setup
  const SessionStore = MemoryStore(session);
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "hypnosis-library-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === "production", maxAge: 86400000 }, // 1 day
      store: new SessionStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
    })
  );

  // Passport setup
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy
  
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }

        // In a real app, we would use bcrypt.compare, but for simplicity
        // we're doing a direct comparison since our storage doesn't hash passwords
        if (user.password !== password) {
          return done(null, false, { message: "Incorrect password." });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Authentication routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      // Create new user
      const user = await storage.createUser(data);
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.post("/api/auth/login", (req: Request, res: Response, next) => {
    console.log("Login attempt:", req.body.username);
    
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.log("Login error:", err);
        return next(err);
      }
      if (!user) {
        console.log("Login failed:", info.message);
        return res.status(401).json({ message: info.message });
      }
      
      console.log("User authenticated, logging in:", user.username);
      req.logIn(user, (err) => {
        if (err) {
          console.log("Login session error:", err);
          return next(err);
        }
        
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        console.log("Login successful for:", user.username);
        
        return res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.logout(err => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user as any;
    
    res.status(200).json(userWithoutPassword);
  });

  // Category routes
  app.get("/api/categories", async (_req: Request, res: Response) => {
    try {
      const categories = await storage.getAllCategories();
      res.status(200).json(categories);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/categories/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      
      const category = await storage.getCategoryById(id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.status(200).json(category);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Tag routes
  app.get("/api/tags", async (_req: Request, res: Response) => {
    try {
      const tags = await storage.getAllTags();
      res.status(200).json(tags);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Audio track routes
  app.get("/api/tracks", async (req: Request, res: Response) => {
    try {
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      const isAdmin = req.isAuthenticated() && (req.user as any).role === 'admin';
      
      let tracks = await storage.getAllAudioTracksWithDetails(userId);
      
      // If not admin, filter to only show public tracks or tracks user has access to
      if (!isAdmin) {
        tracks = tracks.filter(track => {
          // Include track if it's public
          if (track.isPublic) return true;
          
          // Include track if user has explicit access (only possible for authenticated users)
          if (userId) {
            return storage.checkUserAccessToTrack(userId, track.id);
          }
          
          // Otherwise exclude
          return false;
        });
      }
      
      res.status(200).json(tracks);
    } catch (error) {
      console.error("Error fetching tracks:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/tracks/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid track ID" });
      }
      
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      const isAdmin = req.isAuthenticated() && (req.user as any).role === 'admin';
      const track = await storage.getAudioTrackWithDetails(id, userId);
      
      if (!track) {
        return res.status(404).json({ message: "Track not found" });
      }
      
      // If not admin, check if track is public or user has access
      if (!isAdmin) {
        if (!track.isPublic && (!userId || !storage.checkUserAccessToTrack(userId, track.id))) {
          return res.status(403).json({ message: "Access denied to this track" });
        }
      }
      
      res.status(200).json(track);
    } catch (error) {
      console.error("Error fetching track:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/categories/:id/tracks", async (req: Request, res: Response) => {
    try {
      const categoryId = parseInt(req.params.id);
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      const isAdmin = req.isAuthenticated() && (req.user as any).role === 'admin';
      let tracks = await storage.getAudioTracksByCategoryWithDetails(categoryId, userId);
      
      // If not admin, filter to only show public tracks or tracks user has access to
      if (!isAdmin) {
        tracks = tracks.filter(track => {
          // Include track if it's public
          if (track.isPublic) return true;
          
          // Include track if user has explicit access (only possible for authenticated users)
          if (userId) {
            return storage.checkUserAccessToTrack(userId, track.id);
          }
          
          // Otherwise exclude
          return false;
        });
      }
      
      res.status(200).json(tracks);
    } catch (error) {
      console.error("Error fetching category tracks:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/search", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const tracks = await storage.searchAudioTracks(query);
      
      // Add details to each track
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      const isAdmin = req.isAuthenticated() && (req.user as any).role === 'admin';
      
      const tracksWithDetails = await Promise.all(
        tracks.map(track => storage.getAudioTrackWithDetails(track.id, userId))
      );
      
      // Filter out undefined results
      let filteredTracks = tracksWithDetails.filter(track => track !== undefined);
      
      // If not admin, filter to only show public tracks or tracks user has access to
      if (!isAdmin) {
        filteredTracks = filteredTracks.filter(track => {
          // Include track if it's public
          if (track.isPublic) return true;
          
          // Include track if user has explicit access (only possible for authenticated users)
          if (userId) {
            return storage.checkUserAccessToTrack(userId, track.id);
          }
          
          // Otherwise exclude
          return false;
        });
      }
      
      res.status(200).json(filteredTracks);
    } catch (error) {
      console.error("Error searching tracks:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User progress routes
  app.post("/api/progress", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const userId = (req.user as any).id;
      
      // Add userId and current timestamp to the request body
      const data = insertUserProgressSchema.parse({
        ...req.body,
        userId,
        updatedAt: new Date()
      });
      
      const progress = await storage.saveUserProgress(data);
      res.status(201).json(progress);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.get("/api/progress", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const userId = (req.user as any).id;
      const progress = await storage.getAllUserProgress(userId);
      res.status(200).json(progress);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Audio file upload route
  // Image upload endpoint
  app.post("/api/uploads/image", requireAuth, uploadImage.single('imageFile'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file uploaded" });
      }
      
      // Create file URL (relative to server)
      const imageUrl = `/uploads/images/${req.file.filename}`;
      
      res.status(200).json({ 
        url: imageUrl,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Category image upload endpoint
  app.post("/api/admin/categories/:id/image", requireAdmin, uploadImage.single('imageFile'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No image file uploaded" });
      }
      
      // Get the category
      const category = await storage.getCategoryById(id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      // Create the URL path to the uploaded file
      const imageUrl = `/uploads/images/${req.file.filename}`;
      
      // Update the category with the new image URL
      const updatedCategory = await storage.updateCategory(id, { imageUrl });
      
      res.status(200).json(updatedCategory);
    } catch (error) {
      console.error("Error uploading category image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  app.post("/api/uploads/audio", uploadAudio.single('audioFile'), async (req: Request, res: Response) => {
    // Authentication is optional for demo purposes
    // In a production app, you would require authentication
    
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file uploaded" });
      }
      
      // Get form data
      const { title, description, categoryId, duration } = req.body;
      
      console.log("Upload form data received:", { title, description, categoryId, duration, file: req.file?.filename });
      
      // Check each required field individually for better error messages
      if (!title) {
        return res.status(400).json({ message: "Missing required field: title" });
      }
      
      if (!description) {
        return res.status(400).json({ message: "Missing required field: description" });
      }
      
      if (!categoryId) {
        return res.status(400).json({ message: "Missing required field: categoryId" });
      }
      
      // Convert to expected types
      const categoryIdNum = parseInt(categoryId);
      const durationNum = duration ? parseInt(duration) : 0;
      
      // Generate relative path for audio URL
      const audioUrl = `/uploads/audio/${path.basename(req.file.path)}`;
      
      // Get category to potentially use its image and update count
      const categoryObj = await storage.getCategoryById(categoryIdNum);
      
      // Use the category's image if available, otherwise use the provided image or null
      const imageUrl = req.body.imageUrl || 
                        (categoryObj?.imageUrl) ||
                        null;
      
      // Create audio track in database
      const trackData = {
        title,
        description,
        categoryId: categoryIdNum,
        audioUrl,
        imageUrl,
        duration: durationNum,
        isPublic: false // Make tracks private by default
      };
      
      const audioTrack = await storage.createAudioTrack(trackData);
      
      // If tags are provided, add them to the audio track
      if (req.body.tags) {
        const tags = Array.isArray(req.body.tags) ? req.body.tags : [req.body.tags];
        for (const tagId of tags) {
          const tagIdNum = parseInt(tagId);
          if (!isNaN(tagIdNum)) {
            await storage.addTagToAudioTrack(audioTrack.id, tagIdNum);
          }
        }
      }
      
      // Update category count
      if (categoryObj) {
        await storage.updateCategoryCount(categoryIdNum, categoryObj.count + 1);
      }
      
      // Return the created audio track with details
      const trackWithDetails = await storage.getAudioTrackWithDetails(audioTrack.id);
      res.status(201).json(trackWithDetails);
    } catch (error) {
      console.error("Error uploading audio:", error);
      res.status(500).json({ 
        message: "Error uploading audio file",
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Serve static files from public directory
  app.use('/uploads', (req, res, next) => {
    // Set no-cache headers for uploaded files
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
  }, express.static(path.join(process.cwd(), 'public', 'uploads')));
  
  // Admin-only API endpoints
  
  // Admin User Management API
  app.get("/api/admin/users", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from the response
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.status(200).json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Admin password reset endpoint
  app.post("/api/admin/users/:id/reset-password", requireAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const { newPassword } = req.body;
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updatedUser = await storage.resetUserPassword(userId, newPassword);
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to reset password" });
      }
      
      // Return success without the password
      const { password, ...userWithoutPassword } = updatedUser;
      res.status(200).json({ 
        ...userWithoutPassword,
        message: "Password reset successful" 
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.put("/api/admin/users/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user (e.g. role, status)
      const updatedUser = await storage.updateUser(id, req.body);
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Admin Category Management API
  app.post("/api/admin/categories", requireAdmin, async (req: Request, res: Response) => {
    try {
      // If imageUrl is not provided, it will default to null
      const category = await storage.createCategory(req.body);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });
  
  app.put("/api/admin/categories/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      
      const category = await storage.getCategoryById(id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      const updatedCategory = await storage.updateCategory(id, req.body);
      res.status(200).json(updatedCategory);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.delete("/api/admin/categories/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      
      const category = await storage.getCategoryById(id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      // Check if category has tracks
      const tracks = await storage.getAudioTracksByCategory(id);
      if (tracks.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete category with associated tracks",
          count: tracks.length
        });
      }
      
      await storage.deleteCategory(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Admin Tag Management API
  app.post("/api/admin/tags", requireAdmin, async (req: Request, res: Response) => {
    try {
      const tag = await storage.createTag(req.body);
      res.status(201).json(tag);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });
  
  app.put("/api/admin/tags/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid tag ID" });
      }
      
      const tag = await storage.getTagById(id);
      if (!tag) {
        return res.status(404).json({ message: "Tag not found" });
      }
      
      const updatedTag = await storage.updateTag(id, req.body);
      res.status(200).json(updatedTag);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.delete("/api/admin/tags/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid tag ID" });
      }
      
      const tag = await storage.getTagById(id);
      if (!tag) {
        return res.status(404).json({ message: "Tag not found" });
      }
      
      await storage.deleteTag(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Admin Track Management API
  app.put("/api/admin/tracks/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid track ID" });
      }
      
      const track = await storage.getAudioTrackById(id);
      if (!track) {
        return res.status(404).json({ message: "Track not found" });
      }
      
      // Capture categoryId if it's changing
      const newCategoryId = req.body.categoryId || track.categoryId;
      
      // Check if we need to update imageUrl from category if not explicitly provided
      if (!req.body.imageUrl && (req.body.categoryId || !track.imageUrl)) {
        const category = await storage.getCategoryById(newCategoryId);
        if (category && category.imageUrl) {
          req.body.imageUrl = category.imageUrl;
        }
      }
      
      const updatedTrack = await storage.updateAudioTrack(id, req.body);
      const trackWithDetails = await storage.getAudioTrackWithDetails(id);
      
      res.status(200).json(trackWithDetails);
    } catch (error) {
      console.error("Error updating track:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Toggle track visibility
  app.patch("/api/admin/tracks/:id/visibility", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid track ID" });
      }
      
      const track = await storage.getAudioTrackById(id);
      if (!track) {
        return res.status(404).json({ message: "Track not found" });
      }
      
      const isPublic = req.body.isPublic;
      if (typeof isPublic !== 'boolean') {
        return res.status(400).json({ message: "isPublic must be a boolean value" });
      }
      
      const updatedTrack = await storage.updateAudioTrack(id, { isPublic });
      
      res.status(200).json(updatedTrack);
    } catch (error) {
      console.error("Error updating track visibility:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/tracks/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid track ID" });
      }
      
      const track = await storage.getAudioTrackById(id);
      if (!track) {
        return res.status(404).json({ message: "Track not found" });
      }
      
      // Delete the track
      await storage.deleteAudioTrack(id);
      
      // Update category count
      if (track.categoryId) {
        const category = await storage.getCategoryById(track.categoryId);
        if (category && category.count > 0) {
          await storage.updateCategoryCount(track.categoryId, category.count - 1);
        }
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Shareable Links API
  app.post("/api/shareable-links", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const linkData = { 
        ...req.body,
        createdById: userId,
        linkId: crypto.randomUUID().toString(),
        isActive: true,
        createdAt: new Date()
      };
      
      const link = await storage.createShareableLink(linkData);
      res.status(201).json(link);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });
  
  app.get("/api/shareable-links", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const isAdmin = (req.user as any).role === 'admin';
      
      // Admins can see all links, regular users only see their own
      const links = isAdmin 
        ? await storage.getAllShareableLinks()
        : await storage.getUserShareableLinks(userId);
      
      res.status(200).json(links);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.put("/api/shareable-links/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid link ID" });
      }
      
      const link = await storage.getShareableLinkById(id);
      if (!link) {
        return res.status(404).json({ message: "Link not found" });
      }
      
      const userId = (req.user as any).id;
      const isAdmin = (req.user as any).role === 'admin';
      
      // Only admins or the link creator can update links
      if (!isAdmin && link.createdById !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedLink = await storage.updateShareableLink(id, req.body.isActive);
      res.status(200).json(updatedLink);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.delete("/api/shareable-links/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid link ID" });
      }
      
      const link = await storage.getShareableLinkById(id);
      if (!link) {
        return res.status(404).json({ message: "Link not found" });
      }
      
      const userId = (req.user as any).id;
      const isAdmin = (req.user as any).role === 'admin';
      
      // Only admins or the link creator can delete links
      if (!isAdmin && link.createdById !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteShareableLink(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // User track access API
  app.post("/api/track-access", requireAdmin, async (req: Request, res: Response) => {
    try {
      const grantedById = (req.user as any).id;
      const accessData = { 
        ...req.body,
        grantedById,
        grantedAt: new Date()
      };
      
      const access = await storage.grantUserAccess(accessData);
      res.status(201).json(access);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });
  
  app.delete("/api/track-access/:userId/:audioTrackId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const audioTrackId = parseInt(req.params.audioTrackId);
      
      if (isNaN(userId) || isNaN(audioTrackId)) {
        return res.status(400).json({ message: "Invalid user ID or track ID" });
      }
      
      await storage.revokeUserAccess(userId, audioTrackId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/track-access/:audioTrackId/users", requireAdmin, async (req: Request, res: Response) => {
    try {
      const audioTrackId = parseInt(req.params.audioTrackId);
      
      if (isNaN(audioTrackId)) {
        return res.status(400).json({ message: "Invalid track ID" });
      }
      
      const users = await storage.getUsersWithAccessToTrack(audioTrackId);
      
      // Remove passwords from the response
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.status(200).json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
