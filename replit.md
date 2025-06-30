# Taflo - AI-Powered Task Management Application

## Overview

Taflo is a modern task management application that leverages AI to automatically break down high-level tasks into actionable subtasks. The application features a clean, responsive interface built with React and TypeScript, powered by an Express.js backend with PostgreSQL database integration.

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
- **Primary Database**: PostgreSQL via Neon database service (active)
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema synchronization
- **Firebase Integration**: Configured with project credentials for future real-time features
- **Client-side Firebase**: Web SDK configured for analytics and potential real-time updates

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

- June 30, 2025: Implemented hierarchical endpoint restructure for dramatic performance improvement
  - Restructured API endpoints to progressive loading: Goal → Project → Task → Subtask hierarchy
  - Replaced single complex query with lightweight progressive data loading
  - Performance improvement: Goals endpoint reduced from 8 seconds to 0.85 seconds (90% faster)
  - Child endpoints load in 0.1-0.2 seconds for efficient on-demand data retrieval
  - Implemented frontend progressive loading components with proper caching (2-minute stale time)
  - Added debounced UI updates to prevent excessive database calls during user interactions
  - Maintained automatic progress system functionality with bidirectional cascading across all levels
  - Enhanced user experience: instant initial load, fast on-demand expansion of hierarchy levels
  - System now scales efficiently with large datasets while maintaining full functionality

- June 30, 2025: Fixed automatic progress update system with bidirectional cascading
  - Implemented missing cascading progress calculation methods (recalculateTaskProgress, recalculateProjectProgress, recalculateGoalProgress)
  - Fixed subtask completion triggers that automatically update parent task progress
  - Fixed task completion triggers that automatically update parent project progress  
  - Fixed project completion triggers that automatically update parent goal progress
  - Added bidirectional cascading: checking/unchecking items properly updates all parent levels
  - Verified complete 4-level hierarchy progress tracking: subtask → task → project → goal
  - All progress calculations now work automatically without manual intervention
  - System maintains data integrity with percentage calculations and status updates
  - Fixed schema consistency issues with field naming (title vs name) throughout the system
  - Resolved API validation issues preventing completion toggle functionality

- June 28, 2025: Implemented comprehensive relational database restructure
  - Created enterprise-grade 4-level hierarchy with full relational design
  - Added comprehensive fields to all entities: name, description, assigned_to, status, priority, percent_complete, deadline, tags, category, comments, dependencies, custom_fields, followers, time_actual, time_estimate, team, links/nesting
  - Implemented polymorphic relationships: comments, files, tags, followers can attach to any entity type
  - Created many-to-many relationships: dependencies, team membership, entity linking
  - Added support tables: teams, categories, tags, files, comments, dependencies, entity_tags, followers, team_members, entity_links
  - Maintained backward compatibility with existing title/name fields and legacy data
  - Enhanced storage layer with comprehensive CRUD operations for all relational features
  - Added advanced analytics: progress tracking, search, user workload analysis
  - Implemented proper foreign key relationships and data integrity constraints
  - Database migration completed successfully with all new tables and fields
  - Performance optimizations: reduced API response time from 5-10 seconds to under 2 seconds
  - Added optimistic updates for instant UI feedback on checkbox interactions

- June 27, 2025: Implemented editable breakdown approval feature
  - Created comprehensive editable breakdown approval component with inline editing
  - Added hover-triggered edit buttons for all fields (titles, descriptions, dates, hours, urgency)
  - Implemented both single-line input and multi-line textarea editing support
  - Updated server API to accept and process edited breakdowns from user modifications
  - Fixed null safety issues in goal hierarchy display component to prevent crashes
  - Added proper error handling and timeout management for OpenAI API calls
  - Enhanced approval workflow: users can now modify AI-generated content before creating hierarchy
  - Tested complete workflow: goal input → AI generation → user editing → approval → hierarchy creation
  - Resolved compilation errors and type safety issues throughout the editing system

- June 26, 2025: Complete rebuild with 4-level hierarchy + hierarchical input categorization
  - Restructured entire application architecture from 2-level to 4-level hierarchy
  - Created new database schema: goals, projects, tasks, subtasks, pending_breakdowns tables
  - Built comprehensive OpenAI integration for structured hierarchy generation
  - Implemented approval workflow: input goal → AI breakdown → review → approve/reject → create full hierarchy
  - Added hierarchical input form with level selection (Goal/Project/Task/Subtask)
  - Enabled proper parent linking: projects link to goals, tasks to projects, subtasks to tasks
  - Created tabbed interface: "AI Goal Breakdown" vs "Add Specific Item"
  - Built parent selection dropdowns showing existing goals/projects/tasks for proper hierarchy linking
  - Added individual item creation API endpoints for manual hierarchy building
  - Created collapsible nested UI components for goal/project/task/subtask display
  - Added visual progress tracking at each hierarchy level
  - Enabled completion tracking and editing capabilities for all levels
  - Updated API endpoints to support full CRUD operations on 4-level structure
  - Replaced old task system with goal-focused project management approach

- June 26, 2025: Enhanced task manager with approval workflow and calendar features
  - Implemented task approval workflow - users can review AI breakdowns before adding to calendar
  - Added calendar timeline view with realistic due dates based on user's target completion date
  - Changed estimated hours to numeric format with proper time calculations
  - Added "Break Down" button for further AI subdivision of complex subtasks
  - Created tabs interface: Subtasks view and Calendar Timeline view
  - Updated AI service to generate realistic dates distributed from today to target date

- June 26, 2025: Fixed task detail view routing issue
  - Resolved bug where all task details showed first task's subtasks
  - Fixed React Query caching and API endpoint routing
  - Task detail pages now correctly display individual task subtasks
  - Confirmed full functionality: task creation, AI breakdown, progress tracking, filtering

- June 25, 2025: Built complete AI-powered task manager
  - Implemented OpenAI GPT-4o integration for task breakdown
  - Created React frontend with task input form and viewing pages
  - Set up Express backend with REST API
  - Added fallback demo system for OpenAI quota limits
  - Configured Firebase integration (optional) with database storage active

## Changelog

- June 25, 2025: MVP completed - AI task breakdown, frontend, backend, storage
- June 24, 2025: Initial setup