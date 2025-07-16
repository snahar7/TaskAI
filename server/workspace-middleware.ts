import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

// Extend Express Request interface to include workspace context
declare global {
  namespace Express {
    interface Request {
      workspaceId?: number;
      userId?: number;
    }
  }
}

/**
 * Middleware to validate workspace access for authenticated users
 * Extracts workspaceId from request and validates user has access
 */
export async function validateWorkspaceAccess(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip validation for auth routes
    if (req.path.startsWith('/api/auth/')) {
      return next();
    }

    // Get user ID from session
    const userId = (req.session as any)?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Store userId on request for convenience
    req.userId = userId;

    // Extract workspaceId from various sources
    let workspaceId: number | undefined;

    // 1. From query parameter
    if (req.query.workspaceId) {
      workspaceId = parseInt(req.query.workspaceId as string);
    }
    
    // 2. From body
    else if (req.body?.workspaceId) {
      workspaceId = parseInt(req.body.workspaceId);
    }
    
    // 3. From route params (for routes like /api/workspaces/:workspaceId/...)
    else if (req.params.workspaceId) {
      workspaceId = parseInt(req.params.workspaceId);
    }
    
    // 4. From entity being accessed (goals, projects, tasks, subtasks)
    else if (req.params.id) {
      const entityId = parseInt(req.params.id);
      
      // Determine entity type from URL
      if (req.path.includes('/goals/')) {
        const goal = await storage.getGoal(entityId);
        workspaceId = goal?.workspaceId;
      } else if (req.path.includes('/projects/')) {
        const project = await storage.getProject(entityId);
        workspaceId = project?.workspaceId;
      } else if (req.path.includes('/tasks/')) {
        const task = await storage.getTask(entityId);
        workspaceId = task?.workspaceId;
      } else if (req.path.includes('/subtasks/')) {
        const subtask = await storage.getSubtask(entityId);
        workspaceId = subtask?.workspaceId;
      }
    }

    // If no workspaceId found, allow read-only operations but not writes
    if (!workspaceId) {
      if (req.method === 'GET') {
        // For GET requests without workspace context, we'll filter in the route handlers
        return next();
      } else {
        // For write operations, workspace is required
        return res.status(400).json({ error: "Workspace context required for this operation" });
      }
    }

    // Validate user has access to this workspace
    const hasAccess = await storage.isUserInWorkspace(userId, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied to this workspace" });
    }

    // Store workspaceId on request for use in route handlers
    req.workspaceId = workspaceId;

    next();
  } catch (error) {
    console.error('Workspace middleware error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Middleware to get user's default workspace if none specified
 */
export async function setDefaultWorkspace(req: Request, res: Response, next: NextFunction) {
  try {
    // Only set default if no workspace already set
    if (!req.workspaceId && req.userId) {
      const userWorkspaces = await storage.getUserWorkspaces(req.userId);
      if (userWorkspaces.length > 0) {
        // Use first workspace as default (typically their personal workspace)
        req.workspaceId = userWorkspaces[0].id;
      }
    }
    next();
  } catch (error) {
    console.error('Default workspace middleware error:', error);
    next(); // Continue even if default workspace can't be set
  }
}