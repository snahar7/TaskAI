import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { randomBytes } from "crypto";
import { pool, dbReady, databaseDriver } from "./db";
import { isDemoMode, demoModeReasons, registerDemoRoutes } from "./demo";
import { registerRoutes } from "./routes";
import { registerAuthRoutes } from "./auth";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { extractUserContext } from "./user-middleware";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret && isDemoMode()) {
  // Demo only: a throwaway secret (sessions reset when the server restarts).
  sessionSecret = randomBytes(32).toString("hex");
  console.warn("⚠️  SESSION_SECRET not set; using a random one because demo mode is on.");
}
if (!sessionSecret) {
  throw new Error(
    "SESSION_SECRET is not set. Add it to your .env (see .env.example). " +
    "Generate one with: openssl rand -hex 32"
  );
}

// Sessions live in Postgres (table "session", created automatically) so they
// survive restarts and work across instances. With embedded PGlite there's no
// pg pool, so fall back to an in-process store.
const PgSessionStore = connectPgSimple(session);
const MemoryStore = createMemoryStore(session);
const sessionStore = pool
  ? new PgSessionStore({ pool, tableName: "session", createTableIfMissing: true })
  : new MemoryStore({ checkPeriod: 24 * 60 * 60 * 1000 });

app.use(session({
  store: sessionStore,
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Allow in development
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for persistent sessions
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
  await dbReady;
  if (isDemoMode()) {
    console.log(`🧪 DEMO MODE ON: ${demoModeReasons().join("; ")}`);
  }
  console.log(`🗄️  Database driver: ${databaseDriver}`);
  registerDemoRoutes(app);

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

  // Serves both the API and the client.
  const port = Number(process.env.PORT) || 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
