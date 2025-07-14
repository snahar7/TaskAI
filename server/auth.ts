import { Request, Response, NextFunction } from "express";
import { Express } from "express";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { emailSignupSchema, emailLoginSchema, googleAuthSchema } from "@shared/schema";
import { z } from "zod";

export function registerAuthRoutes(app: Express) {
  
  // Sync Firebase user with backend
  app.post("/api/auth/sync", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const syncSchema = z.object({
        firebaseId: z.string().optional().nullable(),
        email: z.string().email(),
        displayName: z.string().optional().nullable(),
        profilePicture: z.string().optional().nullable(),
        provider: z.string().default('email'),
        inviteCode: z.string().optional().nullable(),
      });

      const { firebaseId, email, displayName, profilePicture, provider, inviteCode } = syncSchema.parse(req.body);

      // Check if user exists by email or googleId
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Generate unique invite code for new user
        const uniqueInviteCode = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
        
        // Create new user (Google or email)
        const names = (displayName || '').split(' ').filter(Boolean);
        user = await storage.createUser({
          email,
          displayName: displayName || null,
          firstName: names[0] || email.split('@')[0],
          lastName: names.slice(1).join(' ') || '',
          profilePicture: profilePicture || null,
          googleId: provider === 'google' ? firebaseId : null,
          provider,
          emailVerified: provider === 'google' ? true : false,
          inviteCode: uniqueInviteCode,
          teamId: null, // Will be set after user creation
        });
        
        // Set initial team to user's own ID (each user starts their own team)
        await storage.updateUser(user.id, { teamId: user.id });
        
        // If invite code provided, join the inviter's team
        if (inviteCode) {
          await storage.joinTeamByInviteCode(user.id, inviteCode);
        }
        
        // Refresh user data to get updated teamId
        user = await storage.getUserById(user.id);
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

  // Native email/password signup (no Firebase)
  app.post("/api/auth/email-signup", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signupData = emailSignupSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(signupData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(signupData.password, 10);
      
      // Handle invite code and team assignment
      let teamId = null;
      if (signupData.inviteCode) {
        // For now, extract team ID from invite code format: invite_teamId_timestamp_random
        const parts = signupData.inviteCode.split('_');
        if (parts.length >= 2 && !isNaN(parseInt(parts[1]))) {
          teamId = parseInt(parts[1]);
        }
      }
      
      // Generate unique invite code for new user
      const uniqueInviteCode = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      
      // Create user
      const newUser = await storage.createUser({
        email: signupData.email,
        password: hashedPassword,
        firstName: signupData.firstName,
        lastName: signupData.lastName,
        displayName: `${signupData.firstName} ${signupData.lastName}`,
        provider: 'email',
        emailVerified: true,
        teamId: teamId || null,
        inviteCode: uniqueInviteCode
      });
      
      // If no team from invite, set user's own ID as team
      if (!teamId) {
        await storage.updateUser(newUser.id, { teamId: newUser.id });
      }
      
      // Set session
      req.session.authenticated = true;
      req.session.userId = newUser.id;
      
      res.status(201).json({ 
        message: "User created successfully", 
        user: { ...newUser, password: undefined }
      });
    } catch (error) {
      next(error);
    }
  });

  // Native email/password login (no Firebase)
  app.post("/api/auth/email-login", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const loginData = emailLoginSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(loginData.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Check if user has a password (could be Google-only user)
      if (!user.password) {
        return res.status(401).json({ message: "This account uses Google sign-in. Please use Google to log in." });
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(loginData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Set session
      req.session.authenticated = true;
      req.session.userId = user.id;
      
      res.json({ 
        message: "Login successful", 
        user: { ...user, password: undefined }
      });
    } catch (error) {
      next(error);
    }
  });

  // Email signup (for Firebase compatibility)
  app.post("/api/auth/signup", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signupSchema = z.object({
        firebaseId: z.string().optional().nullable(),
        email: z.string().email(),
        firstName: z.string(),
        lastName: z.string(),
        provider: z.string().default('email'),
        inviteCode: z.string().optional().nullable(),
      });

      const { firebaseId, email, firstName, lastName, provider, inviteCode } = signupSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: "User already exists" });
      }

      // Generate unique invite code for new user
      const uniqueInviteCode = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      
      // Create new user
      const user = await storage.createUser({
        email,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        provider,
        emailVerified: true,
        inviteCode: uniqueInviteCode,
        teamId: null, // Will be set after user creation
      });
      
      // Set initial team to user's own ID (each user starts their own team)
      await storage.updateUser(user.id, { teamId: user.id });
      
      // If invite code provided, join the inviter's team
      if (inviteCode) {
        await storage.joinTeamByInviteCode(user.id, inviteCode);
      }

      res.json({ user });
    } catch (error) {
      next(error);
    }
  });

  // Get current user from session
  app.get("/api/auth/user", async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.session.authenticated || !req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUserById(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ ...user, password: undefined });
    } catch (error) {
      next(error);
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ error: "Failed to logout" });
        }
        res.json({ message: "Logged out successfully" });
      });
    } catch (error) {
      next(error);
    }
  });

  // Get current user profile (legacy endpoint)
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