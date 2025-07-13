import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerAuthRoutes } from "./auth";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage-enhanced";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
    // For now, we'll use a default user for demonstration
    // In a real app, you'd verify Firebase ID token and get user from database
    if (req.path.startsWith('/api/') && !req.path.includes('/auth/')) {
      // For demonstration, use the first user in database when authenticated routes are called
      // This simulates being logged in
      const users = await storage.getAllUsers();
      if (users.length > 0) {
        req.headers['x-user-id'] = users[0].id.toString();
      }
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
