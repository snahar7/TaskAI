import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { registerAuthRoutes } from "./auth";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage-enhanced";

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

// Password protection middleware
const STEALTH_PASSWORD = process.env.STEALTH_PASSWORD || 'taflo2025';

const requirePassword = (req: Request, res: Response, next: NextFunction) => {
  // Skip password protection for login routes
  if (req.path === '/api/stealth/login' || req.path === '/api/stealth/check') {
    return next();
  }

  // Check if user is authenticated in session
  if (req.session?.authenticated) {
    return next();
  }

  // If not authenticated, return 401 for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ 
      error: 'Password required', 
      message: 'Please enter the stealth password to access this app' 
    });
  }

  // For frontend routes, let them through so React can handle the password modal
  next();
};

// Password login routes
app.post('/api/stealth/login', (req: Request, res: Response) => {
  const { password } = req.body;
  
  if (password === STEALTH_PASSWORD) {
    req.session.authenticated = true;
    return res.json({ success: true, message: 'Access granted' });
  }
  
  return res.status(401).json({ 
    error: 'Invalid password', 
    message: 'Incorrect password. Please try again.' 
  });
});

app.get('/api/stealth/check', (req: Request, res: Response) => {
  return res.json({ authenticated: req.session?.authenticated || false });
});

app.post('/api/stealth/logout', (req: Request, res: Response) => {
  req.session.authenticated = false;
  return res.json({ success: true, message: 'Logged out' });
});

// Apply password protection to all routes
app.use(requirePassword);

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
    // Extract user from Firebase auth token or session in production
    if (req.path.startsWith('/api/') && !req.path.includes('/auth/')) {
      // Try to get user from session or authenticated context
      // For now, use Shubham's user ID (4) since that's the authenticated user
      // This should be replaced with proper Firebase token verification
      req.headers['x-user-id'] = '4'; // Shubham Nahar's user ID
    }
    next();
  } catch (error) {
    next(error);
  }
});

(async () => {
  // Register authentication routes
  registerAuthRoutes(app);
  
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
