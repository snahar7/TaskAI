import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export function calculateProgress(subtasks: Array<{ completed: boolean }>): number {
  if (subtasks.length === 0) return 0;
  const completed = subtasks.filter(s => s.completed).length;
  return Math.round((completed / subtasks.length) * 100);
}

export function getPriorityColor(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'high':
      return 'text-red-600 bg-red-100';
    case 'medium':
      return 'text-amber-600 bg-amber-100';
    case 'low':
      return 'text-green-600 bg-green-100';
    default:
      return 'text-slate-600 bg-slate-100';
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

// Timezone-safe date utilities
export function formatDateForInput(date: string | Date | null | undefined): string {
  if (!date) return "";
  
  let dateStr: string;
  if (typeof date === "string") {
    // If it's already a string, extract the date part without timezone conversion
    dateStr = date.includes('T') ? date.split('T')[0] : date;
  } else {
    // If it's a Date object, use local components to avoid timezone shifts
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    dateStr = `${year}-${month}-${day}`;
  }
  
  return dateStr;
}

export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createLocalDateString(dateInput: string): string {
  // For saving dates, preserve the local date without timezone conversion
  return dateInput + 'T00:00:00';
}

export function validateTaskInput(input: string): { isValid: boolean; error?: string } {
  if (!input.trim()) {
    return { isValid: false, error: "Task description is required" };
  }
  
  if (input.length < 10) {
    return { isValid: false, error: "Task description must be at least 10 characters" };
  }
  
  if (input.length > 500) {
    return { isValid: false, error: "Task description must be less than 500 characters" };
  }
  
  return { isValid: true };
}
