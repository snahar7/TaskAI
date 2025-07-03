// App configuration and environment variables
// This file centralizes all configuration values and environment setup

export const appConfig = {
  // API Configuration
  api: {
    baseUrl: process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000',
    timeout: 30000, // 30 seconds
  },
  
  // OpenAI Configuration
  openai: {
    model: 'gpt-4o',
    maxTokens: 2000,
    temperature: 0.7,
  },
  
  // Database Configuration
  database: {
    url: process.env.DATABASE_URL,
    poolSize: 10,
    connectionTimeout: 30000,
  },
  
  // Feature Flags
  features: {
    aiTaskBreakdown: true,
    realTimeUpdates: true,
    progressTracking: true,
    collaborativeEditing: false,
  },
  
  // UI Configuration
  ui: {
    theme: 'light',
    staleTime: 1000 * 60 * 2, // 2 minutes for React Query
    animationDuration: 200,
  },
} as const;

// Environment validation
export function validateEnvironment() {
  const required = ['DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`Missing environment variables: ${missing.join(', ')}`);
  }
  
  return missing.length === 0;
}