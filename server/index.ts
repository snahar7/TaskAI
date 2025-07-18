import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { registerAuthRoutes } from "./auth";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { extractUserContext } from "./user-middleware";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'taflo-stealth-mode-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  }
}));

// Extend Request interface to include session
declare module 'express-session' {
  interface SessionData {
    authenticated: boolean;
  }
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Auth middleware to extract user from session/cookies
app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract user from session for API routes (except auth routes)
    if (req.path.startsWith('/api/') && !req.path.includes('/auth/')) {
      // Get user ID from session (set by auth routes)
      const userId = (req.session as any)?.user?.id;
      
      if (userId) {
        req.headers['x-user-id'] = userId.toString();
        (req as any).userId = userId;
        console.log(`🔐 SESSION AUTH: User ${userId} authenticated for ${req.method} ${req.path}`);
      } else {
        // No hardcoded fallback - let user middleware handle authentication requirement
        console.log(`🔐 SESSION AUTH: No user session for ${req.method} ${req.path}`);
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

(async () => {
  // Register authentication routes FIRST (before workspace middleware)
  registerAuthRoutes(app);
  
  // Apply user context middleware for API routes AFTER auth routes are registered
  app.use('/api', extractUserContext);
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Server error:", err);
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
