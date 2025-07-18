import { Request, Response, NextFunction } from 'express';

/**
 * Simple user-based middleware - much cleaner than workspace complexity
 * Extracts user ID from session and ensures all operations are user-scoped
 */
export async function extractUserContext(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip middleware for auth routes
    if (req.path.startsWith('/api/auth/')) {
      return next();
    }

    // Get user ID from auth middleware (already set on req.userId)
    const userId = req.userId || (req.session as any)?.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Store userId on request for easy access in routes
    req.userId = userId;
    
    console.log(`USER MIDDLEWARE: ${req.method} ${req.path} - User: ${userId}`);
    
    next();
  } catch (error) {
    console.error('User middleware error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Helper function to get current user ID from request
export function getCurrentUserId(req: Request): number {
  if (!req.userId) {
    throw new Error("User ID not found in request");
  }
  return req.userId;
}