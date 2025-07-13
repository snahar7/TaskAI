import { Request, Response, NextFunction } from "express";
import { Express } from "express";
import bcrypt from "bcrypt";
import { storage } from "./storage-enhanced";
import { emailSignupSchema, emailLoginSchema, googleAuthSchema } from "@shared/schema";
import { z } from "zod";

export function registerAuthRoutes(app: Express) {
  
  // Sync Firebase user with backend
  app.post("/api/auth/sync", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const syncSchema = z.object({
        firebaseId: z.string(),
        email: z.string().email(),
        displayName: z.string().optional().nullable(),
        profilePicture: z.string().optional().nullable(),
        provider: z.string().default('email'),
      });

      const { firebaseId, email, displayName, profilePicture, provider } = syncSchema.parse(req.body);

      // Check if user exists by email or googleId
      let user = await storage.getUserByEmail(email);
      
      if (!user && provider === 'google') {
        // Create new Google user
        const names = (displayName || '').split(' ').filter(Boolean);
        user = await storage.createUser({
          email,
          displayName: displayName || null,
          firstName: names[0] || email.split('@')[0],
          lastName: names.slice(1).join(' ') || '',
          profilePicture: profilePicture || null,
          googleId: firebaseId,
          provider: 'google',
          emailVerified: true,
        });
      } else if (user) {
        // Update existing user's last login and any missing fields
        const updates: any = {};
        if (provider === 'google' && !user.googleId) updates.googleId = firebaseId;
        if (profilePicture && !user.profilePicture) updates.profilePicture = profilePicture;
        if (displayName && !user.displayName) updates.displayName = displayName;
        
        if (Object.keys(updates).length > 0) {
          await storage.updateUser(user.id, updates);
        }
        user = await storage.getUserById(user.id);
      }

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ user });
    } catch (error) {
      next(error);
    }
  });

  // Email signup
  app.post("/api/auth/signup", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signupSchema = z.object({
        firebaseId: z.string(),
        email: z.string().email(),
        firstName: z.string(),
        lastName: z.string(),
        provider: z.string().default('email'),
      });

      const { firebaseId, email, firstName, lastName, provider } = signupSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: "User already exists" });
      }

      // Create new user
      const user = await storage.createUser({
        email,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        provider,
        emailVerified: true,
      });

      res.json({ user });
    } catch (error) {
      next(error);
    }
  });

  // Get current user profile
  app.get("/api/auth/profile", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUserById(parseInt(userId));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ user });
    } catch (error) {
      next(error);
    }
  });
}