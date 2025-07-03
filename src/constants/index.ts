// Application-wide constants and enums
// This file centralizes all constant values used throughout the application

export const APP_NAME = 'Taflo';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'AI-Powered Task Management Application';

// API Configuration
export const API_ENDPOINTS = {
  GOALS: '/api/goals',
  PROJECTS: '/api/projects', 
  TASKS: '/api/tasks',
  SUBTASKS: '/api/subtasks',
  USERS: '/api/users',
  AUTH: '/api/auth',
  AI_BREAKDOWN: '/api/goals/breakdown',
  AI_INSIGHTS: '/api/ai/insights',
  ANALYTICS: '/api/analytics',
} as const;

// Status Constants
export const TASK_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress', 
  COMPLETED: 'completed',
  ON_HOLD: 'on_hold',
  CANCELLED: 'cancelled',
} as const;

export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

// UI Constants
export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

export const VIEW_MODES = {
  LIST: 'list',
  KANBAN: 'kanban',
  CALENDAR: 'calendar',
  TIMELINE: 'timeline',
} as const;

// Time and Date Constants
export const TIME_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  INPUT: 'yyyy-MM-dd',
  TIMESTAMP: 'yyyy-MM-dd HH:mm:ss',
  TIME_ONLY: 'HH:mm',
} as const;

export const WORK_DAYS = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const;

// Validation Constants
export const VALIDATION_LIMITS = {
  TITLE_MIN_LENGTH: 1,
  TITLE_MAX_LENGTH: 200,
  DESCRIPTION_MAX_LENGTH: 2000,
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 50,
  TAGS_MAX_COUNT: 10,
  TEAM_MEMBERS_MAX: 100,
} as const;

// AI Configuration
export const AI_CONFIG = {
  MODELS: {
    GPT_4O: 'gpt-4o',
    GPT_4: 'gpt-4',
    GPT_3_5_TURBO: 'gpt-3.5-turbo',
  },
  MAX_TOKENS: 2000,
  DEFAULT_TEMPERATURE: 0.7,
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
} as const;

// File and Media Constants
export const FILE_LIMITS = {
  MAX_SIZE_MB: 10,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'],
  MAX_FILES_PER_TASK: 5,
} as const;

// Progress and Analytics
export const PROGRESS_THRESHOLDS = {
  LOW: 25,
  MEDIUM: 50,
  HIGH: 75,
  COMPLETE: 100,
} as const;

export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'taflo_user_preferences',
  THEME: 'taflo_theme',
  SIDEBAR_STATE: 'taflo_sidebar_state',
  EXPANDED_SECTIONS: 'taflo_expanded_sections',
  RECENT_SEARCHES: 'taflo_recent_searches',
  DRAFT_GOALS: 'taflo_draft_goals',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  AI_TIMEOUT: 'AI processing timed out. Please try again with a simpler request.',
  SAVE_FAILED: 'Failed to save changes. Please try again.',
  DELETE_FAILED: 'Failed to delete item. Please try again.',
  GENERIC_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  GOAL_CREATED: 'Goal created successfully!',
  PROJECT_CREATED: 'Project created successfully!',
  TASK_CREATED: 'Task created successfully!',
  SUBTASK_CREATED: 'Subtask created successfully!',
  ITEM_UPDATED: 'Item updated successfully!',
  ITEM_DELETED: 'Item deleted successfully!',
  PROGRESS_UPDATED: 'Progress updated successfully!',
  SETTINGS_SAVED: 'Settings saved successfully!',
} as const;

// Animation and Timing
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 200,
  SLOW: 300,
  EXTRA_SLOW: 500,
} as const;

// Debounce Delays
export const DEBOUNCE_DELAYS = {
  SEARCH: 300,
  AUTO_SAVE: 1000,
  RESIZE: 100,
  SCROLL: 50,
} as const;

// Query Stale Times (React Query)
export const STALE_TIMES = {
  GOALS: 1000 * 60 * 5, // 5 minutes
  PROJECTS: 1000 * 60 * 2, // 2 minutes
  TASKS: 1000 * 60 * 1, // 1 minute
  USER_DATA: 1000 * 60 * 10, // 10 minutes
  ANALYTICS: 1000 * 60 * 15, // 15 minutes
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

// Feature Flags (can be overridden by environment)
export const FEATURE_FLAGS = {
  AI_BREAKDOWN: true,
  REAL_TIME_COLLABORATION: false,
  ADVANCED_ANALYTICS: true,
  TEAM_MANAGEMENT: true,
  CALENDAR_INTEGRATION: false,
  MOBILE_APP: false,
} as const;

// Export type helpers for constants
export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];
export type PriorityLevel = (typeof PRIORITY_LEVELS)[keyof typeof PRIORITY_LEVELS];
export type ThemeMode = (typeof THEME_MODES)[keyof typeof THEME_MODES];
export type ViewMode = (typeof VIEW_MODES)[keyof typeof VIEW_MODES];
export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];