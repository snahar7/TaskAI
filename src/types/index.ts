// Global TypeScript types and interfaces for Taflo
// This file centralizes all type definitions used across the application

// Re-export schema types for convenience
export type {
  Goal,
  InsertGoal,
  UpdateGoal,
  Project,
  InsertProject,
  UpdateProject,
  Task,
  InsertTask,
  UpdateTask,
  Subtask,
  InsertSubtask,
  UpdateSubtask,
  User,
  InsertUser,
  Team,
  InsertTeam,
  Category,
  InsertCategory,
  PendingBreakdown,
  InsertPendingBreakdown,
  AIBreakdown,
  TaskAnalytics,
  DailyStandup,
} from '@shared/schema';

// API Response types
export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
  success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// UI Component types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface TableColumn<T> {
  key: keyof T;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface FormFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

// Feature-specific types
export interface HierarchyWithChildren {
  goal: Goal & {
    projects: (Project & {
      tasks: (Task & {
        subtasks: Subtask[];
      })[];
    })[];
  };
}

export interface ProgressSummary {
  totalItems: number;
  completedItems: number;
  percentageComplete: number;
  estimatedHours: number;
  actualHours: number;
}

export interface TaskFilters {
  status?: string[];
  priority?: string[];
  assignedTo?: number[];
  categoryId?: number[];
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
}

// AI-related types
export interface AIGenerationRequest {
  goalInput: string;
  targetDate?: string;
  userContext?: {
    previousGoals?: string[];
    skillLevel?: 'beginner' | 'intermediate' | 'expert';
    timeAvailable?: string;
  };
}

export interface AIInsights {
  completionPrediction: {
    estimatedDate: string;
    confidence: number;
    blockers: string[];
  };
  recommendations: string[];
  prioritySuggestions: {
    taskId: number;
    reason: string;
  }[];
}

// Notification types
export interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

// Theme and UI state types
export interface AppTheme {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  fontSize: 'sm' | 'base' | 'lg';
}

export interface UIState {
  sidebarOpen: boolean;
  expandedSections: Set<string>;
  selectedFilters: TaskFilters;
  viewMode: 'list' | 'kanban' | 'calendar' | 'timeline';
}

// User preferences and settings
export interface UserPreferences {
  theme: AppTheme;
  notifications: {
    email: boolean;
    push: boolean;
    deadlines: boolean;
    assignments: boolean;
    completions: boolean;
  };
  workingHours: {
    start: string; // HH:mm format
    end: string; // HH:mm format
    timezone: string;
    workDays: number[]; // 0-6, 0 = Sunday
  };
  defaultEstimates: {
    subtaskHours: number;
    taskHours: number;
    projectHours: number;
  };
}

// Real-time collaboration types
export interface CollaborationEvent {
  type: 'user_joined' | 'user_left' | 'task_updated' | 'comment_added';
  userId: number;
  username: string;
  timestamp: Date;
  data?: unknown;
}

export interface LiveCursor {
  userId: number;
  username: string;
  position: { x: number; y: number };
  color: string;
}

// Search and filtering types
export interface SearchResult {
  type: 'goal' | 'project' | 'task' | 'subtask';
  id: number;
  title: string;
  description?: string;
  breadcrumb: string[];
  relevance: number;
}

// Analytics and reporting types
export interface ProductivityMetrics {
  period: 'day' | 'week' | 'month' | 'quarter';
  tasksCompleted: number;
  averageCompletionTime: number;
  estimationAccuracy: number;
  focusTime: number; // minutes
  breakTime: number; // minutes
  mood: 'great' | 'good' | 'okay' | 'struggling';
}

export interface TeamMetrics extends ProductivityMetrics {
  teamId: number;
  memberCount: number;
  collaborationScore: number;
  communicationFrequency: number;
}

// Error handling types
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: Date;
  userId?: number;
  context?: string;
}

// Form validation types
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface FormValidation {
  [fieldName: string]: ValidationRule[];
}

// Export utility type helpers
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequireField<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};