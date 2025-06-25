# Trak - AI-Powered Task Management Application

## Overview

Trak is a modern task management application that leverages AI to automatically break down high-level tasks into actionable subtasks. The application features a clean, responsive interface built with React and TypeScript, powered by an Express.js backend with PostgreSQL database integration.

## System Architecture

The application follows a full-stack architecture with clear separation between frontend, backend, and data layers:

- **Frontend**: React with TypeScript, using Vite for development and building
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for schema management
- **AI Integration**: OpenAI GPT-4o for intelligent task breakdown
- **Optional Cloud Storage**: Firebase Firestore as an alternative storage option
- **Styling**: Tailwind CSS with shadcn/ui component library

## Key Components

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management
- **UI Components**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and dark mode support

### Backend Architecture
- **Server**: Express.js with TypeScript
- **API Structure**: RESTful endpoints for task and subtask management
- **Database Layer**: Drizzle ORM with PostgreSQL adapter
- **Storage Abstraction**: Interface-based storage system supporting both in-memory and database storage

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon database service
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema synchronization
- **Fallback Storage**: In-memory storage implementation for development
- **Optional Integration**: Firebase Firestore for cloud-based storage

### Authentication and Authorization
Currently, the application includes a basic user schema but authentication mechanisms are not fully implemented. The system is designed to support user-based task management once authentication is added.

### External Service Integrations
- **OpenAI API**: GPT-4o model for intelligent task breakdown and subtask generation
- **Firebase Admin SDK**: Optional cloud storage and real-time database features
- **Neon Database**: Serverless PostgreSQL hosting

## Data Flow

1. **Task Creation**: Users input a high-level task description through the form interface
2. **AI Processing**: The backend sends the task description to OpenAI's GPT-4o model for intelligent breakdown
3. **Subtask Generation**: AI returns structured subtasks with priorities, due dates, and time estimates
4. **Data Persistence**: Tasks and subtasks are saved to PostgreSQL via Drizzle ORM
5. **Real-time Updates**: Frontend updates automatically using TanStack Query's caching and invalidation
6. **Progress Tracking**: Users can mark subtasks as complete, updating overall task progress

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection for serverless environments
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management and caching
- **openai**: Official OpenAI API client for GPT-4o integration
- **firebase-admin**: Optional Firebase integration for cloud storage

### UI Dependencies
- **@radix-ui/***: Headless UI components for accessibility
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **react-hook-form**: Form state management with validation

### Development Dependencies
- **vite**: Fast development server and build tool
- **tsx**: TypeScript execution for development
- **esbuild**: Fast bundler for production builds

## Deployment Strategy

The application is configured for deployment on Replit's infrastructure:

- **Development**: Vite dev server with hot module replacement
- **Production Build**: Vite builds the frontend, esbuild bundles the backend
- **Runtime**: Node.js server serving both API and static files
- **Database**: PostgreSQL connection via environment variables
- **Scaling**: Configured for Replit's autoscale deployment target

The build process creates optimized bundles with the frontend served as static files and the backend running as a Node.js server. Environment variables handle database connections and API keys for external services.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- June 25, 2025: Built complete AI-powered task manager
  - Implemented OpenAI GPT-4o integration for task breakdown
  - Created React frontend with task input form and viewing pages
  - Set up Express backend with REST API
  - Added fallback demo system for OpenAI quota limits
  - Configured Firebase integration (optional) with memory storage fallback

## Changelog

- June 25, 2025: MVP completed - AI task breakdown, frontend, backend, storage
- June 24, 2025: Initial setup