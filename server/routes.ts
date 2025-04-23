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

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
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
  
  const uploadAudio = multer({ 
    storage: audioStorage,
    fileFilter: audioFileFilter,
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
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message });
      }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        
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
      const tracks = await storage.getAllAudioTracksWithDetails(userId);
      res.status(200).json(tracks);
    } catch (error) {
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
      const track = await storage.getAudioTrackWithDetails(id, userId);
      
      if (!track) {
        return res.status(404).json({ message: "Track not found" });
      }
      
      res.status(200).json(track);
    } catch (error) {
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
      const tracks = await storage.getAudioTracksByCategoryWithDetails(categoryId, userId);
      
      res.status(200).json(tracks);
    } catch (error) {
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
      const tracksWithDetails = await Promise.all(
        tracks.map(track => storage.getAudioTrackWithDetails(track.id, userId))
      );
      
      // Filter out undefined results
      const filteredTracks = tracksWithDetails.filter(track => track !== undefined);
      
      res.status(200).json(filteredTracks);
    } catch (error) {
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
  app.post("/api/uploads/audio", uploadAudio.single('audioFile'), async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file uploaded" });
      }
      
      // Get form data
      const { title, description, categoryId, duration } = req.body;
      
      if (!title || !description || !categoryId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Convert to expected types
      const categoryIdNum = parseInt(categoryId);
      const durationNum = duration ? parseInt(duration) : 0;
      
      // Generate relative path for audio URL
      const audioUrl = `/uploads/audio/${path.basename(req.file.path)}`;
      
      // Create placeholder image URL if not provided
      const imageUrl = req.body.imageUrl || "https://images.unsplash.com/photo-1506126613408-eca07ce68773?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80";
      
      // Create audio track in database
      const trackData = {
        title,
        description,
        categoryId: categoryIdNum,
        audioUrl,
        imageUrl,
        duration: durationNum
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
      const category = await storage.getCategoryById(categoryIdNum);
      if (category) {
        await storage.updateCategoryCount(categoryIdNum, category.count + 1);
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

  return httpServer;
}
