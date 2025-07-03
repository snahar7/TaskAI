import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, differenceInDays, addDays } from "date-fns";

/**
 * Utility functions for the Taflo application
 * This file contains reusable helper functions for common operations
 */

// Tailwind CSS class utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting utilities
export const dateUtils = {
  /**
   * Format date for display in UI
   */
  formatDate: (date: string | Date, formatStr: string = "MMM dd, yyyy") => {
    if (!date) return "";
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return format(dateObj, formatStr);
  },

  /**
   * Format date for API/database storage
   */
  formatForStorage: (date: Date) => {
    return format(date, "yyyy-MM-dd");
  },

  /**
   * Calculate days until deadline
   */
  daysUntilDeadline: (deadline: string | Date) => {
    if (!deadline) return null;
    const deadlineDate = typeof deadline === "string" ? parseISO(deadline) : deadline;
    return differenceInDays(deadlineDate, new Date());
  },

  /**
   * Generate due dates distributed between start and end dates
   */
  distributeDates: (count: number, startDate: Date, endDate: Date) => {
    const dates: Date[] = [];
    const totalDays = differenceInDays(endDate, startDate);
    const interval = totalDays / (count + 1);

    for (let i = 1; i <= count; i++) {
      dates.push(addDays(startDate, Math.round(interval * i)));
    }

    return dates;
  },
};

// Progress calculation utilities
export const progressUtils = {
  /**
   * Calculate completion percentage
   */
  calculatePercentage: (completed: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  },

  /**
   * Get progress status color
   */
  getProgressColor: (percentage: number): string => {
    if (percentage < 25) return "bg-red-500";
    if (percentage < 50) return "bg-yellow-500";
    if (percentage < 75) return "bg-blue-500";
    return "bg-green-500";
  },

  /**
   * Format time estimate in human-readable format
   */
  formatTimeEstimate: (hours: number): string => {
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 8) return `${hours} hr${hours === 1 ? '' : 's'}`;
    const days = Math.round(hours / 8);
    return `${days} day${days === 1 ? '' : 's'}`;
  },
};

// Validation utilities
export const validationUtils = {
  /**
   * Check if email is valid
   */
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Check if password meets requirements
   */
  isValidPassword: (password: string): boolean => {
    return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
  },

  /**
   * Sanitize text input
   */
  sanitizeText: (text: string): string => {
    return text.trim().replace(/\s+/g, ' ');
  },

  /**
   * Validate hex color
   */
  isValidHexColor: (color: string): boolean => {
    return /^#[0-9A-F]{6}$/i.test(color);
  },
};

// Priority and status utilities  
export const statusUtils = {
  /**
   * Get priority color class
   */
  getPriorityColor: (priority: string): string => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  },

  /**
   * Get status color class
   */
  getStatusColor: (status: string): string => {
    switch (status.toLowerCase()) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'on_hold': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200';
      case 'not_started': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  },

  /**
   * Get human-readable status text
   */
  formatStatus: (status: string): string => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  },
};

// API error handling utilities
export const errorUtils = {
  /**
   * Extract error message from various error types
   */
  getErrorMessage: (error: unknown): string => {
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }
    return 'An unexpected error occurred';
  },

  /**
   * Check if error is network-related
   */
  isNetworkError: (error: unknown): boolean => {
    const message = errorUtils.getErrorMessage(error).toLowerCase();
    return message.includes('network') || message.includes('fetch') || message.includes('timeout');
  },
};

// Local storage utilities
export const storageUtils = {
  /**
   * Safely get item from localStorage
   */
  getItem: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  /**
   * Safely set item in localStorage
   */
  setItem: (key: string, value: unknown): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },

  /**
   * Remove item from localStorage
   */
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  },
};