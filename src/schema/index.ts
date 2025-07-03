// Drizzle ORM Schema - Main export file
// This file exports all database schemas and provides a centralized schema interface

export * from './goals';
export * from './projects';
export * from './tasks';
export * from './subtasks';
export * from './users';
export * from './shared';
export * from './ai';

// Re-export for convenience
export { createInsertSchema, createSelectSchema } from 'drizzle-zod';
export { z } from 'zod';